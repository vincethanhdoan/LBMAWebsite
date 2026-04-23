// supabase/functions/send-email/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { WebhookPayload, EnrollmentLeadNotificationRecord, MessageRecord, EnrollmentLead, PortalEmailQueueRecord } from './types.ts'
import { enrollmentNotificationHtml, messagingNotificationHtml, approvalEmailHtml, multiProgramApprovalEmailHtml, denialEmailHtml, bookingConfirmationHtml, reminderEmailHtml, submissionConfirmationHtml, announcementNotificationHtml, blogPostNotificationHtml, commentReplyHtml, postCommentHtml } from './templates.ts'

const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
}

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM = 'Los Banos Martial Arts Academy <no-reply@notifications.lbmartialarts.com>'

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

async function handleEnrollmentNotification(record: EnrollmentLeadNotificationRecord): Promise<void> {
  const supabase = adminClient()

  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('lead_id', record.lead_id)
    .single<EnrollmentLead>()

  if (error || !lead) throw new Error(`Enrollment lead not found: ${record.lead_id}`)

  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
  const adminUrl = `${appUrl}/admin`
  const bookingUrl = lead.booking_token ? `${appUrl}/book/${lead.booking_token}` : appUrl
  const confirmUrl = lead.booking_token ? `${appUrl}/confirm/${lead.booking_token}` : appUrl

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
      html = enrollmentNotificationHtml(lead, adminUrl)
      await Promise.all(recipients.map((to: string) => sendEmail(to, subject, html)))
      await supabase
        .from('enrollment_lead_notifications')
        .update({ status: 'sent' })
        .eq('notification_id', record.notification_id)
      return
    }
    case 'submission':
      subject = 'Thank you for your interest in LBMAA'
      html = submissionConfirmationHtml(lead)
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
        html = multiProgramApprovalEmailHtml(lead.parent_name, programs)
      } else {
        html = approvalEmailHtml(lead, bookingUrl)
      }
      break
    }
    case 'denial':
      subject = 'Your enrollment inquiry at LBMAA'
      html = denialEmailHtml(lead)
      break
    case 'booking_confirmation':
      subject = `Appointment confirmed — LBMAA`
      html = bookingConfirmationHtml(lead, bookingUrl)
      break
    case 'reminder':
      subject = `Reminder: your LBMAA appointment in 2 days`
      html = reminderEmailHtml(lead, confirmUrl, bookingUrl)
      break
    default:
      console.warn('[send-email] Unknown notification type:', record.type)
      return
  }

  await sendEmail(record.recipient_email, subject, html)

  await supabase
    .from('enrollment_lead_notifications')
    .update({ status: 'sent' })
    .eq('notification_id', record.notification_id)
}

async function handleMessageNotification(record: MessageRecord): Promise<void> {
  const supabase = adminClient()

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
  const portalUrl = `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/dashboard?tab=messages`

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
    messagingNotificationHtml(senderName, portalUrl)
  )
}

async function handlePortalNotification(record: PortalEmailQueueRecord): Promise<void> {
  const supabase = adminClient()
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
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
        tabUrl
      )
      break
    case 'blog_post':
      subject = `New post from ${record.payload.author_name ?? 'a member'} — LBMAA`
      html = blogPostNotificationHtml(
        record.payload.title ?? '',
        record.payload.author_name ?? 'A member',
        tabUrl
      )
      break
    case 'comment_reply':
      subject = `${record.payload.replier_name ?? 'Someone'} replied to your comment — LBMAA`
      html = commentReplyHtml(
        record.payload.replier_name ?? 'Someone',
        record.payload.original_snippet ?? '',
        tabUrl
      )
      break
    case 'post_comment':
      subject = 'New comment on your post — LBMAA'
      html = postCommentHtml(
        record.payload.commenter_name ?? 'Someone',
        record.payload.post_title ?? 'your post',
        tabUrl
      )
      break
    default:
      console.warn('[send-email] Unknown portal notification type:', record.type)
      return
  }

  await sendEmail(record.recipient_email, subject, html)

  await supabase
    .from('portal_email_queue')
    .update({ status: 'sent' })
    .eq('queue_id', record.queue_id)
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // Accept service role key (Supabase DB webhook default) or explicit WEBHOOK_SECRET if set
  const isAuthorized =
    authHeader === `Bearer ${serviceRoleKey}` ||
    (webhookSecret ? authHeader === `Bearer ${webhookSecret}` : true)
  if (!isAuthorized) {
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

  try {
    if (payload.table === 'enrollment_lead_notifications') {
      await handleEnrollmentNotification(payload.record as EnrollmentLeadNotificationRecord)
    } else if (payload.table === 'messages') {
      await handleMessageNotification(payload.record as MessageRecord)
    } else if (payload.table === 'portal_email_queue') {
      await handlePortalNotification(payload.record as PortalEmailQueueRecord)
    }
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[send-email]', err)
    return new Response('Internal error', { status: 500 })
  }
})
