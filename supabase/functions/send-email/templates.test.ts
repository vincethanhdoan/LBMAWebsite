// supabase/functions/send-email/templates.test.ts
import {
  assertStringIncludes,
  assertNotEquals,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  enrollmentNotificationHtml,
  messagingNotificationHtml,
  bookingConfirmationHtml,
  reminderEmailHtml,
  submissionConfirmationHtml,
} from './templates.ts';
import type { AppointmentInfo } from './types.ts';

const LOGO = 'https://example.com/logo.png';
const DUMMY_LEAD = {
  lead_id: '1',
  parent_name: 'Jane',
  parent_email: 'jane@example.com',
  phone: null,
  student_name: 'Sam',
  student_age: 8,
  message: null,
  booking_token: null,
  denial_message: null,
  status: 'pending',
  source_page: 'contact',
  created_at: '2026-01-01T00:00:00Z',
  appointment_date: null,
  appointment_time: null,
};

Deno.test('STRIPE: flat 4px red, no gradient', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(html, 'height:4px');
  assertStringIncludes(html, 'background:#A01F23');
  const hasGradient = html.includes('linear-gradient');
  assertNotEquals(hasGradient, true);
});

Deno.test(
  'makeHeader: Option C, flex row, logo left, school name right',
  () => {
    const html = messagingNotificationHtml(
      'Alice',
      'https://example.com',
      LOGO,
    );
    assertStringIncludes(html, 'display:flex');
    assertStringIncludes(html, 'Los Banos Martial Arts Academy');
    const hasCenteredLogo = html.includes('margin:0 auto 8px');
    assertNotEquals(hasCenteredLogo, true);
  },
);

Deno.test(
  'makeHeader: no "Member Family Portal" sub-label on family email',
  () => {
    const html = messagingNotificationHtml(
      'Alice',
      'https://example.com',
      LOGO,
    );
    const hasSubLabel = html.includes('Member Family Portal');
    assertNotEquals(hasSubLabel, true);
  },
);

Deno.test(
  'makeHeader: admin subtitle present on enrollmentNotificationHtml',
  () => {
    const html = enrollmentNotificationHtml(
      DUMMY_LEAD,
      'https://example.com/admin',
      LOGO,
    );
    assertStringIncludes(html, 'Admin Portal');
  },
);

Deno.test('FOOTER: contrast-safe colors, no #aaa or #bbb', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  const hasLowContrast =
    html.includes('color:#aaa') ||
    html.includes('color:#bbb') ||
    html.includes('color:#999');
  assertNotEquals(hasLowContrast, true);
});

Deno.test('FOOTER: font-size 12px, not 11px', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(html, 'font-size:12px');
  const has11px = html.includes('font-size:11px');
  assertNotEquals(has11px, true);
});

Deno.test('wrap: base font-size 15px', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(html, 'font-size:15px');
});

Deno.test('wrap: max-width 580px', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(html, 'max-width:580px');
});

const single: AppointmentInfo[] = [
  {
    programLabel: 'Little Dragons',
    childNames: 'Emma',
    date: 'Monday, April 28, 2026',
    appointmentDate: '2026-04-28',
    time: '4:00 PM',
    rebookingUrl: 'https://lbmaa.com/book/abc123',
    bookingToken: 'abc123',
  },
];

const multi: AppointmentInfo[] = [
  {
    programLabel: 'Little Dragons',
    childNames: 'Emma & Lily',
    date: 'Monday, April 28, 2026',
    appointmentDate: '2026-04-28',
    time: '4:00 PM',
    rebookingUrl: 'https://lbmaa.com/book/abc123',
    bookingToken: 'abc123',
  },
  {
    programLabel: 'Youth Program',
    childNames: 'Jake',
    date: 'Wednesday, April 30, 2026',
    appointmentDate: '2026-04-30',
    time: '5:30 PM',
    rebookingUrl: 'https://lbmaa.com/book/def456',
    bookingToken: 'def456',
  },
];

Deno.test(
  'bookingConfirmationHtml single: contains date, time, program, child, reschedule link',
  () => {
    const html = bookingConfirmationHtml('Eduardo Guerra', single);
    assertEquals(html.includes('Eduardo Guerra'), true);
    assertEquals(html.includes('Monday, April 28, 2026'), true);
    assertEquals(html.includes('4:00 PM'), true);
    assertEquals(html.includes('Little Dragons'), true);
    assertEquals(html.includes('Emma'), true);
    assertEquals(html.includes('https://lbmaa.com/book/abc123'), true);
  },
);

