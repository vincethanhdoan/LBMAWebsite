// supabase/functions/send-email/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  WebhookPayload,
  EnrollmentLeadNotificationRecord,
  MessageRecord,
  EnrollmentLead,
  PortalEmailQueueRecord,
  AppointmentInfo,
  ChildRecord,
} from './types.ts';
import {
  messagingNotificationHtml,
  approvalEmailHtml,
  multiProgramApprovalEmailHtml,
  rescheduleEmailHtml,
  denialEmailHtml,
  reminderEmailHtml,
  submissionConfirmationHtml,
  announcementNotificationHtml,
  blogPostNotificationHtml,
  commentReplyHtml,
  postCommentHtml,
  PROGRAM_LABELS,
} from './templates.ts';
import {
  toLanguage,
  formatVisitDate,
  formatVisitDateShort,
  formatVisitTime,
  joinNames,
  sanitizeForSubject,
  programLabel,
} from './copy.ts';
import type { Language } from './copy.ts';
import { getAppUrl } from '../_shared/appUrl.ts';
import {
  LOGO_URL,
  buildReceiptMessage,
  buildAdminAlertMessage,
} from './messages.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM =
  'Los Banos Martial Arts Academy <hello@notifications.lbmartialarts.com>';
const REPLY_TO = 'LosBanosMartialArts@gmail.com';

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      reply_to: REPLY_TO,
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

