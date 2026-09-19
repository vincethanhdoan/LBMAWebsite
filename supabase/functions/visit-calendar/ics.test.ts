// supabase/functions/visit-calendar/ics.test.ts
import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildVisitIcs } from './ics.ts';

const BASE_INPUT = {
  uid: 'abc-123@lbmartialarts.com',
  dateKey: '2026-09-29',
  time: '17:20:00',
  summary: 'Trial visit at Los Banos Martial Arts',
  location: '1209 South 6th St Suite E, Los Banos, CA',
  description:
    'Visit for Emma and Lily.\nChange, or cancel: https://lbmartialarts.com/book/abc-123',
  now: new Date('2026-09-15T12:00:00Z'),
};

function buildIcs() {
  return buildVisitIcs(BASE_INPUT);
}

Deno.test(
  'buildVisitIcs: starts with BEGIN:VCALENDAR and ends with END:VCALENDAR + CRLF',
  () => {
    const ics = buildIcs();
    assertEquals(ics.startsWith('BEGIN:VCALENDAR'), true);
    assertEquals(ics.endsWith('END:VCALENDAR\r\n'), true);
  },
);

Deno.test('buildVisitIcs: every line ends with CRLF, no lone CR or LF', () => {
  const ics = buildIcs();
  assertEquals(/(?<!\r)\n/.test(ics), false);
  assertEquals(/\r(?!\n)/.test(ics), false);
});

Deno.test('buildVisitIcs: contains METHOD:PUBLISH and UID', () => {
  const ics = buildIcs();
  assertStringIncludes(ics, 'METHOD:PUBLISH\r\n');
  assertStringIncludes(ics, `UID:${BASE_INPUT.uid}\r\n`);
});

Deno.test('buildVisitIcs: DTSTART/DTEND are UTC, one hour apart', () => {
  const ics = buildIcs();
  assertStringIncludes(ics, 'DTSTART:20260930T002000Z\r\n');
  assertStringIncludes(ics, 'DTEND:20260930T012000Z\r\n');
});

Deno.test('buildVisitIcs: DTSTAMP comes from now', () => {
  const ics = buildIcs();
  assertStringIncludes(ics, 'DTSTAMP:20260915T120000Z\r\n');
});

Deno.test('buildVisitIcs: SUMMARY present, LOCATION commas escaped', () => {
  const ics = buildIcs();
  assertStringIncludes(ics, `SUMMARY:${BASE_INPUT.summary}\r\n`);
  assertStringIncludes(
    ics,
    'LOCATION:1209 South 6th St Suite E\\, Los Banos\\, CA\r\n',
  );
});

Deno.test(
  'buildVisitIcs: DESCRIPTION escapes newline and comma per RFC 5545',
  () => {
    // Short enough to stay on one physical line, so folding cannot interfere
    // with checking the escaped text itself (folding is covered separately).
    const ics = buildVisitIcs({
      ...BASE_INPUT,
      description: 'Visit for Emma.\nChange, or cancel: url',
    });
    assertStringIncludes(
      ics,
      'DESCRIPTION:Visit for Emma.\\nChange\\, or cancel: url\r\n',
    );
  },
);

Deno.test('buildVisitIcs: no physical line exceeds 75 octets', () => {
  const ics = buildIcs();
  const encoder = new TextEncoder();
  const lines = ics.split('\r\n');
  const content = lines.slice(0, -1); // drop the trailing split artifact
  for (const line of content) {
    const byteLength = encoder.encode(line).length;
    assertEquals(byteLength <= 75, true, `line exceeded 75 octets: ${line}`);
  }
});

Deno.test(
  'buildVisitIcs: folds long lines with CRLF + space, never splitting a multi-byte character',
  () => {
    const longSummary =
      'Visita de prueba en Los Banos Martial Arts para ' + 'ñ'.repeat(40);
    const ics = buildVisitIcs({ ...BASE_INPUT, summary: longSummary });
    const lines = ics.split('\r\n');
    const summaryLineIndex = lines.findIndex((l: string) =>
      l.startsWith('SUMMARY:'),
    );
    assertEquals(lines[summaryLineIndex + 1]?.startsWith(' '), true);

    let rejoined = lines[summaryLineIndex];
    let i = summaryLineIndex + 1;
    while (lines[i]?.startsWith(' ')) {
      rejoined += lines[i].slice(1);
      i++;
    }
    assertEquals(rejoined, `SUMMARY:${longSummary}`);

    const encoder = new TextEncoder();
    for (const line of lines.slice(0, -1)) {
      assertEquals(encoder.encode(line).length <= 75, true);
    }
  },
);
