// supabase/functions/visit-calendar/index.ts
// Public endpoint; auth is the booking_token on enrollment_lead_program_bookings.
// Opened directly from the receipt email's "Add to calendar" link, so it must
// work with no Origin header and no Authorization header.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildVisitIcs } from './ics.ts';
import { SCHOOL_ADDRESS, joinNames } from '../_shared/copy.ts';
import type { Language } from '../_shared/copy.ts';

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

function getAppUrl(): string {
  const url = Deno.env.get('APP_URL');
  if (!url) throw new Error('APP_URL environment variable is not set');
  return url.replace(/\/+$/, '');
}

function notFound(cors: Record<string, string>): Response {
  return new Response('Not found', { status: 404, headers: cors });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUMMARY: Record<Language, string> = {
  en: 'Trial visit at Los Banos Martial Arts',
  es: 'Visita de prueba en Los Banos Martial Arts',
};

const FAMILY_FALLBACK: Record<Language, string> = {
  en: 'your family',
  es: 'tu familia',
};

function buildDescription(
  language: Language,
  children: string,
  changeUrl: string,
): string {
  return language === 'es'
    ? `Visita para ${children}. Cambiar o cancelar: ${changeUrl}`
    : `Visit for ${children}. Change or cancel: ${changeUrl}`;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET')
    return new Response('Method not allowed', { status: 405, headers: cors });

  const token = new URL(req.url).searchParams.get('token');
  if (!token || !UUID_RE.test(token)) return notFound(cors);

  const supabase = adminClient();

  const { data: booking } = await supabase
    .from('enrollment_lead_program_bookings')
    .select(
      'booking_id, lead_id, program_type, appointment_date, appointment_time, status',
    )
    .eq('booking_token', token)
    .single();

  if (
    !booking ||
    !['scheduled', 'confirmed'].includes(booking.status) ||
    !booking.appointment_date ||
    !booking.appointment_time
  ) {
    return notFound(cors);
  }

  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('preferred_language, status, deleted_at')
    .eq('lead_id', booking.lead_id)
    .single();

  // A deleted, denied, or closed lead's booking links are dead, the same as
  // everywhere else a booking_token is resolved.
  if (
    !lead ||
    lead.deleted_at ||
    lead.status === 'denied' ||
    lead.status === 'closed'
  ) {
    return notFound(cors);
  }

  const language: Language = lead.preferred_language === 'es' ? 'es' : 'en';

  const { data: children } = await supabase
    .from('enrollment_lead_children')
    .select('name')
    .eq('lead_id', booking.lead_id)
    .eq('program_type', booking.program_type);

  const childNames =
    joinNames(children?.map((c: { name: string }) => c.name) ?? [], language) ||
    FAMILY_FALLBACK[language];

  const appUrl = getAppUrl();
  const changeUrl = `${appUrl}/book/${token}`;

  const ics = buildVisitIcs({
    uid: `${booking.booking_id}@lbmartialarts.com`,
    dateKey: booking.appointment_date,
    time: booking.appointment_time,
    summary: SUMMARY[language],
    location: SCHOOL_ADDRESS,
    description: buildDescription(language, childNames, changeUrl),
    now: new Date(),
  });

  return new Response(ics, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trial-visit.ics"',
    },
  });
});
