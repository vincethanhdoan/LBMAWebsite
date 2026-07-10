// supabase/functions/admin-book-appointment/index.ts

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors })

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  )
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: cors })

  const supabase = adminClient()

  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id })
  if (!isAdmin) return new Response('Forbidden', { status: 403, headers: cors })

  const { programBookingId, slotId, appointmentDate } = await req.json()
  if (!programBookingId || !slotId || !appointmentDate) {
    return new Response('Missing programBookingId, slotId, or appointmentDate', { status: 400, headers: cors })
  }

  // Resolve program booking
  const { data: programBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, lead_id, program_type, status')
    .eq('booking_id', programBookingId)
    .single()

  if (!programBooking) return new Response('Program booking not found', { status: 404, headers: cors })

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, parent_email')
    .eq('lead_id', programBooking.lead_id)
    .single()

  if (!lead) return new Response('Lead not found', { status: 404, headers: cors })

  const { data: slot } = await supabase
    .from('appointment_slots')
    .select('slot_id, start_time, day_of_week, is_active')
    .eq('slot_id', slotId)
    .eq('is_active', true)
    .single()

  if (!slot) return new Response('Slot not found or inactive', { status: 404, headers: cors })

  const targetDate = new Date(appointmentDate + 'T12:00:00')
  if (targetDate.getDay() !== slot.day_of_week) {
    return new Response('Appointment date does not match slot day', { status: 422, headers: cors })
  }

  const { data: block, error: blockError } = await supabase
    .from('blocked_dates')
    .select('block_id')
    .lte('start_date', appointmentDate)
    .gte('end_date', appointmentDate)
    .limit(1)
    .maybeSingle()

  if (blockError) return new Response('Unable to verify availability', { status: 500, headers: cors })
  if (block) return new Response('This date is blocked', { status: 422, headers: cors })

  const { data: conflict } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id')
    .eq('appointment_slot_id', slotId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['scheduled', 'confirmed'])
    .neq('lead_id', programBooking.lead_id)
    .limit(1)
    .maybeSingle()

  if (conflict) {
    return new Response(JSON.stringify({ code: 'slot_taken' }), {
      status: 409,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const todayPacific = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  const today = new Date(todayPacific + 'T12:00:00')
  const daysUntilAppt = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilAppt < 0) {
    return new Response('Appointment date is in the past', { status: 422, headers: cors })
  }
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

  if (updateError) {
    if (updateError.code === '23P01' || updateError.message?.includes('slot_taken')) {
      return new Response(JSON.stringify({ code: 'slot_taken' }), {
        status: 409,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    return new Response('Booking failed', { status: 500, headers: cors })
  }

  const allBooked = await recalculateLeadStatus(supabase, lead.lead_id)

  if (allBooked) {
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
      return new Response('Booking saved but notification failed', { status: 500, headers: cors })
    }
  }

  return new Response(
    JSON.stringify({ ok: true, status: newProgramStatus, appointment_date: appointmentDate, appointment_time: slot.start_time }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
  )
})
