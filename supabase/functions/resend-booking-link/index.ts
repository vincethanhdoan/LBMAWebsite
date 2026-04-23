// supabase/functions/resend-booking-link/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

const RESENDABLE_STATUSES = ['approved', 'appointment_scheduled', 'appointment_confirmed']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  )
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })

  const supabase = adminClient()

  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id })
  if (!isAdmin) return new Response('Forbidden', { status: 403, headers: CORS_HEADERS })

  const { leadId } = await req.json()
  if (!leadId) return new Response('Missing leadId', { status: 400, headers: CORS_HEADERS })

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, status, booking_token, parent_email')
    .eq('lead_id', leadId)
    .single()

  if (!lead) return new Response('Lead not found', { status: 404, headers: CORS_HEADERS })
  if (!RESENDABLE_STATUSES.includes(lead.status)) {
    return new Response('Lead is not in a resendable state', { status: 422, headers: CORS_HEADERS })
  }

  // Check for program bookings (new flow)
  const { data: programBookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, booking_token')
    .eq('lead_id', leadId)
    .not('booking_token', 'is', null)

  const hasNewFlow = programBookings && programBookings.length > 0

  // Legacy: require enrollment_leads.booking_token
  if (!hasNewFlow && !lead.booking_token) {
    return new Response('Lead has no booking token', { status: 422, headers: CORS_HEADERS })
  }

  // Insert approval notification — send-email handler uses multiProgramApprovalEmailHtml for
  // new-flow leads and approvalEmailHtml for legacy leads automatically
  const { error: notifError } = await supabase
    .from('enrollment_lead_notifications')
    .insert({
      lead_id: leadId,
      recipient_email: lead.parent_email,
      channel: 'email',
      type: 'approval',
      status: 'queued',
    })

  if (notifError) return new Response('Notification failed', { status: 500, headers: CORS_HEADERS })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
