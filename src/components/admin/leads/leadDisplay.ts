import type { EnrollmentLead, EnrollmentLeadNotification } from '../../../lib/types';
import type { TerminalLeadFilter } from '../../../lib/supabase/queries';

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
  | 'action_needed'
  | 'new'
  | 'approved'
  | 'appointment_scheduled'
  | 'appointment_confirmed'
  | 'history'
  | 'all';

export const TABS: { id: TabId; label: string; statuses?: EnrollmentLead['status'][] }[] = [
  { id: 'action_needed',         label: 'Action Needed' },
  { id: 'new',                   label: 'New',       statuses: ['new'] },
  { id: 'approved',              label: 'Approved',  statuses: ['approved'] },
  { id: 'appointment_scheduled', label: 'Scheduled', statuses: ['appointment_scheduled'] },
  { id: 'appointment_confirmed', label: 'Confirmed', statuses: ['appointment_confirmed'] },
  { id: 'history',               label: 'History' },
  { id: 'all',                   label: 'All' },
];

export const TAB_EXPLANATIONS: Partial<Record<TabId, string>> = {
  action_needed:         'Everything that needs a decision or a nudge.',
  new:                   'Fresh inquiries — approve to send a booking invite, or deny.',
  approved:              'Booking link sent — waiting for the family to pick a date.',
  appointment_scheduled: 'Date selected — waiting for the appointment day.',
  appointment_confirmed: 'Appointment confirmed — family is coming in.',
  history:               'Enrolled, closed, denied, and archived leads.',
};

export type HistoryFilter = TerminalLeadFilter;

export const HISTORY_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all_terminal', label: 'All' },
  { id: 'enrolled',     label: 'Enrolled' },
  { id: 'closed',       label: 'Closed' },
  { id: 'denied',       label: 'Denied' },
  { id: 'archived',     label: 'Archived' },
];

export function hasPastAppointment(lead: EnrollmentLead, todayKey: string): boolean {
  const date = getLeadPrimaryDate(lead);
  return date !== null && date < todayKey;
}

export function leadMatchesSearch(lead: EnrollmentLead, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    lead.parent_name.toLowerCase().includes(q) ||
    lead.parent_email.toLowerCase().includes(q) ||
    (lead.student_name?.toLowerCase().includes(q) ?? false) ||
    (lead.children?.some(c => c.name.toLowerCase().includes(q)) ?? false)
  );
}

export function filterLeads(
  leads: EnrollmentLead[],
  tabId: TabId,
  search: string
): EnrollmentLead[] {
  const tab = TABS.find(t => t.id === tabId)!;
  const result = tab.statuses
    ? leads.filter(l => tab.statuses!.includes(l.status))
    : leads;

  return result.filter(l => leadMatchesSearch(l, search));
}

// ─── Status display ────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<EnrollmentLead['status'], string> = {
  new:                   'New',
  approved:              'Approved',
  appointment_scheduled: 'Awaiting confirmation',
  appointment_confirmed: 'Confirmed',
  denied:                'Denied',
  enrolled:              'Enrolled',
  closed:                'Closed',
};

export const BADGE_STYLES: Record<EnrollmentLead['status'], string> = {
  new:                   'bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]',
  approved:              'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
  appointment_scheduled: 'bg-amber-100 text-amber-800 border border-amber-200',
  appointment_confirmed: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
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

export function getWeekStart(offset: number): Date {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay() + offset * 7) // getDay(): 0=Sun … 6=Sat
  start.setHours(0, 0, 0, 0)
  return start
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? String(weekEnd.getDate())
      : weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function findNearestWeekOffset(appointmentDates: string[]): number | null {
  if (!appointmentDates.length) return null
  const dateSet = new Set(appointmentDates)
  // Prefer upcoming weeks first (current through +7), then fall back to recent past (-1 through -4)
  const offsets = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4]
  for (const i of offsets) {
    const weekStart = getWeekStart(i)
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      if (dateSet.has(toLocalDateKey(day))) return i
    }
  }
  return null
}
