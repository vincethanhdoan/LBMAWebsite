// supabase/functions/send-email/copy.test.ts
import {
  assertEquals,
  assertStringIncludes,
  assertNotEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  toLanguage,
  formatVisitDate,
  formatVisitDateShort,
  formatVisitTime,
  RECEIPT_COPY,
  joinNames,
  fillTemplate,
  buildGoogleCalendarUrl,
  buildIcsUrl,
} from './copy.ts';

Deno.test('toLanguage: recognizes es', () => {
  assertEquals(toLanguage('es'), 'es');
});

Deno.test('toLanguage: falls back to en for unknown, null, undefined', () => {
  assertEquals(toLanguage('fr'), 'en');
  assertEquals(toLanguage(null), 'en');
  assertEquals(toLanguage(undefined), 'en');
});

Deno.test('formatVisitDate: en long form', () => {
  assertEquals(
    formatVisitDate('2026-09-29', 'en'),
    'Tuesday, September 29, 2026',
  );
});

Deno.test('formatVisitDate: es contains martes and septiembre', () => {
  const result = formatVisitDate('2026-09-29', 'es');
  assertStringIncludes(result, 'martes');
  assertStringIncludes(result, 'septiembre');
});

Deno.test(
  'formatVisitDateShort: en and es differ, both contain the day number',
  () => {
    const en = formatVisitDateShort('2026-09-29', 'en');
    const es = formatVisitDateShort('2026-09-29', 'es');
    assertStringIncludes(en, '29');
    assertStringIncludes(es, '29');
    assertNotEquals(en, es);
  },
);

Deno.test('formatVisitTime: en is "5:20 PM"', () => {
  assertEquals(formatVisitTime('17:20:00', 'en'), '5:20 PM');
});

Deno.test('formatVisitTime: es starts with "5:20"', () => {
  const result = formatVisitTime('17:20:00', 'es');
  assertEquals(result.startsWith('5:20'), true);
});

Deno.test('RECEIPT_COPY: every en key has a non-empty es counterpart', () => {
  const enKeys = Object.keys(RECEIPT_COPY.en) as Array<
    keyof typeof RECEIPT_COPY.en
  >;
  for (const key of enKeys) {
    const esValue = RECEIPT_COPY.es[key];
    assertEquals(typeof esValue, 'string');
    assertNotEquals(esValue.length, 0);
  }
});

Deno.test(
  'RECEIPT_COPY: no value in either language claims price or free',
  () => {
    for (const language of ['en', 'es'] as const) {
      for (const value of Object.values(RECEIPT_COPY[language]) as string[]) {
        const lower = value.toLowerCase();
        assertEquals(lower.includes('free'), false);
        assertEquals(lower.includes('gratis'), false);
        assertEquals(value.includes('$'), false);
      }
    }
  },
);

Deno.test('joinNames: single name returned as-is', () => {
  assertEquals(joinNames(['Mia'], 'en'), 'Mia');
});

Deno.test('joinNames: two names joined with "and" / "y"', () => {
  assertEquals(joinNames(['Emma', 'Lily'], 'en'), 'Emma and Lily');
  assertEquals(joinNames(['Emma', 'Lily'], 'es'), 'Emma y Lily');
});

Deno.test('joinNames: three names use an oxford-style list', () => {
  assertEquals(
    joinNames(['Emma', 'Lily', 'Jake'], 'en'),
    'Emma, Lily, and Jake',
  );
});

Deno.test('joinNames: empty list returns empty string', () => {
  assertEquals(joinNames([], 'en'), '');
});

Deno.test(
  'fillTemplate: substitutes known keys and leaves unknown placeholders alone',
  () => {
    assertEquals(
      fillTemplate('Hi {name}, meet {children}.', {
        name: 'Jane',
        children: 'Mia',
      }),
      'Hi Jane, meet Mia.',
    );
    assertEquals(fillTemplate('Hi {name}', {}), 'Hi {name}');
  },
);

Deno.test(
  'buildGoogleCalendarUrl: exact string for one date, one hour long',
  () => {
    const url = buildGoogleCalendarUrl({
      dateKey: '2026-10-05',
      time: '17:20:00',
      title: 'Trial visit at Los Banos Martial Arts',
      address: '1209 South 6th St Suite E, Los Banos, CA',
      details: 'https://example.com/book/abc123',
    });
    assertEquals(
      url,
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Trial+visit+at+Los+Banos+Martial+Arts&dates=20261005T172000%2F20261005T182000&ctz=America%2FLos_Angeles&location=1209+South+6th+St+Suite+E%2C+Los+Banos%2C+CA&details=https%3A%2F%2Fexample.com%2Fbook%2Fabc123',
    );
  },
);

Deno.test(
  'buildGoogleCalendarUrl: end time rolls over the date near midnight',
  () => {
    const url = buildGoogleCalendarUrl({
      dateKey: '2026-10-05',
      time: '23:40:00',
      title: 'Trial visit',
      address: 'Los Banos, CA',
      details: 'https://example.com',
    });
    assertStringIncludes(url, 'dates=20261005T234000%2F20261006T004000');
  },
);

Deno.test('buildIcsUrl: exact string for one token', () => {
  assertEquals(
    buildIcsUrl('https://project.supabase.co', 'abc123'),
    'https://project.supabase.co/functions/v1/visit-calendar?token=abc123',
  );
});
