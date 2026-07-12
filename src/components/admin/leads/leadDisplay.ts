import type {
  EnrollmentLead,
  EnrollmentLeadNotification,
} from '../../../lib/types';

// ─── Program booking helpers ───────────────────────────────────────────────

export const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
};

export const PROGRAM_BADGE_STYLES: Record<string, string> = {
  little_dragons: 'bg-amber-50 text-amber-700 border border-amber-200',
  youth: 'bg-teal-50 text-teal-700 border border-teal-200',
};

export function formatProgramBookingStatus(booking: {
  status: string;
  appointment_date: string | null;
  appointment_time: string | null;
}): string {
  if (booking.status === 'pending') return 'awaiting approval';
  if (booking.status === 'link_sent') return 'link sent · not booked yet';
  if (
    (booking.status === 'scheduled' || booking.status === 'confirmed') &&
    booking.appointment_date
  ) {
    const date = new Date(
      booking.appointment_date + 'T12:00:00',
    ).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const time = booking.appointment_time
      ? new Date('1970-01-01T' + booking.appointment_time).toLocaleTimeString(
          'en-US',
          { hour: 'numeric', minute: '2-digit' },
        )
      : '';
    const icon = booking.status === 'confirmed' ? '✓' : '📅';
    return `${icon} ${date}${time ? ' · ' + time : ''}`;
  }
  return booking.status;
}

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

export const BADGE_STYLES: Record<EnrollmentLead['status'], string> = {
  new: 'bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]',
  approved: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
  appointment_scheduled: 'bg-amber-100 text-amber-800 border border-amber-200',
  appointment_confirmed: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
  denied: 'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]',
  enrolled: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
  closed: 'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]',
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

export function getLeadPrimaryDate(lead: EnrollmentLead): string | null {
  const programDates =
    lead.programBookings
      ?.filter((b) => b.appointment_date)
      .map((b) => b.appointment_date as string)
      .sort() ?? [];
  return programDates[0] ?? lead.appointment_date ?? null;
}

export function getLeadPrimaryTime(lead: EnrollmentLead): string | null {
  if (lead.programBookings?.length) {
    const withTime = lead.programBookings.filter(
      (b) => b.appointment_date && b.appointment_time,
    );
    if (withTime.length) {
      const sorted = [...withTime].sort((a, b) =>
        (a.appointment_date! + a.appointment_time!).localeCompare(
          b.appointment_date! + b.appointment_time!,
        ),
      );
      return sorted[0].appointment_time;
    }
  }
  return lead.appointment_time ?? null;
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
