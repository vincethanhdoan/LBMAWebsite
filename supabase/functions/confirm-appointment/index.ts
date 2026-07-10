import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://lbmartialarts.com',
  'https://www.lbmartialarts.com',
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.lbmartialarts.com'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

async function recalculateLeadStatus(
  supabase: ReturnType<typeof adminClient>,
  leadId: string
): Promise<boolean> {
  const { data: bookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('status')
    .eq('lead_id', leadId)

  if (!bookings || bookings.length === 0) return false

  const statuses = bookings.map((b: { status: string }) => b.status)
  const allScheduledOrConfirmed = statuses.every((s: string) => s === 'scheduled' || s === 'confirmed')
  const allConfirmed = statuses.every((s: string) => s === 'confirmed')

  const leadStatus = allConfirmed
    ? 'appointment_confirmed'
    : allScheduledOrConfirmed
    ? 'appointment_scheduled'
    : 'approved'

  await supabase
    .from('enrollment_leads')
    .update({ status: leadStatus })
    .eq('lead_id', leadId)

  return allScheduledOrConfirmed
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { token } = await req.json()
  if (!token) return new Response('Missing token', { status: 400 })

  const supabase = adminClient()

  const { data: programBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, lead_id, status, appointment_date, appointment_time')
    .eq('booking_token', token)
    .single()

  if (!programBooking) return new Response('Invalid token', { status: 404, headers: cors })

  if (programBooking.status === 'confirmed') {
    return new Response(
      JSON.stringify({
        ok: true,
        already_confirmed: true,
        appointment_date: programBooking.appointment_date,
        appointment_time: programBooking.appointment_time,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  if (programBooking.status !== 'scheduled') {
    return new Response('Cannot confirm from current status', { status: 422, headers: cors })
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  if (programBooking.appointment_date && programBooking.appointment_date < today) {
    return new Response(
      JSON.stringify({
        ok: true,
        past: true,
        already_confirmed: false,
        appointment_date: programBooking.appointment_date,
        appointment_time: programBooking.appointment_time,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('enrollment_lead_program_bookings')
    .update({ status: 'confirmed' })
    .eq('booking_id', programBooking.booking_id)

  if (error) return new Response('Confirmation failed', { status: 500, headers: cors })

  await recalculateLeadStatus(supabase, programBooking.lead_id)

  return new Response(
    JSON.stringify({
      ok: true,
      already_confirmed: false,
      appointment_date: programBooking.appointment_date,
      appointment_time: programBooking.appointment_time,
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
  )
})
