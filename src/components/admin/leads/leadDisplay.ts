import type { EnrollmentLead, EnrollmentLeadNotification } from '../../../lib/types';

// ─── Program booking helpers ───────────────────────────────────────────────

export const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
}

export const PROGRAM_BADGE_STYLES: Record<string, string> = {
  little_dragons: 'bg-amber-50 text-amber-700 border border-amber-200',
  youth: 'bg-teal-50 text-teal-700 border border-teal-200',
}

export function formatProgramBookingStatus(booking: { status: string; appointment_date: string | null; appointment_time: string | null }): string {
  if (booking.status === 'pending') return 'awaiting approval'
  if (booking.status === 'link_sent') return 'link sent · not booked yet'
  if ((booking.status === 'scheduled' || booking.status === 'confirmed') && booking.appointment_date) {
    const date = new Date(booking.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const time = booking.appointment_time
      ? new Date('1970-01-01T' + booking.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : ''
    const icon = booking.status === 'confirmed' ? '✓' : '📅'
    return `${icon} ${date}${time ? ' · ' + time : ''}`
  }
  return booking.status
}

// The family gets one confirmation email, queued either automatically on booking
// (`booking_confirmation`) or by an admin pressing Send (`reminder`). Both count as
// the same outbound email, so the UI reflects the single most recent notification by
// created_at, regardless of status. Strict recency means a newer failed attempt is
// surfaced (failed treatment + Retry) instead of being masked by an older sent one.
export function effectiveConfirmationNotification(lead: EnrollmentLead): EnrollmentLeadNotification | null {
  const present = [lead.confirmationNotification, lead.reminderNotification].filter(
    (n): n is EnrollmentLeadNotification => n !== null,
  )
  if (present.length === 0) return null
  return present.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

// ─── Tab config ────────────────────────────────────────────────────────────

export type TabId =
  | 'new'
  | 'approved'
  | 'appointment_scheduled'
  | 'appointment_confirmed'
  | 'denied_closed'
  | 'all';

export const TABS: { id: TabId; label: string; statuses?: EnrollmentLead['status'][] }[] = [
  { id: 'new',                   label: 'New',             statuses: ['new'] },
  { id: 'approved',              label: 'Approved',        statuses: ['approved'] },
  { id: 'appointment_scheduled', label: 'Scheduled',       statuses: ['appointment_scheduled'] },
  { id: 'appointment_confirmed', label: 'Confirmed',       statuses: ['appointment_confirmed'] },
  { id: 'denied_closed',         label: 'Closed / Denied', statuses: ['denied', 'closed'] },
  { id: 'all',                   label: 'All' },
];

export const TAB_EXPLANATIONS: Partial<Record<TabId, string>> = {
  new:                   'Fresh inquiries — approve to send a booking invite, or deny.',
  approved:              'Booking link sent — waiting for the family to pick a date.',
  appointment_scheduled: 'Date selected — waiting for the appointment day.',
  appointment_confirmed: 'Appointment confirmed — family is coming in.',
  denied_closed:         'Leads that were denied or closed.',
};

export type ClosedDeniedFilter = 'all' | 'denied' | 'closed';

export function hasPastAppointment(lead: EnrollmentLead, todayKey: string): boolean {
  const date = getLeadPrimaryDate(lead);
  return date !== null && date < todayKey;
}

export function filterLeads(
  leads: EnrollmentLead[],
  tabId: TabId,
  search: string,
  closedDeniedFilter: ClosedDeniedFilter
): EnrollmentLead[] {
  let result: EnrollmentLead[];

  if (tabId === 'denied_closed') {
    switch (closedDeniedFilter) {
      case 'denied':
        result = leads.filter(l => l.status === 'denied');
        break;
      case 'closed':
        result = leads.filter(l => l.status === 'closed');
        break;
      default:
        result = leads.filter(l => l.status === 'denied' || l.status === 'closed');
    }
  } else {
    const tab = TABS.find(t => t.id === tabId)!;
    result = tab.statuses
      ? leads.filter(l => tab.statuses!.includes(l.status))
      : leads;
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(l =>
      l.parent_name.toLowerCase().includes(q) ||
      l.parent_email.toLowerCase().includes(q) ||
      (l.student_name?.toLowerCase().includes(q) ?? false) ||
      (l.children?.some(c => c.name.toLowerCase().includes(q)) ?? false)
    );
  }
  return result;
}

// ─── Status display ────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<EnrollmentLead['status'], string> = {
  new:                   'New',
  approved:              'Approved',
  appointment_scheduled: 'Scheduled',
  appointment_confirmed: 'Confirmed',
  denied:                'Denied',
  enrolled:              'Enrolled',
  closed:                'Closed',
};

export const BADGE_STYLES: Record<EnrollmentLead['status'], string> = {
  new:                   'bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]',
  approved:              'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
  appointment_scheduled: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
  appointment_confirmed: 'bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]',
  denied:                'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]',
  enrolled:              'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
  closed:                'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]',
};

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Calendar view helpers ─────────────────────────────────────────────────

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getLeadPrimaryDate(lead: EnrollmentLead): string | null {
  const programDates = lead.programBookings
    ?.filter(b => b.appointment_date)
    .map(b => b.appointment_date as string)
    .sort() ?? []
  return programDates[0] ?? lead.appointment_date ?? null
}

export function getLeadPrimaryTime(lead: EnrollmentLead): string | null {
  if (lead.programBookings?.length) {
    const withTime = lead.programBookings.filter(b => b.appointment_date && b.appointment_time)
    if (withTime.length) {
      const sorted = [...withTime].sort((a, b) =>
        (a.appointment_date! + a.appointment_time!).localeCompare(b.appointment_date! + b.appointment_time!)
      )
      return sorted[0].appointment_time
    }
  }
  return lead.appointment_time ?? null
}

export function formatTimeShort(timeStr: string): string {
  return new Date('1970-01-01T' + timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

export function formatGroupHeader(dateKey: string) {
  const today = new Date()
  const todayKey = toLocalDateKey(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowKey = toLocalDateKey(tomorrow)
  const d = new Date(dateKey + 'T12:00:00')
  return {
    label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    isToday: dateKey === todayKey,
    isTomorrow: dateKey === tomorrowKey,
  }
}

export function getMondayOfWeek(offset: number): Date {
  const today = new Date()
  const day = today.getDay() // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function formatWeekRange(monday: Date): string {
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const monLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const friLabel =
    monday.getMonth() === friday.getMonth()
      ? String(friday.getDate())
      : friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${monLabel} – ${friLabel}`
}

export function findNearestWeekOffset(appointmentDates: string[]): number | null {
  if (!appointmentDates.length) return null
  const dateSet = new Set(appointmentDates)
  // Prefer upcoming weeks first (current through +7), then fall back to recent past (-1 through -4)
  const offsets = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4]
  for (const i of offsets) {
    const monday = getMondayOfWeek(i)
    for (let d = 0; d < 5; d++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + d)
      if (dateSet.has(toLocalDateKey(day))) return i
    }
  }
  return null
}
