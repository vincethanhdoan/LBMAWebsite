// supabase/functions/visit-calendar/ics.ts
// Builds an RFC 5545 .ics file body for a single booked trial visit. Pure
// formatting, no I/O, so every rule (escaping, folding, the one-hour
// duration) is exact-string testable.

import { pacificToUtc } from '../_shared/pacificTime.ts';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// 'YYYYMMDDTHHMMSSZ', the RFC 5545 UTC date-time form.
function formatUtcIcs(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

// RFC 5545 TEXT escaping: backslash first (so it doesn't double-escape the
// characters escaped after it), then semicolon, comma, and newline.
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

// Folds one logical content line into the physical lines RFC 5545 requires:
// no physical line over 75 octets, continuation lines prefixed with a single
// space. Splits by Unicode code point (not UTF-16 code unit or byte) so a
// multi-byte UTF-8 character is never divided across a fold.
function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;

  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    if (currentBytes + chBytes > limit) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
      limit = 74; // a continuation line reserves 1 octet for its leading space
    }
    current += ch;
    currentBytes += chBytes;
  }
  chunks.push(current);
  return chunks;
}

// Folds every logical line and joins all resulting physical lines with
// CRLF, including a trailing CRLF after the last line.
function renderLines(logicalLines: string[]): string {
  const physicalLines = logicalLines.flatMap((line) =>
    foldLine(line).map((chunk, i) => (i === 0 ? chunk : ` ${chunk}`)),
  );
  return physicalLines.join('\r\n') + '\r\n';
}

export interface BuildVisitIcsInput {
  uid: string;
  dateKey: string; // 'YYYY-MM-DD', Pacific
  time: string; // 'HH:MM:SS', Pacific
  summary: string;
  location: string;
  description: string;
  now: Date;
}

export function buildVisitIcs(input: BuildVisitIcsInput): string {
  const start = pacificToUtc(input.dateKey, input.time);
  const end = new Date(start.getTime() + 60 * 60_000);

  return renderLines([
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Los Banos Martial Arts Academy//Trial Visit//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(input.uid)}`,
    `DTSTAMP:${formatUtcIcs(input.now)}`,
    `DTSTART:${formatUtcIcs(start)}`,
    `DTEND:${formatUtcIcs(end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `LOCATION:${escapeText(input.location)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]);
}
