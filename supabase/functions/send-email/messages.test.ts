// supabase/functions/send-email/messages.test.ts
import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildReceiptMessage, buildAdminAlertMessage } from './messages.ts';
import type { AppointmentInfo } from './types.ts';

const DUMMY_LEAD = {
  lead_id: '1',
  parent_name: 'Eduardo Guerra',
  parent_email: 'eduardo@example.com',
  phone: null,
  student_name: null,
  student_age: null,
  message: null,
  booking_token: null,
  denial_message: null,
  status: 'appointment_scheduled',
  source_page: 'contact',
  created_at: '2026-01-01T00:00:00Z',
  appointment_date: null,
  appointment_time: null,
};

const single: AppointmentInfo[] = [
  {
    programLabel: 'Little Dragons',
    childNames: 'Emma',
    date: 'Monday, April 28, 2026',
    dateShort: 'Mon, Apr 28',
    appointmentDate: '2026-04-28',
    time: '4:00 PM',
    rebookingUrl: 'https://lbmaa.com/book/abc123',
    googleCalendarUrl: 'https://calendar.google.com/calendar/render?abc',
    icsUrl:
      'https://project.supabase.co/functions/v1/visit-calendar?token=abc123',
    bookingToken: 'abc123',
  },
];

const multi: AppointmentInfo[] = [
  ...single,
  {
    programLabel: 'Youth Program',
    childNames: 'Jake',
    date: 'Wednesday, April 30, 2026',
    dateShort: 'Wed, Apr 30',
    appointmentDate: '2026-04-30',
    time: '5:30 PM',
    rebookingUrl: 'https://lbmaa.com/book/def456',
    googleCalendarUrl: 'https://calendar.google.com/calendar/render?def',
    icsUrl:
      'https://project.supabase.co/functions/v1/visit-calendar?token=def456',
    bookingToken: 'def456',
  },
];

// ── buildReceiptMessage ─────────────────────────────────────────────────

Deno.test(
  'buildReceiptMessage: English one visit uses the exact subject',
  () => {
    const lead = { ...DUMMY_LEAD, preferred_language: 'en' };
    const message = buildReceiptMessage(lead, single);
    assertEquals(message.subject, 'Trial visit booked: Mon, Apr 28 at 4:00 PM');
    assertStringIncludes(message.html, "You're booked");
    assertStringIncludes(message.text, 'Monday, April 28, 2026');
  },
);

Deno.test('buildReceiptMessage: English two visits uses subjectMany', () => {
  const lead = { ...DUMMY_LEAD, preferred_language: 'en' };
  const message = buildReceiptMessage(lead, multi);
  assertEquals(message.subject, 'Your trial visits are booked');
  assertStringIncludes(message.html, 'Your visits are booked');
});

Deno.test(
  'buildReceiptMessage: Spanish one visit uses the Spanish subject, heading, and arrive sentence',
  () => {
    const lead = { ...DUMMY_LEAD, preferred_language: 'es' };
    const message = buildReceiptMessage(lead, single);
    assertEquals(
      message.subject.startsWith('Visita de prueba reservada:'),
      true,
    );
    assertStringIncludes(message.html, 'Tu visita está reservada');
    assertStringIncludes(message.text, 'Por favor llega a las 4:00 PM.');
  },
);

Deno.test(
  'buildReceiptMessage: a null preferred_language falls back to English',
  () => {
    const lead = { ...DUMMY_LEAD, preferred_language: null };
    const message = buildReceiptMessage(lead, single);
    assertEquals(message.subject, 'Trial visit booked: Mon, Apr 28 at 4:00 PM');
    assertStringIncludes(message.html, "You're booked");
  },
);

Deno.test(
  'buildReceiptMessage: an unrecognized preferred_language falls back to English',
  () => {
    const lead = { ...DUMMY_LEAD, preferred_language: 'fr' };
    const message = buildReceiptMessage(lead, single);
    assertEquals(message.subject, 'Trial visit booked: Mon, Apr 28 at 4:00 PM');
    assertStringIncludes(message.html, "You're booked");
  },
);

// ── buildAdminAlertMessage ──────────────────────────────────────────────

const ADMIN_URL = 'https://example.com/admin';
const LOGO = 'https://example.com/logo.png';

Deno.test(
  'buildAdminAlertMessage: with visits, subject names the family and the first visit, sanitised',
  () => {
    const lead = { ...DUMMY_LEAD, parent_name: 'Maria Lopez' };
    const message = buildAdminAlertMessage(lead, single, ADMIN_URL, LOGO);
    assertEquals(
      message.subject,
      'New trial booking from Maria Lopez: Mon, Apr 28 at 4:00 PM',
    );
    assertStringIncludes(message.html, 'New trial booking');
  },
);

Deno.test(
  'buildAdminAlertMessage: without visits keeps the plain inquiry subject',
  () => {
    const lead = { ...DUMMY_LEAD, parent_name: 'Maria Lopez' };
    const message = buildAdminAlertMessage(lead, [], ADMIN_URL, LOGO);
    assertEquals(message.subject, 'New enrollment inquiry from Maria Lopez');
    assertStringIncludes(message.html, 'New enrollment inquiry');
  },
);

Deno.test(
  'buildAdminAlertMessage: a parent name with a newline stays single-line in the subject',
  () => {
    const lead = { ...DUMMY_LEAD, parent_name: 'Maria\nLopez' };
    const message = buildAdminAlertMessage(lead, [], ADMIN_URL, LOGO);
    assertEquals(message.subject.includes('\n'), false);
    assertEquals(message.subject, 'New enrollment inquiry from Maria Lopez');
  },
);