// How far off the appointment is, phrased for the reminder subject/heading.
// Measured in Pacific calendar days so it matches when the reminder cron fires
// (6pm Pacific) and reads correctly for manual sends any number of days out.
function daysUntilPhrase(appointmentDate: string): string {
  const pacificToday = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  const days = Math.round(
    (Date.parse(appointmentDate + 'T00:00:00Z') -
      Date.parse(pacificToday + 'T00:00:00Z')) /
      86_400_000,
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

async function getLeadAppointments(
  supabase: ReturnType<typeof adminClient>,
  leadId: string,
  appUrl: string,
  language: Language,
): Promise<AppointmentInfo[]> {
  const pacificToday = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  const { data: bookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('program_type, booking_token, appointment_date, appointment_time')
    .eq('lead_id', leadId)
    .in('status', ['scheduled', 'confirmed'])
    .not('appointment_date', 'is', null)
    .gte('appointment_date', pacificToday)
    .order('appointment_date', { ascending: true });

  if (!bookings || bookings.length === 0) return [];

  return Promise.all(
    bookings.map(
      async (b: {
        program_type: string;
        booking_token: string | null;
        appointment_date: string;
        appointment_time: string;
      }) => {
        const { data: children } = await supabase
          .from('enrollment_lead_children')
          .select('name')
          .eq('lead_id', leadId)
          .eq('program_type', b.program_type);

        const childNames = joinNames(
          children?.map((c: { name: string }) => c.name) ?? [],
          language,
        );
        const rebookingUrl = b.booking_token
          ? `${appUrl}/book/${b.booking_token}`
          : appUrl;

        return {
          programLabel: programLabel(b.program_type, language),
          childNames,
          date: formatVisitDate(b.appointment_date, language),
          dateShort: formatVisitDateShort(b.appointment_date, language),
          appointmentDate: b.appointment_date,
          time: formatVisitTime(b.appointment_time, language),
          rebookingUrl,
          bookingToken: b.booking_token,
        };
      },
    ),
  );
}

// Per-program booking links for emails whose CTA is "book (or rebook) your
// visit": one entry per program booking, with the children it covers.
async function getProgramBookingLinks(
  supabase: ReturnType<typeof adminClient>,
  leadId: string,
): Promise<
  Array<{
    programLabel: string;
    childNames: string;
    bookingToken: string | null;
  }>
> {
  const { data: programBookings } = await supabase
    .from('enrollment_lead_program_bookings')
    .select('program_type, booking_token')
    .eq('lead_id', leadId);

  if (!programBookings || programBookings.length === 0) return [];

  return Promise.all(
    programBookings.map(
      async (b: { program_type: string; booking_token: string | null }) => {
        const { data: children } = await supabase
          .from('enrollment_lead_children')
          .select('name')
          .eq('lead_id', leadId)
          .eq('program_type', b.program_type);
        return {
          programLabel: PROGRAM_LABELS[b.program_type] ?? b.program_type,
          childNames: joinNames(
            children?.map((c: { name: string }) => c.name) ?? [],
            'en',
          ),
          bookingToken: b.booking_token,
        };
      },
    ),
  );
}

async function markEnrollmentFailed(
  supabase: ReturnType<typeof adminClient>,
  notificationId: string,
  message: string,
): Promise<void> {
  await supabase
    .from('enrollment_lead_notifications')
    .update({ status: 'failed', error_message: message.slice(0, 500) })
    .eq('notification_id', notificationId);
}

async function handleEnrollmentNotification(recordId: string): Promise<void> {
  const supabase = adminClient();

  // Re-read the authoritative row from the DB. The webhook body is untrusted
  // (this endpoint is reachable with the public anon key), so we never send
  // based on request-supplied content. Only 'queued' rows are sent, which also makes
  // delivery idempotent against duplicate or replayed webhook deliveries.
  const { data: record } = await supabase
    .from('enrollment_lead_notifications')
    .select('notification_id, lead_id, recipient_email, type, status')
    .eq('notification_id', recordId)
    .single<EnrollmentLeadNotificationRecord>();

  if (!record) {
    console.warn('[send-email] enrollment notification not found:', recordId);
    return;
  }
  if (record.status !== 'queued') return;

  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('lead_id', record.lead_id)
    .single<EnrollmentLead>();

  if (error || !lead)
    throw new Error(`Enrollment lead not found: ${record.lead_id}`);

  const appUrl = getAppUrl();
  const adminUrl = `${appUrl}/admin`;
  const bookingUrl = lead.booking_token
    ? `${appUrl}/book/${lead.booking_token}`
    : appUrl;
  const _confirmUrl = lead.booking_token
    ? `${appUrl}/confirm/${lead.booking_token}`
    : appUrl;

  const { data: childRows } = await supabase
    .from('enrollment_lead_children')
    .select('name, age, program_type')
    .eq('lead_id', record.lead_id)
    .order('created_at', { ascending: true });
  const enrichedLead: EnrollmentLead = {
    ...lead,
    children: (childRows ?? []) as ChildRecord[],
  };

  let subject: string;
  let html: string;
  let text: string | undefined;

  switch (record.type) {
    case 'new_lead': {
      // Fan out to all active admin notification recipients
      const { data: admins } = await supabase
        .from('admin_notification_settings')
        .select('email')
        .eq('notify_new_leads', true)
        .eq('is_active', true);
      const recipients =
        admins && admins.length > 0
          ? admins.map((a: { email: string }) => a.email)
          : [record.recipient_email];

      // Always English (admin-facing); Spanish families still surface via
      // the Language row below.
      const visits = await getLeadAppointments(
        supabase,
        record.lead_id,
        appUrl,
        'en',
      );
      const alert = buildAdminAlertMessage(
        enrichedLead,
        visits,
        adminUrl,
        LOGO_URL,
      );
      subject = alert.subject;
      html = alert.html;
      const results = await Promise.allSettled(
        recipients.map((to: string) => sendEmail(to, subject, html)),
      );
      const failures = results
        .map((r, i) =>
          r.status === 'rejected'
            ? `${recipients[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
            : null,
        )
        .filter((m): m is string => m !== null);
      if (failures.length > 0) {
        await markEnrollmentFailed(
          supabase,
          record.notification_id,
          `Failed recipients: ${failures.join('; ')}`,
        );
        throw new Error(
          `new_lead fan-out failed for ${failures.length} of ${recipients.length} recipients`,
        );
      }
      await supabase
        .from('enrollment_lead_notifications')
        .update({ status: 'sent' })
        .eq('notification_id', record.notification_id);
      return;
    }
    case 'submission':
      subject = 'Thank you for your interest in LBMAA';
      html = submissionConfirmationHtml(enrichedLead, LOGO_URL);
      break;
    case 'approval': {
      const programs = await getProgramBookingLinks(supabase, record.lead_id);

      subject = 'Pick a time for your visit to Los Banos Martial Arts';

      if (programs.length > 0) {
        html = multiProgramApprovalEmailHtml(
          lead.parent_name,
          programs.map((p) => ({
            programLabel: p.programLabel,
            childNames: p.childNames,
            bookingUrl: p.bookingToken
              ? `${appUrl}/book/${p.bookingToken}`
              : appUrl,
          })),
          LOGO_URL,
        );
      } else {
        html = approvalEmailHtml(lead, bookingUrl, LOGO_URL);
      }
      break;
    }
    case 'reschedule': {
      const linked = (await getProgramBookingLinks(supabase, record.lead_id))
        .filter((p) => p.bookingToken)
        .map((p) => ({
          programLabel: p.programLabel,
          childNames: p.childNames,
          bookingUrl: `${appUrl}/book/${p.bookingToken}`,
        }));
      // Legacy leads keep a single lead-level token instead of program rows.
      const programs =
        linked.length > 0
          ? linked
          : lead.booking_token
            ? [{ programLabel: '', childNames: '', bookingUrl }]
            : [];
      if (programs.length === 0) {
        console.warn(
          '[send-email] reschedule: no booking links for lead',
          record.lead_id,
        );
        return;
      }
      subject = "Sorry we missed you! Let's reschedule your visit";
      html = rescheduleEmailHtml(lead.parent_name, programs, LOGO_URL);
      break;
    }
    case 'denial':
      subject = 'Your enrollment inquiry at LBMAA';
      html = denialEmailHtml(lead, LOGO_URL);
      break;
    case 'booking_confirmation': {
      const language = toLanguage(lead.preferred_language);
      const appointments = await getLeadAppointments(
        supabase,
        record.lead_id,
        appUrl,
        language,
      );
      if (appointments.length === 0) {
        console.warn(
          '[send-email] booking_confirmation: no booked appointments for lead',
          record.lead_id,
        );
        await markEnrollmentFailed(
          supabase,
          record.notification_id,
          'No upcoming visit was left when this email was due.',
        );
        return;
      }
      const receipt = buildReceiptMessage(lead, appointments);
      subject = receipt.subject;
      html = receipt.html;
      text = receipt.text;
      break;
    }
    case 'reminder': {
      const appointments = await getLeadAppointments(
        supabase,
        record.lead_id,
        appUrl,
        'en',
      );
      if (appointments.length === 0) {
        console.warn(
          '[send-email] reminder: no booked appointments for lead',
          record.lead_id,
        );
        await markEnrollmentFailed(
          supabase,
          record.notification_id,
          'No upcoming visit was left when this email was due.',
        );
        return;
      }
      const firstToken = appointments[0]?.bookingToken ?? lead.booking_token;
      const reminderConfirmUrl = firstToken
        ? `${appUrl}/confirm/${firstToken}`
        : appUrl;
      const whenPhrase = daysUntilPhrase(appointments[0].appointmentDate);
      subject =
        appointments.length > 1
          ? `Reminder: your LBMAA appointments are ${whenPhrase}`
          : `Reminder: your LBMAA appointment is ${whenPhrase}`;
      html = reminderEmailHtml(
        lead.parent_name,
        appointments,
        reminderConfirmUrl,
        whenPhrase,
        LOGO_URL,
      );
      break;
    }
    default:
      console.warn('[send-email] Unknown notification type:', record.type);
      return;
  }

  try {
    await sendEmail(record.recipient_email, subject, html, text);
  } catch (err) {
    await markEnrollmentFailed(
      supabase,
      record.notification_id,
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }

  await supabase
    .from('enrollment_lead_notifications')
    .update({ status: 'sent' })
    .eq('notification_id', record.notification_id);
}

async function handleMessageNotification(recordId: string): Promise<void> {
  const supabase = adminClient();

  // Re-read the authoritative message row; the webhook body is untrusted.
  const { data: record } = await supabase
    .from('messages')
    .select('message_id, conversation_id, author_user_id, created_at')
    .eq('message_id', recordId)
    .single<MessageRecord>();

  if (!record) {
    console.warn('[send-email] message not found:', recordId);
    return;
  }

  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id, last_read_at')
    .eq('conversation_id', record.conversation_id)
    .neq('user_id', record.author_user_id);

  if (!members || members.length === 0) return;

  const recipient = members[0];

  if (recipient.last_read_at && recipient.last_read_at >= record.created_at)
    return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(recipient.user_id);
  if (userError || !user?.email) return;

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', record.author_user_id)
    .single();

  const senderName = senderProfile?.display_name ?? 'Someone';
  const appUrl = getAppUrl();
  const portalUrl = `${appUrl}/dashboard?tab=messages`;

  // Check if the recipient has opted out of message emails
  const { data: prefRow } = await supabase
    .from('user_notification_preferences')
    .select('notify_messages')
    .eq('user_id', recipient.user_id)
    .maybeSingle();

  const prefRowAdmin =
    prefRow === null
      ? await supabase
          .from('admin_notification_preferences')
          .select('notify_messages')
          .eq('user_id', recipient.user_id)
          .maybeSingle()
      : null;

  const notifyMessages =
    prefRow?.notify_messages ?? prefRowAdmin?.data?.notify_messages ?? true; // default: send if no prefs row exists

  if (!notifyMessages) return;

  // senderName is a display_name the user typed; a stray newline or control
  // character must not reach Resend's JSON subject field verbatim.
  await sendEmail(
    user.email,
    `New message from ${sanitizeForSubject(senderName, 'Someone')} in the LBMAA Portal`,
    messagingNotificationHtml(senderName, portalUrl, LOGO_URL),
  );
}

async function handlePortalNotification(recordId: string): Promise<void> {
  const supabase = adminClient();

  // Re-read the authoritative row; the webhook body is untrusted. Only 'queued'
  // rows are sent, keeping delivery idempotent against replayed webhooks.
  const { data: record } = await supabase
    .from('portal_email_queue')
    .select('queue_id, recipient_email, type, payload, status')
    .eq('queue_id', recordId)
    .single<PortalEmailQueueRecord>();

  if (!record) {
    console.warn('[send-email] portal notification not found:', recordId);
    return;
  }
  if (record.status !== 'queued') return;

  const appUrl = getAppUrl();
  const tab = record.payload.tab ?? 'announcements';
  const tabUrl = `${appUrl}/dashboard?tab=${tab}`;

  let subject: string;
  let html: string;

  switch (record.type) {
    case 'announcement':
      subject = 'New announcement from LBMAA';
      html = announcementNotificationHtml(
        record.payload.title ?? '',
        record.payload.body ?? '',
        tabUrl,
        LOGO_URL,
      );
      break;
    case 'blog_post':
      // author_name is free text a portal user typed; sanitize before it
      // reaches the subject line (the html call below is unrelated and
      // already goes through escHtml in the template).
      subject = `New post from ${sanitizeForSubject(record.payload.author_name ?? 'a member', 'a member')} in the LBMAA Parent Blog`;
      html = blogPostNotificationHtml(
        record.payload.title ?? '',
        record.payload.author_name ?? 'A member',
        tabUrl,
        LOGO_URL,
      );
      break;
    case 'comment_reply':
      subject = `${sanitizeForSubject(record.payload.replier_name ?? 'Someone', 'Someone')} replied to your comment in the LBMAA Portal`;
      html = commentReplyHtml(
        record.payload.replier_name ?? 'Someone',
        record.payload.original_snippet ?? '',
        tabUrl,
        LOGO_URL,
      );
      break;
    case 'post_comment':
      subject = 'New comment on your post in the LBMAA Portal';
      html = postCommentHtml(
        record.payload.commenter_name ?? 'Someone',
        record.payload.post_title ?? 'your post',
        tabUrl,
        LOGO_URL,
      );
      break;
    default:
      console.warn(
        '[send-email] Unknown portal notification type:',
        record.type,
      );
      return;
  }

  try {
    await sendEmail(record.recipient_email, subject, html);
  } catch (err) {
    await supabase
      .from('portal_email_queue')
      .update({
        status: 'failed',
        error_message: (err instanceof Error ? err.message : String(err)).slice(
          0,
          500,
        ),
      })
      .eq('queue_id', record.queue_id);
    throw err;
  }

  await supabase
    .from('portal_email_queue')
    .update({ status: 'sent' })
    .eq('queue_id', record.queue_id);
}

// Constant-time comparison to avoid leaking secret bytes via response timing.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function isAuthorized(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (webhookSecret && safeEqual(token, webhookSecret)) return true;

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && safeEqual(token, serviceRoleKey)) return true;

  return false;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!isAuthorized(authHeader)) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload.type !== 'INSERT') {
    return new Response('OK', { status: 200 });
  }

  // Take only the primary-key id from the (untrusted) webhook body; every handler
  // re-reads the real row from the DB and sends based on that, never on this body.
  const pkColumn =
    payload.table === 'messages'
      ? 'message_id'
      : payload.table === 'portal_email_queue'
        ? 'queue_id'
        : 'notification_id';
  const recordId = (payload.record as Record<string, unknown>)?.[pkColumn];
  if (typeof recordId !== 'string') {
    return new Response('OK', { status: 200 });
  }

  try {
    if (payload.table === 'enrollment_lead_notifications') {
      await handleEnrollmentNotification(recordId);
    } else if (payload.table === 'messages') {
      await handleMessageNotification(recordId);
    } else if (payload.table === 'portal_email_queue') {
      await handlePortalNotification(recordId);
    }
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[send-email]', err);
    return new Response('Internal error', { status: 500 });
  }
});
