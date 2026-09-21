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
  denialEmailHtml,
  announcementNotificationHtml,
  blogPostNotificationHtml,
  commentReplyHtml,
  postCommentHtml,
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

Deno.test('FOOTER: font-size 14px, never below', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(
    html,
    '<p class="lb-muted" style="margin:0;font-size:14px;color:#595959;',
  );
  assertNotEquals(html.includes('font-size:11px'), true);
});

Deno.test('wrap: base font-size 15px', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(html, 'font-size:15px');
});

Deno.test('wrap: max-width 580px', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertStringIncludes(html, 'max-width:580px');
});

Deno.test('wrap: a real HTML document with head, metas, and a title', () => {
  const html = messagingNotificationHtml('Alice', 'https://example.com', LOGO);
  assertEquals(html.startsWith('<!DOCTYPE html>'), true);
  assertStringIncludes(html, '<html lang="en" dir="ltr">');
  assertStringIncludes(html, '<meta charset="utf-8" />');
  assertStringIncludes(
    html,
    '<meta name="viewport" content="width=device-width,initial-scale=1" />',
  );
  assertStringIncludes(
    html,
    '<meta name="color-scheme" content="light dark" />',
  );
  assertStringIncludes(
    html,
    '<meta name="supported-color-schemes" content="light dark" />',
  );
  assertStringIncludes(html, '<title>You have a new message</title>');
  assertStringIncludes(
    html,
    '<body class="lb-page" style="margin:0;padding:0;',
  );
  assertEquals(html.trimEnd().endsWith('</html>'), true);
});

Deno.test(
  'wrap: centred presentation table with an Outlook ghost table',
  () => {
    const html = messagingNotificationHtml(
      'Alice',
      'https://example.com',
      LOGO,
    );
    assertStringIncludes(
      html,
      '<table role="presentation" class="lb-page" cellpadding="0" cellspacing="0" border="0" width="100%"',
    );
    assertStringIncludes(html, '<td align="center"');
    assertStringIncludes(
      html,
      '<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" align="center"><tr><td><![endif]-->',
    );
    assertStringIncludes(html, '<!--[if mso]></td></tr></table><![endif]-->');
    // align="center" on the cell would otherwise centre every line of copy.
    assertStringIncludes(
      html,
      'border-radius:6px;overflow:hidden;text-align:left;',
    );
  },
);

Deno.test(
  'wrap: ships a dark-mode palette rather than leaving it to the client',
  () => {
    const html = messagingNotificationHtml(
      'Alice',
      'https://example.com',
      LOGO,
    );
    assertStringIncludes(html, '@media (prefers-color-scheme: dark)');
    for (const rule of [
      '.lb-page { background:#121212 !important; }',
      '.lb-card { background:#1e1e1e !important;',
      '.lb-panel { background:#262626 !important;',
      '.lb-heading { color:#ffffff !important; }',
      '.lb-text { color:#e8e4e0 !important; }',
      '.lb-muted { color:#c9c4bf !important; }',
      '.lb-accent { color:#E4797D !important; }',
    ]) {
      assertStringIncludes(html, rule);
    }
    // Every light colour the dark rules override has a class hook on it, so
    // nothing is left half-inverted.
    for (const [colour, className] of [
      ['#1a1a2e', 'lb-heading'],
      ['#555', 'lb-text'],
      ['#595959', 'lb-muted'],
    ] as const) {
      for (const tag of html.match(/<[a-z]+ [^<>]*>/g) ?? []) {
        if (
          tag.includes(`color:${colour};`) ||
          tag.includes(`color:${colour}"`)
        ) {
          assertStringIncludes(tag, `class="${className}"`);
        }
      }
    }
  },
);

Deno.test(
  'makeHeader: the logo is decorative, the wordmark carries the name',
  () => {
    const html = messagingNotificationHtml(
      'Alice',
      'https://example.com',
      LOGO,
    );
    assertStringIncludes(
      html,
      `<img src="${LOGO}" alt="" width="48" height="48"`,
    );
    assertEquals(html.includes('alt="Los Banos Martial Arts Academy"'), false);
    // A transparent logo would vanish against an inverted header without this.
    assertStringIncludes(html, 'display:block;background:#ffffff;');
  },
);

