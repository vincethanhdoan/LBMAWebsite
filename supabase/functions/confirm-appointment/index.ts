import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { recalculateLeadStatus } from '../_shared/leadStatus.ts';

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

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  const { token } = await req.json();
  if (!token) return new Response('Missing token', { status: 400 });

  const supabase = adminClient();

  // Resolve the token to its lead. The reminder email links one program's
  // token, but Confirm should confirm every visit the family has booked.
  const { data: tokenBooking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('lead_id')
    .eq('booking_token', token)
    .single();

  if (!tokenBooking)
    return new Response('Invalid token', { status: 404, headers: cors });

  // A denied or closed lead's links are dead, even though its cancelled
  // bookings would otherwise be rebookable.
  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('status')
    .eq('lead_id', tokenBooking.lead_id)
    .single();

  if (!lead || lead.status === 'denied' || lead.status === 'closed') {
    return new Response('Invalid token', { status: 404, headers: cors });
  }

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(new Date());

  const { data: leadBookings, error: readError } = await supabase
    .from('enrollment_lead_program_bookings')
    .select(
      'booking_id, status, program_type, appointment_date, appointment_time',
    )
    .eq('lead_id', tokenBooking.lead_id);

  if (readError)
    return new Response('Lookup failed', { status: 500, headers: cors });

  // Only active (non-cancelled) bookings drive the confirm decision. A
  // cancelled row keeps its date for history but is not a visit to confirm.
  const bookings = (leadBookings ?? []).filter((b) => b.status !== 'cancelled');
  const scheduledFuture = bookings.filter(
    (b) =>
      b.status === 'scheduled' &&
      b.appointment_date &&
      b.appointment_date >= today,
  );
  const confirmedFuture = bookings.filter(
    (b) =>
      b.status === 'confirmed' &&
      b.appointment_date &&
      b.appointment_date >= today,
  );

  const toAppointments = (
    rows: Array<{
      program_type: string;
      appointment_date: string | null;
      appointment_time: string | null;
    }>,
  ) =>
    [...rows]
      .sort((a, b) =>
        (a.appointment_date ?? '').localeCompare(b.appointment_date ?? ''),
      )
      .map((b) => ({
        program_type: b.program_type,
        appointment_date: b.appointment_date,
        appointment_time: b.appointment_time,
      }));

  const okResponse = (
    extra: Record<string, unknown>,
    appts: ReturnType<typeof toAppointments>,
  ) =>
    new Response(
      JSON.stringify({
        ok: true,
        appointments: appts,
        appointment_date: appts[0]?.appointment_date ?? null,
        appointment_time: appts[0]?.appointment_time ?? null,
        ...extra,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );

  // Nothing left to confirm in the future.
  if (scheduledFuture.length === 0) {
    if (confirmedFuture.length > 0) {
      return okResponse(
        { already_confirmed: true },
        toAppointments(confirmedFuture),
      );
    }
    // Every dated visit is in the past, so offer a reschedule. Only reachable
    // when a past scheduled/confirmed visit actually exists.
    const pastBooked = bookings.filter(
      (b) =>
        (b.status === 'scheduled' || b.status === 'confirmed') &&
        b.appointment_date &&
        b.appointment_date < today,
    );
    if (pastBooked.length > 0) {
      return okResponse(
        { past: true, already_confirmed: false },
        toAppointments(pastBooked),
      );
    }
    // No live visit to confirm (all cancelled, or link never booked a date).
    return new Response('Cannot confirm from current status', {
      status: 422,
      headers: cors,
    });
  }

  const { error } = await supabase
    .from('enrollment_lead_program_bookings')
    .update({ status: 'confirmed', updated_by: null })
    .in(
      'booking_id',
      scheduledFuture.map((b) => b.booking_id),
    );

  if (error)
    return new Response('Confirmation failed', { status: 500, headers: cors });

  // Reflect the confirm on the already-fetched set so recalc skips a re-query.
  const confirmedIds = new Set(scheduledFuture.map((b) => b.booking_id));
  const updatedBookings = (leadBookings ?? []).map((b) =>
    confirmedIds.has(b.booking_id) ? { ...b, status: 'confirmed' } : b,
  );
  await recalculateLeadStatus(supabase, tokenBooking.lead_id, updatedBookings);

  return okResponse(
    { already_confirmed: false },
    toAppointments([...scheduledFuture, ...confirmedFuture]),
  );
});
