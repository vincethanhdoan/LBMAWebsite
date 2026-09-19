// supabase/functions/_shared/pacificTime.ts
// Converts a Pacific wall-clock date + time into the UTC instant it names,
// correct across the daylight-saving transition. Shared by anything that
// needs to turn a booked appointment's local date/time into a UTC instant
// (currently the visit-calendar ICS file).

const PACIFIC_WALL_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// How many minutes must be ADDED to a Pacific wall-clock reading to get the
// UTC wall-clock reading at the same instant (positive: +420 during PDT,
// +480 during PST). Found by formatting the instant in America/Los_Angeles,
// re-reading those numbers as if they were UTC, and comparing to the instant.
function offsetMinutesAt(instant: Date): number {
  const parts = PACIFIC_WALL_CLOCK.formatToParts(instant).reduce<
    Record<string, string>
  >((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const pacificReadAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (instant.getTime() - pacificReadAsUtc) / 60_000;
}

// Interprets dateKey ('YYYY-MM-DD') + time ('HH:MM:SS') as a wall-clock
// reading in America/Los_Angeles and returns the UTC instant it names.
// First treats the wall time as if it were already UTC to get a rough
// instant, reads the Pacific offset that applies there, and applies it; then
// repeats once against the corrected instant so a reading near the
// daylight-saving transition (where the first guess's offset can be wrong)
// settles on the offset that actually applies.
export function pacificToUtc(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);

  let instant = naive + offsetMinutesAt(new Date(naive)) * 60_000;
  instant = naive + offsetMinutesAt(new Date(instant)) * 60_000;
  return new Date(instant);
}
