// supabase/functions/admin-book-appointment/index.ts

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

  const { programBookingId, slotId, appointmentDate } = await req.json()
  if (!programBookingId || !slotId || !appointmentDate) {
    return new Response('Missing programBookingId, slotId, or appointmentDate', { status: 400, headers: CORS_HEADERS })
  }

  // Resolve program booking
  const { data: programBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, lead_id, program_type, status')
    .eq('booking_id', programBookingId)
    .single()

  if (!programBooking) return new Response('Program booking not found', { status: 404, headers: CORS_HEADERS })

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, parent_email')
    .eq('lead_id', programBooking.lead_id)
    .single()

  if (!lead) return new Response('Lead not found', { status: 404, headers: CORS_HEADERS })

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

  if (override) return new Response('This date is blocked', { status: 422, headers: CORS_HEADERS })

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
    console.error('[admin-book-appointment] notification insert error:', notifError)
    return new Response('Booking saved but notification failed', { status: 500, headers: CORS_HEADERS })
  }

  return new Response(
    JSON.stringify({ ok: true, status: newProgramStatus, appointment_date: appointmentDate, appointment_time: slot.start_time }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
})
