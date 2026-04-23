// supabase/functions/book-appointment/index.ts
// Public endpoint — auth is the booking_token on enrollment_lead_program_bookings.

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

const BOOKABLE_STATUSES = ['link_sent', 'scheduled', 'confirmed']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { token, slotId, appointmentDate } = await req.json()
  if (!token || !slotId || !appointmentDate) {
    return new Response('Missing token, slotId, or appointmentDate', { status: 400, headers: CORS_HEADERS })
  }

  const supabase = adminClient()

  // Resolve token to program booking
  const { data: programBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, lead_id, program_type, status')
    .eq('booking_token', token)
    .single()

  if (!programBooking) return new Response('Invalid booking token', { status: 404, headers: CORS_HEADERS })
  if (!BOOKABLE_STATUSES.includes(programBooking.status)) {
    return new Response('This booking link is no longer valid', { status: 422, headers: CORS_HEADERS })
  }

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, parent_email, parent_name')
    .eq('lead_id', programBooking.lead_id)
    .single()

  if (!lead) return new Response('Lead not found', { status: 404, headers: CORS_HEADERS })

  // Validate slot
  const { data: slot } = await supabase
    .from('appointment_slots')
    .select('slot_id, start_time, day_of_week, is_active')
    .eq('slot_id', slotId)
    .eq('is_active', true)
    .single()

  if (!slot) return new Response('Slot not found or inactive', { status: 404, headers: CORS_HEADERS })

  const targetDate = new Date(appointmentDate + 'T12:00:00')
  if (targetDate.getDay() !== slot.day_of_week) {
    return new Response('Appointment date does not match slot day', { status: 422, headers: CORS_HEADERS })
  }

  const { data: override } = await supabase
    .from('appointment_slot_overrides')
    .select('override_id')
    .eq('slot_id', slotId)
    .eq('override_date', appointmentDate)
    .maybeSingle()

  if (override) return new Response('This date is not available', { status: 422, headers: CORS_HEADERS })

  // Auto-confirm if appointment is within 2 days
  const nowUtc = new Date()
  const todayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()))
  const daysUntilAppt = Math.floor((targetDate.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24))
  const newProgramStatus = daysUntilAppt < 2 ? 'confirmed' : 'scheduled'

  const { error: updateError } = await supabase
    .from('enrollment_lead_program_bookings')
    .update({
      appointment_slot_id: slotId,
      appointment_date: appointmentDate,
      appointment_time: slot.start_time,
      status: newProgramStatus,
    })
    .eq('booking_id', programBooking.booking_id)

  if (updateError) return new Response('Booking failed', { status: 500, headers: CORS_HEADERS })

  await recalculateLeadStatus(supabase, lead.lead_id)

  const { error: notifError } = await supabase
    .from('enrollment_lead_notifications')
    .insert({
      lead_id: lead.lead_id,
      recipient_email: lead.parent_email,
      channel: 'email',
      type: 'booking_confirmation',
      status: 'queued',
    })

  if (notifError) {
    console.error('[book-appointment] notification insert error:', notifError)
    return new Response('Booking saved but notification failed', { status: 500, headers: CORS_HEADERS })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      status: newProgramStatus,
      appointment_date: appointmentDate,
      appointment_time: slot.start_time,
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
})
