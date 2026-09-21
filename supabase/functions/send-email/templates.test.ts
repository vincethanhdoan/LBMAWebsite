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
  bookingConfirmationText,
  reminderEmailHtml,
  rescheduleEmailHtml,
  submissionConfirmationHtml,
  approvalEmailHtml,
  multiProgramApprovalEmailHtml,
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

Deno.test('makeHeader: table row, logo left, school name right', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  const logoIdx = html.indexOf(`<img src="${LOGO}"`);
  const nameIdx = html.indexOf('Los Banos Martial Arts Academy');
  assertEquals(logoIdx > -1, true);
  assertEquals(logoIdx < nameIdx, true);
  const hasCenteredLogo = html.includes('margin:0 auto 8px');
  assertNotEquals(hasCenteredLogo, true);
});

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
    dateShort: 'Mon, Apr 28',
    appointmentDate: '2026-04-28',
    time: '4:00 PM',
    rebookingUrl: 'https://lbmaa.com/book/abc123',
    bookingToken: 'abc123',
  },
];

const multi: AppointmentInfo[] = [
  {
    programLabel: 'Little Dragons',
    childNames: 'Emma and Lily',
    date: 'Monday, April 28, 2026',
    dateShort: 'Mon, Apr 28',
    appointmentDate: '2026-04-28',
    time: '4:00 PM',
    rebookingUrl: 'https://lbmaa.com/book/abc123',
    bookingToken: 'abc123',
  },
  {
    programLabel: 'Youth Program',
    childNames: 'Jake',
    date: 'Wednesday, April 30, 2026',
    dateShort: 'Wed, Apr 30',
    appointmentDate: '2026-04-30',
    time: '5:30 PM',
    rebookingUrl: 'https://lbmaa.com/book/def456',
    bookingToken: 'def456',
  },
];

