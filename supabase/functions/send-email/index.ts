// supabase/functions/send-email/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { WebhookPayload, EnrollmentLeadNotificationRecord, MessageRecord, EnrollmentLead, PortalEmailQueueRecord, AppointmentInfo, ChildRecord } from './types.ts'
import { enrollmentNotificationHtml, messagingNotificationHtml, approvalEmailHtml, multiProgramApprovalEmailHtml, denialEmailHtml, bookingConfirmationHtml, reminderEmailHtml, submissionConfirmationHtml, announcementNotificationHtml, blogPostNotificationHtml, commentReplyHtml, postCommentHtml, PROGRAM_LABELS } from './templates.ts'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM = 'Los Banos Martial Arts Academy <no-reply@notifications.lbmartialarts.com>'
const LOGO_URL = 'https://qfyeguikxxwwxpxleqrr.supabase.co/storage/v1/object/public/assets/logo-96.png'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

function getAppUrl(): string {
  const url = Deno.env.get('APP_URL')
  if (!url) throw new Error('APP_URL environment variable is not set')
  return url.replace(/\/+$/, '')
}

// How far off the appointment is, phrased for the reminder subject/heading.
// Measured in Pacific calendar days so it matches when the reminder cron fires
// (6pm Pacific) and reads correctly for manual sends any number of days out.
function daysUntilPhrase(appointmentDate: string): string {
  const pacificToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const days = Math.round(
    (Date.parse(appointmentDate + 'T00:00:00Z') - Date.parse(pacificToday + 'T00:00:00Z')) / 86_400_000
  )
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

async function getLeadAppointments(
  supabase: ReturnType<typeof adminClient>,
  leadId: string,
  appUrl: string
): Promise<AppointmentInfo[]> {
  const { data: bookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('program_type, booking_token, appointment_date, appointment_time')
    .eq('lead_id', leadId)
    .not('appointment_date', 'is', null)
    .order('appointment_date', { ascending: true })

  if (!bookings || bookings.length === 0) return []

  return Promise.all(
    bookings.map(async (b: {
      program_type: string
      booking_token: string | null
      appointment_date: string
      appointment_time: string
    }) => {
      const { data: children } = await supabase
        .from('enrollment_lead_children')
        .select('name')
        .eq('lead_id', leadId)
        .eq('program_type', b.program_type)

      const childNames = children?.map((c: { name: string }) => c.name).join(' & ') ?? ''
      const date = new Date(b.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
      const time = new Date('1970-01-01T' + b.appointment_time).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      })

      return {
        programLabel: PROGRAM_LABELS[b.program_type] ?? b.program_type,
        childNames,
        date,
        appointmentDate: b.appointment_date,
        time,
        rebookingUrl: b.booking_token ? `${appUrl}/book/${b.booking_token}` : appUrl,
        bookingToken: b.booking_token,
      }
    })
  )
}

async function markEnrollmentFailed(
  supabase: ReturnType<typeof adminClient>,
  notificationId: string,
  message: string
): Promise<void> {
  await supabase
    .from('enrollment_lead_notifications')
    .update({ status: 'failed', error_message: message.slice(0, 500) })
    .eq('notification_id', notificationId)
}

async function handleEnrollmentNotification(recordId: string): Promise<void> {
  const supabase = adminClient()

  // Re-read the authoritative row from the DB. The webhook body is untrusted —
  // this endpoint is reachable with the public anon key — so we never send based
  // on request-supplied content. Only 'queued' rows are sent, which also makes
  // delivery idempotent against duplicate or replayed webhook deliveries.
  const { data: record } = await supabase
    .from('enrollment_lead_notifications')
    .select('notification_id, lead_id, recipient_email, type, status')
    .eq('notification_id', recordId)
    .single<EnrollmentLeadNotificationRecord>()

  if (!record) {
    console.warn('[send-email] enrollment notification not found:', recordId)
    return
  }
  if (record.status !== 'queued') return

  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('lead_id', record.lead_id)
    .single<EnrollmentLead>()

  if (error || !lead) throw new Error(`Enrollment lead not found: ${record.lead_id}`)

  const appUrl = getAppUrl()
  const adminUrl = `${appUrl}/admin`
  const bookingUrl = lead.booking_token ? `${appUrl}/book/${lead.booking_token}` : appUrl
  const _confirmUrl = lead.booking_token ? `${appUrl}/confirm/${lead.booking_token}` : appUrl

  const { data: childRows } = await supabase
    .from('enrollment_lead_children')
    .select('name, age, program_type')
    .eq('lead_id', record.lead_id)
    .order('created_at', { ascending: true })
  const enrichedLead: EnrollmentLead = { ...lead, children: (childRows ?? []) as ChildRecord[] }

  let subject: string
  let html: string

  switch (record.type) {
    case 'new_lead': {
      // Fan out to all active admin notification recipients
      const { data: admins } = await supabase
        .from('admin_notification_settings')
        .select('email')
        .eq('notify_new_leads', true)
        .eq('is_active', true)
      const recipients = admins && admins.length > 0
        ? admins.map((a: { email: string }) => a.email)
        : [record.recipient_email]
      subject = `New enrollment inquiry — ${lead.parent_name}`
      html = enrollmentNotificationHtml(enrichedLead, adminUrl, LOGO_URL)
      const results = await Promise.allSettled(recipients.map((to: string) => sendEmail(to, subject, html)))
      const failures = results
        .map((r, i) => (r.status === 'rejected'
          ? `${recipients[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
          : null))
        .filter((m): m is string => m !== null)
      if (failures.length > 0) {
        await markEnrollmentFailed(supabase, record.notification_id, `Failed recipients — ${failures.join('; ')}`)
        throw new Error(`new_lead fan-out failed for ${failures.length} of ${recipients.length} recipients`)
      }
      await supabase
        .from('enrollment_lead_notifications')
        .update({ status: 'sent' })
        .eq('notification_id', record.notification_id)
      return
    }
    case 'submission':
      subject = 'Thank you for your interest in LBMAA'
      html = submissionConfirmationHtml(enrichedLead, LOGO_URL)
      break
    case 'approval': {
      const { data: programBookings } = await supabase
        .from('enrollment_lead_program_bookings')
        .select('booking_id, program_type, booking_token')
        .eq('lead_id', record.lead_id)

      subject = 'Your enrollment request — book your appointment'

      if (programBookings && programBookings.length > 0) {
        const programs = await Promise.all(
          programBookings.map(async (b: { booking_id: string; program_type: string; booking_token: string | null }) => {
            const { data: children } = await supabase
              .from('enrollment_lead_children')
              .select('name')
              .eq('lead_id', record.lead_id)
              .eq('program_type', b.program_type)
            const childNames = children?.map((c: { name: string }) => c.name).join(' & ') ?? ''
            return {
              programLabel: PROGRAM_LABELS[b.program_type] ?? b.program_type,
              childNames,
              bookingUrl: b.booking_token ? `${appUrl}/book/${b.booking_token}` : appUrl,
            }
          })
        )
        html = multiProgramApprovalEmailHtml(lead.parent_name, programs, LOGO_URL)
      } else {
        html = approvalEmailHtml(lead, bookingUrl, LOGO_URL)
      }
      break
    }
    case 'denial':
      subject = 'Your enrollment inquiry at LBMAA'
      html = denialEmailHtml(lead, LOGO_URL)
      break
    case 'booking_confirmation': {
      const appointments = await getLeadAppointments(supabase, record.lead_id, appUrl)
      if (appointments.length === 0) {
        console.warn('[send-email] booking_confirmation: no booked appointments for lead', record.lead_id)
        return
      }
      subject = appointments.length > 1 ? 'Appointments confirmed — LBMAA' : 'Appointment confirmed — LBMAA'
      html = bookingConfirmationHtml(lead.parent_name, appointments, LOGO_URL)
      break
    }
    case 'reminder': {
      const appointments = await getLeadAppointments(supabase, record.lead_id, appUrl)
      if (appointments.length === 0) {
        console.warn('[send-email] reminder: no booked appointments for lead', record.lead_id)
        return
      }
      const firstToken = appointments[0]?.bookingToken ?? lead.booking_token
      const reminderConfirmUrl = firstToken ? `${appUrl}/confirm/${firstToken}` : appUrl
      const whenPhrase = daysUntilPhrase(appointments[0].appointmentDate)
      subject = appointments.length > 1
        ? `Reminder: your LBMAA appointments are ${whenPhrase}`
        : `Reminder: your LBMAA appointment is ${whenPhrase}`
      html = reminderEmailHtml(lead.parent_name, appointments, reminderConfirmUrl, whenPhrase, LOGO_URL)
      break
    }
    default:
      console.warn('[send-email] Unknown notification type:', record.type)
      return
  }

  try {
    await sendEmail(record.recipient_email, subject, html)
  } catch (err) {
    await markEnrollmentFailed(supabase, record.notification_id, err instanceof Error ? err.message : String(err))
    throw err
  }

  await supabase
    .from('enrollment_lead_notifications')
    .update({ status: 'sent' })
    .eq('notification_id', record.notification_id)
}

async function handleMessageNotification(recordId: string): Promise<void> {
  const supabase = adminClient()

  // Re-read the authoritative message row; the webhook body is untrusted.
  const { data: record } = await supabase
    .from('messages')
    .select('message_id, conversation_id, author_user_id, created_at')
    .eq('message_id', recordId)
    .single<MessageRecord>()

  if (!record) {
    console.warn('[send-email] message not found:', recordId)
    return
  }

  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id, last_read_at')
    .eq('conversation_id', record.conversation_id)
    .neq('user_id', record.author_user_id)

  if (!members || members.length === 0) return

  const recipient = members[0]

  if (recipient.last_read_at && recipient.last_read_at >= record.created_at) return

  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(recipient.user_id)
  if (userError || !user?.email) return

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', record.author_user_id)
    .single()

  const senderName = senderProfile?.display_name ?? 'Someone'
  const appUrl = getAppUrl()
  const portalUrl = `${appUrl}/dashboard?tab=messages`

  // Check if the recipient has opted out of message emails
  const { data: prefRow } = await supabase
    .from('user_notification_preferences')
    .select('notify_messages')
    .eq('user_id', recipient.user_id)
    .maybeSingle()

  const prefRowAdmin = prefRow === null
    ? await supabase
        .from('admin_notification_preferences')
        .select('notify_messages')
        .eq('user_id', recipient.user_id)
        .maybeSingle()
    : null

  const notifyMessages =
    prefRow?.notify_messages ??
    prefRowAdmin?.data?.notify_messages ??
    true  // default: send if no prefs row exists

  if (!notifyMessages) return

  await sendEmail(
    user.email,
    `New message from ${senderName} — LBMAA Portal`,
    messagingNotificationHtml(senderName, portalUrl, LOGO_URL)
  )
}

async function handlePortalNotification(recordId: string): Promise<void> {
  const supabase = adminClient()

  // Re-read the authoritative row; the webhook body is untrusted. Only 'queued'
  // rows are sent, keeping delivery idempotent against replayed webhooks.
  const { data: record } = await supabase
    .from('portal_email_queue')
    .select('queue_id, recipient_email, type, payload, status')
    .eq('queue_id', recordId)
    .single<PortalEmailQueueRecord>()

  if (!record) {
    console.warn('[send-email] portal notification not found:', recordId)
    return
  }
  if (record.status !== 'queued') return

  const appUrl = getAppUrl()
  const tab = record.payload.tab ?? 'announcements'
  const tabUrl = `${appUrl}/dashboard?tab=${tab}`

  let subject: string
  let html: string

  switch (record.type) {
    case 'announcement':
      subject = 'New announcement — LBMAA'
      html = announcementNotificationHtml(
        record.payload.title ?? '',
        record.payload.body ?? '',
        tabUrl,
        LOGO_URL
      )
      break
    case 'blog_post':
      subject = `New post from ${record.payload.author_name ?? 'a member'} — LBMAA`
      html = blogPostNotificationHtml(
        record.payload.title ?? '',
        record.payload.author_name ?? 'A member',
        tabUrl,
        LOGO_URL
      )
      break
    case 'comment_reply':
      subject = `${record.payload.replier_name ?? 'Someone'} replied to your comment — LBMAA`
      html = commentReplyHtml(
        record.payload.replier_name ?? 'Someone',
        record.payload.original_snippet ?? '',
        tabUrl,
        LOGO_URL
      )
      break
    case 'post_comment':
      subject = 'New comment on your post — LBMAA'
      html = postCommentHtml(
        record.payload.commenter_name ?? 'Someone',
        record.payload.post_title ?? 'your post',
        tabUrl,
        LOGO_URL
      )
      break
    default:
      console.warn('[send-email] Unknown portal notification type:', record.type)
      return
  }

  try {
    await sendEmail(record.recipient_email, subject, html)
  } catch (err) {
    await supabase
      .from('portal_email_queue')
      .update({ status: 'failed', error_message: (err instanceof Error ? err.message : String(err)).slice(0, 500) })
      .eq('queue_id', record.queue_id)
    throw err
  }

  await supabase
    .from('portal_email_queue')
    .update({ status: 'sent' })
    .eq('queue_id', record.queue_id)
}

function isAuthorized(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRoleKey && token === serviceRoleKey) return true

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret && token === webhookSecret) return true

  // Accept any JWT issued by this Supabase project — avoids brittle env-var string comparison
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.iss === 'supabase' && payload.ref === 'qfyeguikxxwwxpxleqrr'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!isAuthorized(authHeader)) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (payload.type !== 'INSERT') {
    return new Response('OK', { status: 200 })
  }

  // Take only the primary-key id from the (untrusted) webhook body; every handler
  // re-reads the real row from the DB and sends based on that, never on this body.
  const pkColumn = payload.table === 'messages'
    ? 'message_id'
    : payload.table === 'portal_email_queue'
    ? 'queue_id'
    : 'notification_id'
  const recordId = (payload.record as Record<string, unknown>)?.[pkColumn]
  if (typeof recordId !== 'string') {
    return new Response('OK', { status: 200 })
  }

  try {
    if (payload.table === 'enrollment_lead_notifications') {
      await handleEnrollmentNotification(recordId)
    } else if (payload.table === 'messages') {
      await handleMessageNotification(recordId)
    } else if (payload.table === 'portal_email_queue') {
      await handlePortalNotification(recordId)
    }
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[send-email]', err)
    return new Response('Internal error', { status: 500 })
  }
})
