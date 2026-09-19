// supabase/functions/book-appointment/index.ts
// Public endpoint; auth is the booking_token on enrollment_lead_program_bookings.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { recalculateLeadStatus } from '../_shared/leadStatus.ts';
import { queueFamilyNotification } from '../_shared/familyNotifications.ts';
import {
  FAMILY_HORIZON_DAYS,
  bookProgramAppointment,
  bookingErrorResponse,
} from '../_shared/booking.ts';

const ALLOWED_ORIGINS = new Set([
  'https://lbmartialarts.com',
  'https://www.lbmartialarts.com',
  ...(Deno.env.get('EXTRA_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'https://www.lbmartialarts.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

const BOOKABLE_STATUSES = ['link_sent', 'scheduled', 'confirmed', 'cancelled'];

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  const { token, slotId, appointmentDate, action } = await req.json();
  if (!token) {
    return new Response('Missing token', {
      status: 400,
      headers: cors,
    });
  }

  const supabase = adminClient();

  // Resolve token to program booking
  const { data: programBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, lead_id, program_type, status')
    .eq('booking_token', token)
    .single();

  if (!programBooking)
    return new Response('Invalid booking token', {
      status: 404,
      headers: cors,
    });

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, status')
    .eq('lead_id', programBooking.lead_id)
    .single();

  if (!lead)
    return new Response('Lead not found', { status: 404, headers: cors });

  // A denied or closed lead's links are dead, even though its cancelled
  // bookings would otherwise be rebookable.
  if (lead.status === 'denied' || lead.status === 'closed') {
    return new Response('This booking link is no longer valid', {
      status: 422,
      headers: cors,
    });
  }

  // Cancel path: the family drops a scheduled/confirmed visit. Date and slot
  // stay on the row for history; only scheduled/confirmed rows hold a slot, so
  // cancelling frees it for others to book.
  if (action === 'cancel') {
    if (!['scheduled', 'confirmed'].includes(programBooking.status)) {
      return new Response('This appointment can no longer be cancelled', {
        status: 422,
        headers: cors,
      });
    }
    const { error: cancelError } = await supabase
      .from('enrollment_lead_program_bookings')
      .update({ status: 'cancelled', updated_by: null })
      .eq('booking_id', programBooking.booking_id);
    if (cancelError)
      return new Response('Cancellation failed', {
        status: 500,
        headers: cors,
      });
    await recalculateLeadStatus(supabase, programBooking.lead_id);
    return new Response(JSON.stringify({ ok: true, status: 'cancelled' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!slotId || !appointmentDate) {
    return new Response('Missing slotId or appointmentDate', {
      status: 400,
      headers: cors,
    });
  }
  if (!BOOKABLE_STATUSES.includes(programBooking.status)) {
    return new Response('This booking link is no longer valid', {
      status: 422,
      headers: cors,
    });
  }

  let booked;
  try {
    booked = await bookProgramAppointment(supabase, {
      bookingId: programBooking.booking_id,
      slotId,
      appointmentDate,
      allowToday: false,
      horizonDays: FAMILY_HORIZON_DAYS,
      actor: null,
    });
  } catch (bookingError) {
    return bookingErrorResponse(bookingError, cors);
  }

  // Confirm what was just booked, even if other programs are still pending.
  // The email renders every currently booked appointment at send time, so a
  // single queued row covers back-to-back bookings without duplicate emails.
  // The booking is already saved: a family with no email, or a queue failure,
  // must not turn it into an error.
  let emailQueued = false;
  try {
    const result = await queueFamilyNotification(
      supabase,
      lead.lead_id,
      'booking_confirmation',
    );
    emailQueued = result !== 'no_email';
  } catch (notifError) {
    console.error('[book-appointment] notification queue error:', notifError);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      status: booked.status,
      appointment_date: booked.appointment_date,
      appointment_time: booked.appointment_time,
      emailQueued,
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