Deno.test(
  'bookingConfirmationHtml multi: contains all programs, dates, times',
  () => {
    const html = bookingConfirmationHtml('Eduardo Guerra', multi);
    assertEquals(html.includes('Little Dragons'), true);
    assertEquals(html.includes('Youth Program'), true);
    assertEquals(html.includes('Monday, April 28, 2026'), true);
    assertEquals(html.includes('Wednesday, April 30, 2026'), true);
    assertEquals(html.includes('4:00 PM'), true);
    assertEquals(html.includes('5:30 PM'), true);
    assertEquals(html.includes('Jake'), true);
    assertEquals(html.includes('https://lbmaa.com/book/abc123'), true);
    assertEquals(html.includes('https://lbmaa.com/book/def456'), true);
  },
);

Deno.test(
  'reminderEmailHtml: contains all appointments, confirm button, reschedule links',
  () => {
    const html = reminderEmailHtml(
      'Eduardo Guerra',
      multi,
      'https://lbmaa.com/confirm/abc123',
      'in 2 days',
    );
    assertEquals(html.includes('Eduardo Guerra'), true);
    assertEquals(html.includes('Little Dragons'), true);
    assertEquals(html.includes('Youth Program'), true);
    assertEquals(html.includes('Monday, April 28, 2026'), true);
    assertEquals(html.includes('Wednesday, April 30, 2026'), true);
    assertEquals(html.includes('4:00 PM'), true);
    assertEquals(html.includes('5:30 PM'), true);
    assertEquals(html.includes('https://lbmaa.com/confirm/abc123'), true);
    assertEquals(html.includes('Confirm My Attendance'), true);
    assertEquals(html.includes('https://lbmaa.com/book/abc123'), true);
    assertEquals(html.includes('https://lbmaa.com/book/def456'), true);
  },
);

Deno.test('reminderEmailHtml: heading reflects the given when-phrase', () => {
  assertStringIncludes(
    reminderEmailHtml(
      'Jane',
      single,
      'https://lbmaa.com/confirm/abc123',
      'tomorrow',
    ),
    'appointment is tomorrow',
  );
  assertStringIncludes(
    reminderEmailHtml(
      'Jane',
      multi,
      'https://lbmaa.com/confirm/abc123',
      'in 5 days',
    ),
    'appointments are in 5 days',
  );
});

// ── enrollmentNotificationHtml: children ──────────────────────────────────

const LEAD_WITH_CHILDREN = {
  ...DUMMY_LEAD,
  student_name: null as null,
  student_age: null as null,
  children: [
    { name: 'Emma', age: 6, program_type: 'little_dragons' },
    { name: 'Jake', age: 12, program_type: 'youth' },
  ],
};

Deno.test(
  'enrollmentNotificationHtml: shows each child name, age, and program',
  () => {
    const html = enrollmentNotificationHtml(
      LEAD_WITH_CHILDREN,
      'https://example.com/admin',
      LOGO,
    );
    assertEquals(html.includes('Emma'), true);
    assertEquals(html.includes('age 6'), true);
    assertEquals(html.includes('Little Dragons'), true);
    assertEquals(html.includes('Jake'), true);
    assertEquals(html.includes('age 12'), true);
    assertEquals(html.includes('Youth Program'), true);
  },
);

Deno.test(
  'enrollmentNotificationHtml: falls back to legacy student_name when children absent',
  () => {
    const html = enrollmentNotificationHtml(
      DUMMY_LEAD,
      'https://example.com/admin',
      LOGO,
    );
    assertEquals(html.includes('Sam'), true);
    assertEquals(html.includes('age 8'), true);
  },
);

// ── submissionConfirmationHtml: children, phone, message ──────────────────

Deno.test(
  'submissionConfirmationHtml: shows children, phone, and message',
  () => {
    const lead = {
      ...DUMMY_LEAD,
      phone: '(209) 555-0100' as string | null,
      message: 'Interested in morning classes.' as string | null,
      student_name: null as null,
      student_age: null as null,
      children: [{ name: 'Emma', age: 6, program_type: 'little_dragons' }],
    };
    const html = submissionConfirmationHtml(lead, LOGO);
    assertEquals(html.includes('Emma'), true);
    assertEquals(html.includes('age 6'), true);
    assertEquals(html.includes('Little Dragons'), true);
    assertEquals(html.includes('(209) 555-0100'), true);
    assertEquals(html.includes('Interested in morning classes.'), true);
  },
);

Deno.test(
  'submissionConfirmationHtml: falls back to legacy student_name when children absent',
  () => {
    const html = submissionConfirmationHtml(DUMMY_LEAD, LOGO);
    assertEquals(html.includes('Sam'), true);
  },
);
