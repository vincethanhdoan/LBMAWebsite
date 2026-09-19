// supabase/functions/admin-book-appointment/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { queueFamilyNotification } from '../_shared/familyNotifications.ts';
import {
  STAFF_HORIZON_DAYS,
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

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader)
    return new Response('Unauthorized', { status: 401, headers: cors });

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  );
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user)
    return new Response('Unauthorized', { status: 401, headers: cors });

  const supabase = adminClient();

  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  });
  if (!isAdmin)
    return new Response('Forbidden', { status: 403, headers: cors });

  const { programBookingId, slotId, appointmentDate } = await req.json();
  if (!programBookingId || !slotId || !appointmentDate) {
    return new Response(
      'Missing programBookingId, slotId, or appointmentDate',
      { status: 400, headers: cors },
    );
  }

  let booked;
  try {
    booked = await bookProgramAppointment(supabase, {
      bookingId: programBookingId,
      slotId,
      appointmentDate,
      allowToday: true,
      horizonDays: STAFF_HORIZON_DAYS,
      actor: user.id,
    });
  } catch (bookingError) {
    return bookingErrorResponse(bookingError, cors);
  }

  // The booking is already saved: a family with no email, or a queue failure,
  // must not turn it into an error.
  let emailQueued = false;
  try {
    const result = await queueFamilyNotification(
      supabase,
      booked.lead_id,
      'booking_confirmation',
    );
    emailQueued = result !== 'no_email';
  } catch (notifError) {
    console.error(
      '[admin-book-appointment] notification queue error:',
      notifError,
    );
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
