const PACIFIC_TZ = 'America/Los_Angeles';

export function pacificTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ }).format(
    new Date(),
  );
}

// Current Pacific instant as a sortable `YYYY-MM-DDTHH:MM:SS` string. Because
// booked visits store their date and time as Pacific wall-clock too, string
// comparison against this key answers "has this visit passed?" with no offset
// or DST math.
export function pacificNowKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

export function daysUntilInPacific(date: Date): number {
  // Compare pure calendar dates via UTC midnights — immune to DST because
  // UTC has no transitions. `date` carries the intended calendar date in
  // browser-local fields (react-day-picker returns local midnight).
  const [y, m, d] = pacificTodayISO().split('-').map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const targetUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.round((targetUtc - todayUtc) / 86400000);
}
