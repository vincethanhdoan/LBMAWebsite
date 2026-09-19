// supabase/functions/resend-booking-link/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  noEmailResponse,
  queueFamilyNotification,
} from '../_shared/familyNotifications.ts';

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

const RESENDABLE_STATUSES = [
  'approved',
  'appointment_scheduled',
  'appointment_confirmed',
];

const BOOKED_STATUSES = ['appointment_scheduled', 'appointment_confirmed'];

// What each intent sends, and which leads it may be sent to.
const INTENTS = {
  invite: { type: 'approval', statuses: RESENDABLE_STATUSES },
  reschedule: {
    type: 'reschedule',
    statuses: [...RESENDABLE_STATUSES, 'no_show'],
  },
  receipt: { type: 'booking_confirmation', statuses: BOOKED_STATUSES },
} as const;

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

  const { leadId, intent } = await req.json();
  if (!leadId)
    return new Response('Missing leadId', { status: 400, headers: cors });
  const chosen =
    typeof intent === 'string' && Object.hasOwn(INTENTS, intent)
      ? INTENTS[intent as keyof typeof INTENTS]
      : INTENTS.invite;
  const { type, statuses } = chosen;

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('lead_id, status, booking_token, parent_email')
    .eq('lead_id', leadId)
    .single();

  if (!lead)
    return new Response('Lead not found', { status: 404, headers: cors });
  if (!statuses.includes(lead.status)) {
    return new Response(
      JSON.stringify({
        code: 'not_resendable',
        error:
          "This lead's status changed, so that email can't be sent right now.",
      }),
      { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
  if (!lead.parent_email) return noEmailResponse(cors);

  // A receipt needs no booking token: it just lists whatever visits are
  // still live for the lead, so the token check only applies to the
  // invite and reschedule emails.
  if (type !== 'booking_confirmation') {
    // Check for program bookings (new flow)
    const { data: programBookings } = await supabase
      .from('enrollment_lead_program_bookings')
      .select('booking_id, booking_token')
      .eq('lead_id', leadId)
      .not('booking_token', 'is', null);

    const hasNewFlow = programBookings && programBookings.length > 0;

    // Legacy: require enrollment_leads.booking_token
    if (!hasNewFlow && !lead.booking_token) {
      return new Response('Lead has no booking token', {
        status: 422,
        headers: cors,
      });
    }
  }

  // The send-email handler renders per-program booking links for new-flow
  // leads and falls back to the legacy lead-level token automatically.
  try {
    await queueFamilyNotification(supabase, leadId, type);
  } catch {
    return new Response('Notification failed', { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
