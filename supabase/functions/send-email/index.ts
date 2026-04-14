// supabase/functions/send-email/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { WebhookPayload, EnrollmentLeadNotificationRecord, MessageRecord, EnrollmentLead } from './types.ts'
import { enrollmentNotificationHtml, messagingNotificationHtml } from './templates.ts'

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

  if (error || !lead) throw new Error(`Enrollment lead not found: ${record.lead_id} — supabase error: ${JSON.stringify(error)}`)

  const adminUrl = `${Deno.env.get('APP_URL') ?? 'https://lbmaa.com'}/admin`

  await sendEmail(
    record.recipient_email,
    `New enrollment inquiry — ${lead.parent_name}`,
    enrollmentNotificationHtml(lead, adminUrl)
  )

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
  const portalUrl = `${Deno.env.get('APP_URL') ?? 'https://lbmaa.com'}/dashboard`

  await sendEmail(
    user.email,
    `New message from ${senderName} — LBMAA Portal`,
    messagingNotificationHtml(senderName, portalUrl)
  )
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
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
    }
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[send-email]', err)
    return new Response('Internal error', { status: 500 })
  }
})
