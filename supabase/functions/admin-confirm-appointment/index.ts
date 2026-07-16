// supabase/functions/admin-confirm-appointment/index.ts

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

  const { leadId, action } = await req.json();
  if (!leadId)
    return new Response('Missing leadId', { status: 400, headers: cors });
  const revert = action === 'unconfirm';

  const todayPacific = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(new Date());

  // confirm: scheduled -> confirmed; unconfirm (undo): confirmed -> scheduled.
  // Only future-or-today bookings move; updated_by records the acting admin so
  // the booking-change trigger does not notify the actor.
  const { data: bookings, error: readError } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('booking_id, status, appointment_date')
    .eq('lead_id', leadId)
    .eq('status', revert ? 'confirmed' : 'scheduled')
    .gte('appointment_date', todayPacific);

  if (readError)
    return new Response('Lookup failed', { status: 500, headers: cors });
  if (!bookings || bookings.length === 0) {
    const { data: lead } = await supabase
      .from('enrollment_leads')
      .select('lead_id, status, appointment_date')
      .eq('lead_id', leadId)
      .single();
    const legacyOk =
      lead &&
      lead.appointment_date &&
      lead.appointment_date >= todayPacific &&
      lead.status ===
        (revert ? 'appointment_confirmed' : 'appointment_scheduled');
    if (!legacyOk)
      return new Response('Nothing to update', { status: 422, headers: cors });
    const { error: legacyError } = await supabase
      .from('enrollment_leads')
      .update({
        status: revert ? 'appointment_scheduled' : 'appointment_confirmed',
      })
      .eq('lead_id', leadId);
    if (legacyError)
      return new Response('Update failed', { status: 500, headers: cors });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { error: updateError } = await supabase
    .from('enrollment_lead_program_bookings')
    .update({ status: revert ? 'scheduled' : 'confirmed', updated_by: user.id })
    .in(
      'booking_id',
      bookings.map((b: { booking_id: string }) => b.booking_id),
    );

  if (updateError)
    return new Response('Update failed', { status: 500, headers: cors });

  await recalculateLeadStatus(supabase, leadId);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
