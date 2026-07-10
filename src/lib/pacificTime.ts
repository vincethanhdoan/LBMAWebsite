const PACIFIC_TZ = 'America/Los_Angeles';

export function pacificTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ }).format(new Date());
}

export function daysUntilInPacific(date: Date): number {
  const today = new Date(pacificTodayISO() + 'T12:00:00');
  const target = new Date(date);
  target.setHours(12, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}