Deno.test(
  'bookingConfirmationHtml single, en: heading, arrive sentence, change link, address',
  () => {
    const html = bookingConfirmationHtml('Eduardo Guerra', single, 'en');
    assertStringIncludes(html, "You're booked");
    assertStringIncludes(html, 'Hi Eduardo,');
    assertEquals(html.includes('Guerra'), false);
    assertStringIncludes(html, 'Monday, April 28, 2026');
    assertStringIncludes(html, 'Please arrive at 4:00 PM.');
    assertStringIncludes(html, 'Little Dragons');
    assertStringIncludes(html, 'Emma');
    assertStringIncludes(html, 'https://lbmaa.com/book/abc123');
    assertStringIncludes(html, '1209 South 6th St Suite E, Los Banos, CA');
    assertEquals(html.includes('Click here'), false);
    assertEquals(html.includes('confirmed'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml single, es: heading, arrive sentence, address',
  () => {
    const html = bookingConfirmationHtml('Eduardo Guerra', single, 'es');
    assertStringIncludes(html, 'Tu visita está reservada');
    assertStringIncludes(html, 'Por favor llega a las 4:00 PM.');
    assertStringIncludes(html, '1209 South 6th St Suite E, Los Banos, CA');
    assertEquals(html.includes('Click here'), false);
    assertEquals(html.includes('confirmed'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml multi: uses headingMany, contains all programs, dates, times',
  () => {
    const html = bookingConfirmationHtml('Eduardo Guerra', multi, 'en');
    assertStringIncludes(html, 'Your visits are booked');
    assertEquals(html.includes('Little Dragons'), true);
    assertEquals(html.includes('Youth Program'), true);
    assertEquals(html.includes('Monday, April 28, 2026'), true);
    assertEquals(html.includes('Wednesday, April 30, 2026'), true);
    assertEquals(html.includes('Please arrive at 4:00 PM.'), true);
    assertEquals(html.includes('Please arrive at 5:30 PM.'), true);
    assertEquals(html.includes('Jake'), true);
    assertEquals(html.includes('https://lbmaa.com/book/abc123'), true);
    assertEquals(html.includes('https://lbmaa.com/book/def456'), true);
  },
);

Deno.test(
  'bookingConfirmationHtml: a Spanish time ending in "p. m." does not double the period',
  () => {
    const esAppointment: AppointmentInfo[] = [
      { ...single[0], time: '5:20 p. m.' },
    ];
    const html = bookingConfirmationHtml('Eduardo Guerra', esAppointment, 'es');
    assertStringIncludes(html, 'Por favor llega a las 5:20 p. m.');
    assertEquals(html.includes('p. m..'), false);
  },
);

Deno.test('bookingConfirmationHtml: escapes a name containing <', () => {
  const html = bookingConfirmationHtml('<script>Bad</script>', single, 'en');
  assertEquals(html.includes('<script>Bad'), false);
  assertStringIncludes(html, '&lt;script&gt;');
});

Deno.test(
  'bookingConfirmationHtml: greets by first name only, en and es',
  () => {
    const htmlEn = bookingConfirmationHtml('Maria Lopez', single, 'en');
    assertStringIncludes(htmlEn, 'Hi Maria,');
    assertEquals(htmlEn.includes('Lopez'), false);

    const htmlEs = bookingConfirmationHtml('Maria Lopez', single, 'es');
    assertStringIncludes(htmlEs, 'Hola Maria,');
    assertEquals(htmlEs.includes('Lopez'), false);
  },
);

Deno.test('bookingConfirmationHtml: a single-word name is used as-is', () => {
  const html = bookingConfirmationHtml('Cher', single, 'en');
  assertStringIncludes(html, 'Hi Cher,');
});

Deno.test(
  'bookingConfirmationHtml: query-string hrefs are HTML-escaped, not raw',
  () => {
    const appt: AppointmentInfo[] = [
      {
        ...single[0],
        rebookingUrl:
          'https://lbmaa.com/book/abc123?ref=email&utm_source=receipt',
      },
    ];
    const html = bookingConfirmationHtml('Maria Lopez', appt, 'en');
    assertStringIncludes(html, '&amp;utm_source=');
    assertEquals(html.includes('&utm_source='), false);
  },
);

Deno.test(
  'bookingConfirmationHtml: no booking token omits the change link',
  () => {
    const appt: AppointmentInfo[] = [{ ...single[0], bookingToken: null }];
    const html = bookingConfirmationHtml('Eduardo Guerra', appt, 'en');
    assertEquals(html.includes('Change or cancel this visit'), false);
    assertEquals(html.includes('https://lbmaa.com/book/abc123'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml es: uses the Spanish program name, not the English one',
  () => {
    const esAppointment: AppointmentInfo[] = [
      { ...single[0], programLabel: 'Pequeños Dragones' },
    ];
    const html = bookingConfirmationHtml('Maria Lopez', esAppointment, 'es');
    assertStringIncludes(html, 'Pequeños Dragones');
    assertEquals(html.includes('Little Dragons'), false);
  },
);

Deno.test(
  'bookingConfirmationText es: uses the Spanish program name, not the English one',
  () => {
    const esAppointment: AppointmentInfo[] = [
      { ...single[0], programLabel: 'Pequeños Dragones' },
    ];
    const text = bookingConfirmationText('Maria Lopez', esAppointment, 'es');
    assertStringIncludes(text, 'Pequeños Dragones');
    assertEquals(text.includes('Little Dragons'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml en: still uses the English program name',
  () => {
    const html = bookingConfirmationHtml('Eduardo Guerra', single, 'en');
    assertStringIncludes(html, 'Little Dragons');
  },
);

Deno.test(
  'bookingConfirmationHtml es: footer uses Spanish "Questions?" and "or"',
  () => {
    const html = bookingConfirmationHtml('Maria Lopez', single, 'es');
    assertStringIncludes(html, '¿Preguntas?');
    assertEquals(html.includes('Questions?'), false);
    assertStringIncludes(
      html,
      'o <a href="tel:+14086200252" style="color:#A01F23;text-decoration:underline;">(408) 620-0252</a>',
    );
  },
);

Deno.test(
  'bookingConfirmationText: one fact per line, urls on their own lines',
  () => {
    const text = bookingConfirmationText('Eduardo Guerra', multi, 'en');
    assertStringIncludes(text, 'Monday, April 28, 2026');
    assertStringIncludes(text, 'Wednesday, April 30, 2026');
    assertStringIncludes(
      text,
      'Change or cancel this visit: https://lbmaa.com/book/abc123',
    );
    assertStringIncludes(
      text,
      'Change or cancel this visit: https://lbmaa.com/book/def456',
    );
  },
);

Deno.test('bookingConfirmationText: es uses Spanish copy', () => {
  const text = bookingConfirmationText('Eduardo Guerra', single, 'es');
  assertStringIncludes(text, 'Tu visita está reservada');
  assertStringIncludes(text, 'Por favor llega a las 4:00 PM.');
  assertStringIncludes(
    text,
    'Cambiar o cancelar esta visita: https://lbmaa.com/book/abc123',
  );
});

Deno.test('bookingConfirmationText: greets by first name only', () => {
  const text = bookingConfirmationText('Maria Lopez', single, 'en');
  assertStringIncludes(text, 'Hi Maria,');
  assertEquals(text.includes('Lopez'), false);
});

Deno.test(
  'bookingConfirmationText: no booking token omits the change line',
  () => {
    const appt: AppointmentInfo[] = [{ ...single[0], bookingToken: null }];
    const text = bookingConfirmationText('Eduardo Guerra', appt, 'en');
    assertEquals(text.includes('Change or cancel this visit'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml and bookingConfirmationText: no add-to-calendar link or label, en and es',
  () => {
    for (const language of ['en', 'es'] as const) {
      const html = bookingConfirmationHtml('Eduardo Guerra', single, language);
      const text = bookingConfirmationText('Eduardo Guerra', single, language);
      for (const rendered of [html, text]) {
        assertEquals(rendered.includes('calendar.google.com'), false);
        assertEquals(rendered.includes('visit-calendar'), false);
        assertEquals(rendered.toLowerCase().includes('calendar'), false);
        assertEquals(rendered.toLowerCase().includes('calendario'), false);
      }
    }
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

Deno.test(
  'rescheduleEmailHtml single: apology copy and one generic rebook CTA',
  () => {
    const html = rescheduleEmailHtml('Eduardo Guerra', [
      {
        programLabel: 'Little Dragons',
        childNames: 'Emma',
        bookingUrl: 'https://lbmaa.com/book/abc123',
      },
    ]);
    assertStringIncludes(html, 'Eduardo Guerra');
    assertStringIncludes(html, 'sorry we missed you');
    assertStringIncludes(html, 'https://lbmaa.com/book/abc123');
    assertStringIncludes(html, 'Pick a New Time');
    assertEquals(html.includes('Rebook'), false);
  },
);

Deno.test(
  'rescheduleEmailHtml multi: one labeled rebook CTA per program',
  () => {
    const html = rescheduleEmailHtml('Eduardo Guerra', [
      {
        programLabel: 'Little Dragons',
        childNames: 'Emma & Lily',
        bookingUrl: 'https://lbmaa.com/book/abc123',
      },
      {
        programLabel: 'Youth Program',
        childNames: 'Jake',
        bookingUrl: 'https://lbmaa.com/book/def456',
      },
    ]);
    assertStringIncludes(html, 'Rebook Little Dragons Intro');
    assertStringIncludes(html, 'Rebook Youth Program Intro');
    assertStringIncludes(html, 'Emma &amp; Lily');
    assertStringIncludes(html, 'https://lbmaa.com/book/abc123');
    assertStringIncludes(html, 'https://lbmaa.com/book/def456');
  },
);

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

Deno.test(
  'enrollmentNotificationHtml: omits the Email row when parent_email is null',
  () => {
    const lead = { ...DUMMY_LEAD, parent_email: null };
    const html = enrollmentNotificationHtml(
      lead,
      'https://example.com/admin',
      LOGO,
    );
    assertEquals(html.includes('>Email</td>'), false);
    assertEquals(html.includes('Jane'), true);
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

// ── enrollmentNotificationHtml: new_lead with booked visits ───────────────

Deno.test(
  'enrollmentNotificationHtml: no visits keeps the plain inquiry heading',
  () => {
    const html = enrollmentNotificationHtml(
      DUMMY_LEAD,
      'https://example.com/admin',
      LOGO,
    );
    assertStringIncludes(html, 'New enrollment inquiry');
    assertEquals(html.includes('New trial booking'), false);
    assertEquals(html.includes('>Visit</td>'), false);
  },
);

Deno.test(
  'enrollmentNotificationHtml: with visits shows a Visit row per booking',
  () => {
    const html = enrollmentNotificationHtml(
      DUMMY_LEAD,
      'https://example.com/admin',
      LOGO,
      'Admin Portal',
      [
        {
          programLabel: 'Little Dragons',
          childNames: 'Mia',
          date: 'Monday, October 5, 2026',
          time: '5:20 PM',
        },
      ],
    );
    assertStringIncludes(html, 'New trial booking');
    assertStringIncludes(html, '>Visit</td>');
    assertStringIncludes(html, 'Little Dragons');
    assertStringIncludes(html, 'Mia');
    assertStringIncludes(html, 'Monday, October 5, 2026');
    assertStringIncludes(html, '5:20 PM');
  },
);

Deno.test(
  'enrollmentNotificationHtml: Spanish-language lead adds a Language row',
  () => {
    const lead = { ...DUMMY_LEAD, preferred_language: 'es' };
    const html = enrollmentNotificationHtml(
      lead,
      'https://example.com/admin',
      LOGO,
      'Admin Portal',
      [
        {
          programLabel: 'Little Dragons',
          childNames: 'Mia',
          date: 'Monday, October 5, 2026',
          time: '5:20 PM',
        },
      ],
    );
    assertStringIncludes(html, 'Language');
    assertStringIncludes(html, 'Spanish');
  },
);

Deno.test(
  'enrollmentNotificationHtml: English lead omits the Language row',
  () => {
    const html = enrollmentNotificationHtml(
      DUMMY_LEAD,
      'https://example.com/admin',
      LOGO,
    );
    assertEquals(html.includes('>Language</td>'), false);
  },
);

Deno.test(
  'enrollmentNotificationHtml: Spanish lead with no visits still shows the Language row and keeps the plain inquiry heading',
  () => {
    const lead = { ...DUMMY_LEAD, preferred_language: 'es' };
    const html = enrollmentNotificationHtml(
      lead,
      'https://example.com/admin',
      LOGO,
    );
    assertStringIncludes(html, 'New enrollment inquiry');
    assertEquals(html.includes('New trial booking'), false);
    assertStringIncludes(html, 'Language');
    assertStringIncludes(html, 'Spanish');
  },
);

// ── approval wording: neutral, no "approved" claim ─────────────────────────

Deno.test('approvalEmailHtml: does not claim the request was approved', () => {
  const html = approvalEmailHtml(
    DUMMY_LEAD,
    'https://lbmaa.com/book/abc123',
    LOGO,
  );
  assertEquals(html.toLowerCase().includes('approved'), false);
  assertStringIncludes(html, "We'd love to have you in for a visit.");
  assertStringIncludes(html, 'https://lbmaa.com/book/abc123');
});

Deno.test(
  'multiProgramApprovalEmailHtml: does not claim the request was approved',
  () => {
    const html = multiProgramApprovalEmailHtml('Eduardo Guerra', [
      {
        programLabel: 'Little Dragons',
        childNames: 'Emma',
        bookingUrl: 'https://lbmaa.com/book/abc123',
      },
    ]);
    assertEquals(html.toLowerCase().includes('approved'), false);
    assertStringIncludes(html, "We'd love to have you in for a visit.");
  },
);
