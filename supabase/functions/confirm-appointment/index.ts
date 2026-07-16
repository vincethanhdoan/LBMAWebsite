import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function recalculateLeadStatus(
  supabase: ReturnType<typeof adminClient>,
  leadId: string,
): Promise<boolean> {
  const { data: bookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('status')
    .eq('lead_id', leadId);

  if (!bookings || bookings.length === 0) return false;

  const statuses = bookings.map((b: { status: string }) => b.status);
  const allScheduledOrConfirmed = statuses.every(
    (s: string) => s === 'scheduled' || s === 'confirmed',
  );
  const allConfirmed = statuses.every((s: string) => s === 'confirmed');

  const leadStatus = allConfirmed
    ? 'appointment_confirmed'
    : allScheduledOrConfirmed
      ? 'appointment_scheduled'
      : 'approved';

  await supabase
    .from('enrollment_leads')
    .update({ status: leadStatus })
    .eq('lead_id', leadId);

  return allScheduledOrConfirmed;
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

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(new Date());

  const { data: leadBookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select(
      'booking_id, status, program_type, appointment_date, appointment_time',
    )
    .eq('lead_id', tokenBooking.lead_id);

  const bookings = leadBookings ?? [];
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
  const anyFutureBooked = bookings.some(
    (b) =>
      (b.status === 'scheduled' || b.status === 'confirmed') &&
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
    if (!anyFutureBooked && bookings.length > 0) {
      // Every booked visit is in the past.
      const pastBooked = bookings.filter(
        (b) =>
          (b.status === 'scheduled' || b.status === 'confirmed') &&
          b.appointment_date,
      );
      return okResponse(
        { past: true, already_confirmed: false },
        toAppointments(pastBooked),
      );
    }
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

  await recalculateLeadStatus(supabase, tokenBooking.lead_id);

  return okResponse(
    { already_confirmed: false },
    toAppointments([...scheduledFuture, ...confirmedFuture]),
  );
});
