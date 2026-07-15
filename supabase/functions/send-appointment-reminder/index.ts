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

  const { leadId } = await req.json();
  if (!leadId)
    return new Response('Missing leadId', { status: 400, headers: cors });

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, status, parent_email')
    .eq('lead_id', leadId)
    .single();

  if (!lead)
    return new Response('Lead not found', { status: 404, headers: cors });

  if (
    lead.status !== 'appointment_scheduled' &&
    lead.status !== 'appointment_confirmed'
  ) {
    return new Response('Lead is not scheduled or confirmed', {
      status: 422,
      headers: cors,
    });
  }

  // Block only while a send is in flight. Already-sent confirmations can be
  // re-sent: delivery fails silently (spam, typos fixed via edit), and staff
  // need to nudge families again.
  const { data: existing } = await supabase
    .from('enrollment_lead_notifications')
    .select('notification_id')
    .eq('lead_id', leadId)
    .eq('type', 'reminder')
    .eq('status', 'queued')
    .maybeSingle();

  if (existing) {
    return new Response('Reminder already queued', {
      status: 409,
      headers: cors,
    });
  }

  const { error: notifError } = await supabase
    .from('enrollment_lead_notifications')
    .insert({
      lead_id: leadId,
      recipient_email: lead.parent_email,
      channel: 'email',
      type: 'reminder',
      status: 'queued',
    });

  if (notifError) {
    console.error(
      '[send-appointment-reminder] notification insert error:',
      notifError,
    );
    return new Response('Failed to queue reminder', {
      status: 500,
      headers: cors,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
