const PACIFIC_TZ = 'America/Los_Angeles';

export function pacificTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ }).format(new Date());
}

export function daysUntilInPacific(date: Date): number {
  // Compare pure calendar dates via UTC midnights — immune to DST because
  // UTC has no transitions. `date` carries the intended calendar date in
  // browser-local fields (react-day-picker returns local midnight).
  const [y, m, d] = pacificTodayISO().split('-').map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((targetUtc - todayUtc) / 86400000);
}
