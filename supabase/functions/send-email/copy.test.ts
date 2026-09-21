// supabase/functions/send-email/copy.test.ts
import {
  assertEquals,
  assertStringIncludes,
  assertNotEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  toLanguage,
  formatVisitDate,
  formatVisitDateNoYear,
  formatVisitDateShort,
  formatVisitTime,
  RECEIPT_COPY,
  joinNames,
  fillTemplate,
  sanitizeForSubject,
  firstName,
  programLabel,
  timeArticle,
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

Deno.test('formatVisitDateNoYear: en and es carry no year', () => {
  assertEquals(
    formatVisitDateNoYear('2026-10-07', 'en'),
    'Wednesday, October 7',
  );
  assertEquals(
    formatVisitDateNoYear('2026-10-07', 'es'),
    'Miércoles, 7 de octubre',
  );
});

Deno.test(
  'formatVisitDateNoYear: the Spanish weekday opens the line upper-case',
  () => {
    assertEquals(
      formatVisitDateNoYear('2026-09-30', 'es'),
      'Miércoles, 30 de septiembre',
    );
    assertEquals(
      formatVisitDateNoYear('2026-11-26', 'es'),
      'Jueves, 26 de noviembre',
    );
  },
);

Deno.test(
  'formatVisitDateNoYear: the long formatter still carries the year',
  () => {
    assertStringIncludes(formatVisitDate('2026-10-07', 'en'), '2026');
    assertEquals(
      formatVisitDateNoYear('2026-10-07', 'en').includes('2026'),
      false,
    );
    assertEquals(
      formatVisitDateNoYear('2026-10-07', 'es').includes('2026'),
      false,
    );
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

Deno.test(
  'timeArticle: Spanish uses "a la" only for the 1 o\'clock hour',
  () => {
    assertEquals(timeArticle('1:20 p.m.', 'es'), 'a la');
    assertEquals(timeArticle('1:00 a.m.', 'es'), 'a la');
    assertEquals(timeArticle('5:35 p.m.', 'es'), 'a las');
    assertEquals(timeArticle('12:35 p.m.', 'es'), 'a las');
    assertEquals(timeArticle('11:05 a.m.', 'es'), 'a las');
  },
);

Deno.test('timeArticle: English is always "at"', () => {
  assertEquals(timeArticle('1:20 PM', 'en'), 'at');
  assertEquals(timeArticle('5:35 PM', 'en'), 'at');
});

Deno.test(
  'RECEIPT_COPY es: the what-to-expect sentence is gender-neutral about the child',
  () => {
    const body = RECEIPT_COPY.es.expectBody;
    assertEquals(body.includes('Tu hijo'), false);
    assertEquals(body.includes('tu hijo'), false);
    assertEquals(body.includes('hija'), false);
    assertStringIncludes(body, 'Solo hace falta ropa deportiva cómoda.');
  },
);

Deno.test(
  'RECEIPT_COPY: the Maps link names Google Maps in both languages',
  () => {
    assertEquals(RECEIPT_COPY.en.openMaps, 'Open in Google Maps');
    assertEquals(RECEIPT_COPY.es.openMaps, 'Abrir en Google Maps');
  },
);

Deno.test(
  'RECEIPT_COPY: both several-visit subjects carry the first date',
  () => {
    assertStringIncludes(RECEIPT_COPY.en.subjectMany, '{dateShort}');
    assertStringIncludes(RECEIPT_COPY.es.subjectMany, '{dateShort}');
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
  'sanitizeForSubject: a newline is collapsed to a single space',
  () => {
    assertEquals(sanitizeForSubject('Jane\nDoe', 'fallback'), 'Jane Doe');
  },
);

Deno.test('sanitizeForSubject: a CRLF collapses to one space, not two', () => {
  assertEquals(sanitizeForSubject('Jane\r\nDoe', 'fallback'), 'Jane Doe');
});

Deno.test('sanitizeForSubject: a tab is collapsed to a single space', () => {
  assertEquals(sanitizeForSubject('Jane\tDoe', 'fallback'), 'Jane Doe');
});

Deno.test('sanitizeForSubject: leading and trailing spaces are trimmed', () => {
  assertEquals(sanitizeForSubject('   Jane Doe   ', 'fallback'), 'Jane Doe');
});

Deno.test(
  'sanitizeForSubject: a 300-character name is capped at 120 chars',
  () => {
    const longName = 'A'.repeat(300);
    const result = sanitizeForSubject(longName, 'fallback');
    assertEquals(result.length, 120);
    assertEquals(result, 'A'.repeat(120));
  },
);

Deno.test(
  'sanitizeForSubject: other C0 control characters are also collapsed',
  () => {
    assertEquals(sanitizeForSubject('Jane\x01\x1FDoe', 'fallback'), 'Jane Doe');
  },
);

Deno.test(
  'sanitizeForSubject: an all-control-character input returns the fallback',
  () => {
    assertEquals(sanitizeForSubject('\n\t\r', 'a family'), 'a family');
  },
);

Deno.test('sanitizeForSubject: an empty string returns the fallback', () => {
  assertEquals(sanitizeForSubject('', 'a family'), 'a family');
});

Deno.test(
  'sanitizeForSubject: a fallback is not used when real text remains',
  () => {
    assertEquals(sanitizeForSubject('Jane', 'a family'), 'Jane');
  },
);

Deno.test('firstName: returns the first whitespace-separated word', () => {
  assertEquals(firstName('Maria Lopez'), 'Maria');
});

Deno.test('firstName: a single-word name is used as-is', () => {
  assertEquals(firstName('Cher'), 'Cher');
});

Deno.test('firstName: trims surrounding whitespace before splitting', () => {
  assertEquals(firstName('  Maria   Lopez  '), 'Maria');
});

Deno.test('programLabel: English names', () => {
  assertEquals(programLabel('little_dragons', 'en'), 'Little Dragons');
  assertEquals(programLabel('youth', 'en'), 'Youth Program');
});

Deno.test('programLabel: Spanish names', () => {
  assertEquals(programLabel('little_dragons', 'es'), 'Pequeños Dragones');
  assertEquals(programLabel('youth', 'es'), 'Programa Juvenil');
});

Deno.test(
  'programLabel: an unknown program_type falls back to the raw key in either language',
  () => {
    assertEquals(programLabel('adult', 'en'), 'adult');
    assertEquals(programLabel('adult', 'es'), 'adult');
  },
);
