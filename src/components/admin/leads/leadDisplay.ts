import type {
  EnrollmentLead,
  EnrollmentLeadNotification,
} from '../../../lib/types';

// ─── Program booking helpers ───────────────────────────────────────────────

export const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
};

// The confirm-attendance request is the `reminder` email, queued by the
// 2-days-out cron or by an admin pressing Send. The `booking_confirmation`
// email is only a booking receipt and carries no confirm link, so it never
// counts as the confirmation email here.
export function effectiveConfirmationNotification(
  lead: EnrollmentLead,
): EnrollmentLeadNotification | null {
  return lead.reminderNotification;
}

// ─── Search ────────────────────────────────────────────────────────────────

export function leadMatchesSearch(
  lead: EnrollmentLead,
  search: string,
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const phoneMatch =
    digits.length >= 4 &&
    (lead.phone?.replace(/\D/g, '').includes(digits) ?? false);
  return (
    phoneMatch ||
    lead.parent_name.toLowerCase().includes(q) ||
    lead.parent_email.toLowerCase().includes(q) ||
    (lead.student_name?.toLowerCase().includes(q) ?? false) ||
    (lead.children?.some((c) => c.name.toLowerCase().includes(q)) ?? false)
  );
}

// ─── Status display ────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<EnrollmentLead['status'], string> = {
  new: 'New',
  approved: 'Approved',
  appointment_scheduled: 'Awaiting confirmation',
  appointment_confirmed: 'Confirmed',
  denied: 'Denied',
  enrolled: 'Enrolled',
  closed: 'Closed',
};

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Like formatDate, but the year appears only when it isn't the current year.
export function formatDateConcise(dateString: string) {
  const d = new Date(dateString);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

// ─── Calendar view helpers ─────────────────────────────────────────────────

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTimeShort(timeStr: string): string {
  return new Date('1970-01-01T' + timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatGroupHeader(dateKey: string) {
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow);
  const d = new Date(dateKey + 'T12:00:00');
  return {
    label: d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    isToday: dateKey === todayKey,
    isTomorrow: dateKey === tomorrowKey,
  };
}

export function getWeekStart(offset: number): Date {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + offset * 7); // getDay(): 0=Sun … 6=Sat
  start.setHours(0, 0, 0, 0);
  return start;
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startLabel = weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? String(weekEnd.getDate())
      : weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}