const single: AppointmentInfo[] = [
  {
    programLabel: 'Little Dragons',
    childNames: 'Emma',
    date: 'Tuesday, April 28, 2026',
    dateShort: 'Tue, Apr 28',
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
    date: 'Tuesday, April 28, 2026',
    dateShort: 'Tue, Apr 28',
    appointmentDate: '2026-04-28',
    time: '4:00 PM',
    rebookingUrl: 'https://lbmaa.com/book/abc123',
    bookingToken: 'abc123',
  },
  {
    programLabel: 'Youth Program',
    childNames: 'Jake',
    date: 'Thursday, April 30, 2026',
    dateShort: 'Thu, Apr 30',
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
    assertStringIncludes(html, 'Tuesday, April 28');
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
    assertStringIncludes(html, 'Por favor, llega a las 4:00 PM.');
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
    assertEquals(html.includes('Tuesday, April 28'), true);
    assertEquals(html.includes('Thursday, April 30'), true);
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
    assertStringIncludes(html, 'Por favor, llega a las 5:20 p. m.');
    assertEquals(html.includes('p. m..'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml es: the article agrees with the hour, "a la 1:20" but "a las 5:35"',
  () => {
    const oneOclock: AppointmentInfo[] = [{ ...single[0], time: '1:20 p.m.' }];
    const htmlOne = bookingConfirmationHtml('Maria Lopez', oneOclock, 'es');
    assertStringIncludes(htmlOne, 'Por favor, llega a la 1:20 p.m.');
    assertEquals(htmlOne.includes('a las 1:20'), false);

    const fiveOclock: AppointmentInfo[] = [{ ...single[0], time: '5:35 p.m.' }];
    const htmlFive = bookingConfirmationHtml('Maria Lopez', fiveOclock, 'es');
    assertStringIncludes(htmlFive, 'Por favor, llega a las 5:35 p.m.');

    const textOne = bookingConfirmationText('Maria Lopez', oneOclock, 'es');
    assertStringIncludes(textOne, 'Por favor, llega a la 1:20 p.m.');
  },
);

Deno.test(
  'bookingConfirmationHtml en: the hour never picks up a Spanish article',
  () => {
    const oneOclock: AppointmentInfo[] = [{ ...single[0], time: '1:20 PM' }];
    const html = bookingConfirmationHtml('Maria Lopez', oneOclock, 'en');
    assertStringIncludes(html, 'Please arrive at 1:20 PM.');
    assertEquals(html.includes('a la '), false);
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
  'bookingConfirmationHtml: the footer signs off without a second way to reach us',
  () => {
    for (const language of ['en', 'es'] as const) {
      const html = bookingConfirmationHtml('Maria Lopez', single, language);
      const footer = html.slice(html.indexOf('class="lb-rule"'));
      assertStringIncludes(footer, 'Los Banos Martial Arts Academy<br />');
      assertStringIncludes(footer, '1209 South 6th St Suite E, Los Banos, CA');
      // Replying reaches the school and the number is just above the rule,
      // so neither is repeated down here.
      assertEquals(footer.includes('mailto:'), false, language);
      assertEquals(footer.includes('tel:'), false, language);
      // The shared centred footer is gone from the receipt entirely.
      assertEquals(html.includes('LosBanosMartialArts@gmail.com'), false);
      assertEquals(html.includes('text-align:center'), false);
    }
  },
);

Deno.test(
  'bookingConfirmationHtml: the address appears where it is needed and in the sign-off, nowhere else',
  () => {
    const html = bookingConfirmationHtml('Maria Lopez', single, 'en');
    const street = 'South 6th St Suite E, Los Banos, CA';
    assertEquals(
      (html.match(new RegExp(street.replace(/\+/g, '\\+'), 'g')) ?? []).length,
      2,
    );
  },
);

Deno.test(
  'bookingConfirmationHtml: only the receipt asks for the web fonts',
  () => {
    const receipt = bookingConfirmationHtml('Maria Lopez', single, 'en', LOGO);
    assertStringIncludes(receipt, 'fonts.googleapis.com/css2?family=');
    assertStringIncludes(receipt, 'Barlow+Condensed');
    assertStringIncludes(receipt, 'Nunito');
    // Word falls back to Times New Roman rather than reading on down an
    // unresolved stack, so Outlook desktop is told what to use.
    assertStringIncludes(receipt, '<!--[if mso]>');
    assertStringIncludes(
      receipt,
      'font-family:Arial,Helvetica,sans-serif !important;',
    );

    const other = messagingNotificationHtml('Alice', 'https://example.com');
    assertEquals(other.includes('fonts.googleapis.com'), false);
    assertEquals(other.includes('Barlow'), false);
  },
);

// Every inline font-size in the receipt, minus the hidden preheader, which is
// deliberately 1px because it is never rendered.
function receiptFontSizes(html: string): number[] {
  const visible = html.replace(/<div style="display:none;[\s\S]*?<\/div>/, '');
  return [...visible.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1]));
}

Deno.test(
  'bookingConfirmationHtml: nothing renders below 14px, en and es',
  () => {
    for (const language of ['en', 'es'] as const) {
      const sizes = receiptFontSizes(
        bookingConfirmationHtml('Maria Lopez', single, language, LOGO),
      );
      assertEquals(sizes.length > 0, true);
      for (const size of sizes) {
        assertEquals(
          size >= 14,
          true,
          `${language}: found font-size:${size}px`,
        );
      }
      // The whole scale, and nothing off it: labels and sign-off at 14,
      // the change link at 15, body at 16, the arrival line at 17, the
      // phone at 20, the ticket date at 26, the headline at 30.
      assertEquals(
        [...new Set(sizes)].sort((a, b) => a - b),
        [14, 15, 16, 17, 20, 26, 30],
        language,
      );
    }
  },
);

// The red band for one visit: everything between its opening cell and the
// end of that cell.
function ticketBands(html: string): string[] {
  return [...html.matchAll(/<td bgcolor="#A01F23"[\s\S]*?<\/td>/g)].map(
    (m) => m[0],
  );
}

Deno.test(
  'bookingConfirmationHtml: one red band per visit, and nothing else wears it',
  () => {
    assertEquals(
      ticketBands(bookingConfirmationHtml('M', single, 'en')).length,
      1,
    );
    assertEquals(
      ticketBands(bookingConfirmationHtml('M', multi, 'en')).length,
      2,
    );
    // Outlook paints from the attribute, everything else from the style.
    for (const band of ticketBands(bookingConfirmationHtml('M', multi, 'en'))) {
      assertStringIncludes(band, 'background:#A01F23;');
      assertStringIncludes(band, 'class="lb-ticket');
    }
    // Several visits read as separate tickets, not one long band.
    assertStringIncludes(
      bookingConfirmationHtml('M', multi, 'en'),
      'border-top:2px solid #ffffff;',
    );
  },
);

Deno.test(
  'bookingConfirmationHtml: the ticket date drops the year, en and es',
  () => {
    const en = ticketBands(bookingConfirmationHtml('M', single, 'en'))[0];
    assertStringIncludes(en, '>Tuesday, April 28</div>');
    assertEquals(en.includes('2026'), false);

    const es = ticketBands(bookingConfirmationHtml('M', single, 'es'))[0];
    assertStringIncludes(es, '>Martes, 28 de abril</div>');
    assertEquals(es.includes('2026'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml: the date is the largest thing on the ticket and the arrival line is quieter',
  () => {
    for (const language of ['en', 'es'] as const) {
      const band = ticketBands(
        bookingConfirmationHtml('Maria Lopez', single, language),
      )[0];
      const sizes = [...band.matchAll(/font-size:(\d+)px/g)].map((m) =>
        Number(m[1]),
      );
      assertEquals(Math.max(...sizes), 26, language);
      // Exactly one element carries it: the date.
      assertEquals(sizes.filter((s) => s === 26).length, 1, language);
      assertStringIncludes(band, 'font-size:26px;font-weight:800;');

      const arrive = language === 'en' ? 'Please arrive' : 'Por favor, llega';
      const arriveTag = band.match(
        new RegExp(`<div[^>]*>${arrive}[^<]*</div>`),
      )![0];
      assertStringIncludes(arriveTag, 'font-size:17px;font-weight:400;');
      assertEquals(arriveTag.includes('font-weight:700'), false, language);
      assertEquals(arriveTag.includes('font-weight:800'), false, language);
    }
  },
);

Deno.test(
  'bookingConfirmationHtml: the phone is the one tel: link in the receipt, en and es',
  () => {
    for (const language of ['en', 'es'] as const) {
      const html = bookingConfirmationHtml('Maria Lopez', single, language);
      assertEquals(
        (html.match(/href="tel:\+14086200252"/g) ?? []).length,
        1,
        language,
      );
      assertEquals((html.match(/\(408\) 620-0252/g) ?? []).length, 1, language);
      // Big, underlined and padded out to a real tap target.
      assertStringIncludes(
        html,
        "display:inline-block;padding:10px 0;font-family:'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;color:#A01F23;text-decoration:underline;\">(408) 620-0252</a>",
      );
      // The number is not buried inside the closing sentence.
      assertEquals(html.includes('call us at (408)'), false);
      assertEquals(html.includes('llámanos al (408)'), false);
    }
  },
);

Deno.test(
  'bookingConfirmationHtml: a visit with no token loses its change link and the rule above it',
  () => {
    const appt: AppointmentInfo[] = [{ ...single[0], bookingToken: null }];
    const band = ticketBands(
      bookingConfirmationHtml('Eduardo Guerra', appt, 'en'),
    )[0];
    assertEquals(band.includes('Change or cancel this visit'), false);
    assertEquals(band.includes('lb-ticket-rule'), false);
  },
);

Deno.test(
  'bookingConfirmationHtml: the ticket keeps its red and its own text colours in dark mode',
  () => {
    const html = bookingConfirmationHtml('Maria Lopez', single, 'en');
    for (const rule of [
      '.lb-ticket { background:#A01F23 !important; }',
      '.lb-ticket-date, .lb-ticket-link { color:#FFFDFC !important; }',
      '.lb-ticket-sub { color:#F6D9D6 !important; }',
      '.lb-ticket-rule { border-top-color:#BB5D60 !important; }',
      '.lb-ticket-gap { border-top-color:#1e1e1e !important; }',
      '.lb-rule { border-top-color:#3a3a3a !important; }',
    ]) {
      assertStringIncludes(html, rule);
    }
    // Every colour those rules replace is on an element that carries the
    // class, so nothing is left half-inverted.
    for (const [colour, className] of [
      ['#FFFDFC', 'lb-ticket-'],
      ['#F6D9D6', 'lb-ticket-sub'],
      ['#E8E0DA', 'lb-rule'],
      ['#231A19', 'lb-heading'],
      ['#4A3F3D', 'lb-text'],
      ['#6B5F5C', 'lb-muted'],
      ['#A01F23', 'lb-accent'],
    ] as const) {
      for (const tag of html.match(/<[a-z]+ [^<>]*>/g) ?? []) {
        if (tag.includes(`color:${colour};`)) {
          assertStringIncludes(tag, className);
        }
      }
    }
  },
);

// Returns the hidden preheader div, asserting nothing else in the body comes
// before it: a client builds the inbox snippet from the first text it finds.
function firstBodyNode(html: string): string {
  const bodyStart = html.indexOf('>', html.indexOf('<body')) + 1;
  const rest = html.slice(bodyStart);
  const nodeStart = rest.indexOf('<');
  assertEquals(rest.slice(0, nodeStart).trim(), '');
  return rest.slice(nodeStart, rest.indexOf('</div>', nodeStart));
}

Deno.test(
  'bookingConfirmationHtml: a hidden preheader is the first node in the body, en and es',
  () => {
    const expected = [
      ['en', 'Arrive at 4:00 PM · 1209 South 6th St Suite E'],
      ['es', 'Llega a las 4:00 PM · 1209 South 6th St Suite E'],
    ] as const;

    for (const [language, text] of expected) {
      const html = bookingConfirmationHtml('Maria Lopez', single, language);
      const node = firstBodyNode(html);
      assertStringIncludes(node, 'display:none;');
      assertStringIncludes(node, 'max-height:0;');
      assertStringIncludes(node, 'overflow:hidden;');
      assertStringIncludes(node, 'mso-hide:all;');
      assertStringIncludes(node, 'font-size:1px;');
      assertStringIncludes(node, 'line-height:1px;');
      // The hidden text matches the background it sits on.
      assertStringIncludes(node, 'color:#f5f2ef;');
      assertStringIncludes(node, 'opacity:0;');
      assertStringIncludes(node, text);
      // Invisible filler, so the body copy does not trail into the snippet.
      assertStringIncludes(node, '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;');
      // The logo and wordmark come after it, not before.
      assertEquals(node.includes('Los Banos Martial Arts Academy'), false);
    }
  },
);

Deno.test(
  'bookingConfirmationHtml: the preheader is short enough not to get cut off, en and es',
  () => {
    for (const language of ['en', 'es'] as const) {
      const html = bookingConfirmationHtml('Maria Lopez', single, language);
      const node = firstBodyNode(html);
      const visible = node.slice(node.indexOf('>') + 1).split('&#847;')[0];
      assertStringIncludes(visible, '4:00 PM');
      assertStringIncludes(visible, '1209 South 6th St Suite E');
      // The subject already carries the date; the preheader should not
      // repeat it.
      assertEquals(visible.includes('2026'), false, `${language}: ${visible}`);
      assertEquals(visible.includes('April'), false, `${language}: ${visible}`);
      assertEquals(
        visible.length <= 60,
        true,
        `${language}: ${visible.length} chars: ${visible}`,
      );
    }
  },
);

Deno.test(
  'bookingConfirmationHtml: several visits put the earliest one in the preheader',
  () => {
    const html = bookingConfirmationHtml('Maria Lopez', multi, 'en');
    const node = firstBodyNode(html);
    assertStringIncludes(node, 'Arrive at 4:00 PM');
    assertEquals(node.includes('5:30 PM'), false);
  },
);

Deno.test('bookingConfirmationText: has no preheader; it is HTML-only', () => {
  const text = bookingConfirmationText('Maria Lopez', single, 'en');
  assertEquals(text.includes('&#847;'), false);
  assertEquals(text.includes('display:none'), false);
  assertEquals(text.startsWith("You're booked"), true);
});

Deno.test(
  'bookingConfirmationHtml: the document language follows the receipt language',
  () => {
    const htmlEn = bookingConfirmationHtml('Maria Lopez', single, 'en');
    assertStringIncludes(htmlEn, '<html lang="en" dir="ltr">');
    assertStringIncludes(htmlEn, "<title>You're booked</title>");
    assertEquals(htmlEn.includes('lang="es"'), false);

    const htmlEs = bookingConfirmationHtml('Maria Lopez', single, 'es');
    assertStringIncludes(htmlEs, '<html lang="es" dir="ltr">');
    assertStringIncludes(htmlEs, '<title>Tu visita está reservada</title>');
    assertEquals(htmlEs.includes('lang="en"'), false);
  },
);

Deno.test(
  'bookingConfirmationText: one fact per line, urls on their own lines',
  () => {
    const text = bookingConfirmationText('Eduardo Guerra', multi, 'en');
    const lines = text.split('\n');
    assertStringIncludes(text, 'Tuesday, April 28, 2026');
    assertStringIncludes(text, 'Thursday, April 30, 2026');
    assertStringIncludes(
      text,
      'Change or cancel this visit:\nhttps://lbmaa.com/book/abc123',
    );
    assertStringIncludes(
      text,
      'Change or cancel this visit:\nhttps://lbmaa.com/book/def456',
    );
    assertStringIncludes(
      text,
      'Open in Google Maps:\nhttps://www.google.com/maps/',
    );
    // Every URL and the phone number stand alone on their line.
    for (const line of lines) {
      if (line.includes('http')) assertEquals(line.startsWith('http'), true);
    }
    assertEquals(lines.includes('(408) 620-0252'), true);
    assertEquals(
      lines.includes('If anything changes, reply to this email or call us.'),
      true,
    );
  },
);

Deno.test('bookingConfirmationText: es uses Spanish copy', () => {
  const text = bookingConfirmationText('Eduardo Guerra', single, 'es');
  const lines = text.split('\n');
  assertStringIncludes(text, 'Tu visita está reservada');
  assertStringIncludes(text, 'Por favor, llega a las 4:00 PM.');
  assertStringIncludes(
    text,
    'Cambiar o cancelar esta visita:\nhttps://lbmaa.com/book/abc123',
  );
  assertStringIncludes(text, 'Solo hace falta ropa deportiva cómoda.');
  assertEquals(text.includes('Tu hijo'), false);
  assertEquals(
    lines.includes('Si algo cambia, responde a este correo o llámanos.'),
    true,
  );
  assertEquals(lines.includes('(408) 620-0252'), true);
});

Deno.test(
  'bookingConfirmationText: keeps the full date with the year the ticket drops',
  () => {
    for (const language of ['en', 'es'] as const) {
      const text = bookingConfirmationText('Maria Lopez', single, language);
      assertStringIncludes(text, '2026');
      const html = bookingConfirmationHtml('Maria Lopez', single, language);
      assertEquals(html.includes('2026'), false, language);
    }
  },
);

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
    assertEquals(html.includes('Tuesday, April 28, 2026'), true);
    assertEquals(html.includes('Thursday, April 30, 2026'), true);
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

// ── every email type still builds, as a full document ─────────────────────

Deno.test(
  'every email builds as an English HTML document and keeps its key content',
  () => {
    const url = 'https://lbmaa.com/x';
    const programs = [
      {
        programLabel: 'Little Dragons',
        childNames: 'Emma',
        bookingUrl: 'https://lbmaa.com/book/abc123',
      },
    ];
    const emails: Array<[string, string, string]> = [
      [
        'enrollment alert',
        enrollmentNotificationHtml(DUMMY_LEAD, url, LOGO),
        'New enrollment inquiry',
      ],
      [
        'message',
        messagingNotificationHtml('Alice', url, LOGO),
        'You have a new message',
      ],
      [
        'invite',
        approvalEmailHtml(DUMMY_LEAD, url, LOGO),
        'Book Your Appointment',
      ],
      [
        'multi-program invite',
        multiProgramApprovalEmailHtml('Jane', programs, LOGO),
        'Book Little Dragons Intro',
      ],
      [
        'reschedule',
        rescheduleEmailHtml('Jane', programs, LOGO),
        'Pick a New Time',
      ],
      ['denial', denialEmailHtml(DUMMY_LEAD, LOGO), 'Your enrollment inquiry'],
      [
        'reminder',
        reminderEmailHtml('Jane', single, url, 'tomorrow', LOGO),
        'Confirm My Attendance',
      ],
      [
        'submission receipt',
        submissionConfirmationHtml(DUMMY_LEAD, LOGO),
        'Thank you for your interest in LBMAA',
      ],
      [
        'announcement',
        announcementNotificationHtml(
          'Closed Friday',
          'We are closed.',
          url,
          LOGO,
        ),
        'Closed Friday',
      ],
      [
        'blog post',
        blogPostNotificationHtml('Belt testing', 'Sensei', url, LOGO),
        'Belt testing',
      ],
      [
        'comment reply',
        commentReplyHtml('Sensei', 'Great class', url, LOGO),
        'replied to your comment',
      ],
      [
        'post comment',
        postCommentHtml('Sensei', 'Belt testing', url, LOGO),
        'New comment on your post',
      ],
      [
        'booking receipt',
        bookingConfirmationHtml('Jane', single, 'en', LOGO),
        "You're booked",
      ],
    ];

    for (const [name, html, keyContent] of emails) {
      assertEquals(html.startsWith('<!DOCTYPE html>'), true, name);
      assertStringIncludes(html, '<html lang="en" dir="ltr">');
      assertStringIncludes(html, '<meta charset="utf-8" />');
      assertStringIncludes(html, '@media (prefers-color-scheme: dark)');
      assertStringIncludes(html, '<body class="lb-page"');
      assertStringIncludes(html, keyContent);
      assertEquals(html.trimEnd().endsWith('</html>'), true, name);
      // One <title>, never empty.
      assertEquals((html.match(/<title>/g) ?? []).length, 1, name);
      assertEquals(/<title>\s*<\/title>/.test(html), false, name);
    }
  },
);
