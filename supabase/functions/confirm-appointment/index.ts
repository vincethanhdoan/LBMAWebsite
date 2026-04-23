// supabase/functions/confirm-appointment/index.ts
// Public endpoint — auth is the booking_token on enrollment_lead_program_bookings.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
): Promise<void> {
  const { data: bookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('status')
    .eq('lead_id', leadId)

  if (!bookings || bookings.length === 0) return

  const statuses = bookings.map((b: { status: string }) => b.status)
  const hasScheduledOrConfirmed = statuses.some((s: string) => s === 'scheduled' || s === 'confirmed')
  const allConfirmed = statuses.every((s: string) => s === 'confirmed')

  const leadStatus = allConfirmed
    ? 'appointment_confirmed'
    : hasScheduledOrConfirmed
    ? 'appointment_scheduled'
    : 'approved'

  await supabase
    .from('enrollment_leads')
    .update({ status: leadStatus })
    .eq('lead_id', leadId)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { token } = await req.json()
  if (!token) return new Response('Missing token', { status: 400 })

  const supabase = adminClient()

  // Resolve token to program booking
  const { data: programBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, lead_id, status, appointment_date, appointment_time')
    .eq('booking_token', token)
    .single()

  if (!programBooking) return new Response('Invalid token', { status: 404 })

  if (programBooking.status === 'confirmed') {
    return new Response(
      JSON.stringify({
        ok: true,
        already_confirmed: true,
        appointment_date: programBooking.appointment_date,
        appointment_time: programBooking.appointment_time,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (programBooking.status !== 'scheduled') {
    return new Response('Cannot confirm from current status', { status: 422 })
  }

  const { error } = await supabase
    .from('enrollment_lead_program_bookings')
    .update({ status: 'confirmed' })
    .eq('booking_id', programBooking.booking_id)

  if (error) return new Response('Confirmation failed', { status: 500 })

  await recalculateLeadStatus(supabase, programBooking.lead_id)

  return new Response(
    JSON.stringify({
      ok: true,
      already_confirmed: false,
      appointment_date: programBooking.appointment_date,
      appointment_time: programBooking.appointment_time,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
