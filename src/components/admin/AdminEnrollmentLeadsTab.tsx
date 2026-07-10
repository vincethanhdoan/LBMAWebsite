import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Mail, Phone, Calendar, Plus, Search, MoreVertical, Check, Pencil, ChevronLeft, ChevronRight, Clock, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { edgeFunctionUserAuthHeaders, supabase } from '../../lib/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import type { EnrollmentLead, EnrollmentLeadReminderNotification } from '../../lib/types';
import { useEnrollmentLeads, useUpdateLeadStatus, useUpdateLeadNotes, useDismissLead, useDeleteLead } from '../../lib/hooks/leads';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { DenyModal } from './DenyModal';
import { PickDateModal } from './PickDateModal';
import { NewLeadModal } from './NewLeadModal';

// ─── Program booking helpers ───────────────────────────────────────────────

const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
}

const PROGRAM_BADGE_STYLES: Record<string, string> = {
  little_dragons: 'bg-amber-50 text-amber-700 border border-amber-200',
  youth: 'bg-teal-50 text-teal-700 border border-teal-200',
}

function formatProgramBookingStatus(booking: { status: string; appointment_date: string | null; appointment_time: string | null }): string {
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


function ReminderStatusBadge({ notification }: { notification: EnrollmentLeadReminderNotification }) {
  if (notification.status === 'sent') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]">
        <Check className="w-3 h-3 flex-shrink-0" />
        <span>Confirmation sent · {formatDate(notification.created_at)}</span>
      </div>
    )
  }
  if (notification.status === 'queued') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
        <Clock className="w-3 h-3 flex-shrink-0" />
        <span>Confirmation queued</span>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span>Confirmation email failed</span>
    </div>
  )
}

function ChildrenSection({ lead }: { lead: EnrollmentLead }) {
  const hasChildren = lead.children && lead.children.length > 0
  const hasBookings = lead.programBookings && lead.programBookings.length > 0

  if (!hasChildren && !lead.student_name) return null

  if (!hasChildren) {
    return (
      <p className="text-sm text-muted-foreground">
        [legacy] {lead.student_name}{lead.student_age ? `, age ${lead.student_age}` : ''}
      </p>
    )
  }

  if (!hasBookings) {
    return (
      <div className="flex flex-col gap-1">
        {lead.children.map(c => (
          <div key={c.child_id} className="flex items-center gap-2 text-sm">
            <span>{c.name}</span>
            <span className="text-muted-foreground">age {c.age}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROGRAM_BADGE_STYLES[c.program_type]}`}>
              {PROGRAM_LABELS[c.program_type]}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {lead.programBookings.map(booking => {
        const groupChildren = lead.children.filter(c => c.program_type === booking.program_type)
        return (
          <div key={booking.booking_id}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROGRAM_BADGE_STYLES[booking.program_type]}`}>
                {PROGRAM_LABELS[booking.program_type]}
              </span>
              <span className={`text-xs ${
                booking.status === 'confirmed' ? 'text-green-600 font-medium'
                : booking.status === 'scheduled' ? 'text-green-600'
                : 'text-muted-foreground'
              }`}>
                {formatProgramBookingStatus(booking)}
              </span>
            </div>
            <div className="pl-2 mt-1 flex flex-col gap-0.5">
              {groupChildren.map(c => (
                <span key={c.child_id} className="text-sm text-muted-foreground">
                  {c.name} · age {c.age}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab config ────────────────────────────────────────────────────────────

type TabId =
  | 'new'
  | 'approved'
  | 'appointment_scheduled'
  | 'appointment_confirmed'
  | 'denied_closed'
  | 'all';

const TABS: { id: TabId; label: string; statuses?: EnrollmentLead['status'][] }[] = [
  { id: 'new',                   label: 'New',             statuses: ['new'] },
  { id: 'approved',              label: 'Approved',        statuses: ['approved'] },
  { id: 'appointment_scheduled', label: 'Scheduled',       statuses: ['appointment_scheduled'] },
  { id: 'appointment_confirmed', label: 'Confirmed',       statuses: ['appointment_confirmed'] },
  { id: 'denied_closed',         label: 'Closed / Denied', statuses: ['denied', 'closed'] },
  { id: 'all',                   label: 'All' },
];

const TAB_EXPLANATIONS: Partial<Record<TabId, string>> = {
  new:                   'Fresh inquiries — approve to send a booking invite, or deny.',
  approved:              'Booking link sent — waiting for the family to pick a date.',
  appointment_scheduled: 'Date selected — waiting for the appointment day.',
  appointment_confirmed: 'Appointment confirmed — family is coming in.',
  denied_closed:         'Leads that were denied or closed.',
};

type ClosedDeniedFilter = 'all' | 'denied' | 'closed';

function hasPastAppointment(lead: EnrollmentLead, todayKey: string): boolean {
  const date = getLeadPrimaryDate(lead);
  return date !== null && date < todayKey;
}

function tabCount(leads: EnrollmentLead[], tab: (typeof TABS)[number], todayKey: string): number {
  if (!tab.statuses) return leads.length;
  let matching = leads.filter(l => tab.statuses!.includes(l.status));
  if (tab.id === 'appointment_scheduled' || tab.id === 'appointment_confirmed') {
    matching = matching.filter(l => !hasPastAppointment(l, todayKey));
  }
  return matching.length;
}

function filterLeads(
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

const STATUS_LABELS: Record<EnrollmentLead['status'], string> = {
  new:                   'New',
  approved:              'Approved',
  appointment_scheduled: 'Scheduled',
  appointment_confirmed: 'Confirmed',
  denied:                'Denied',
  enrolled:              'Enrolled',
  closed:                'Closed',
};

const BADGE_STYLES: Record<EnrollmentLead['status'], string> = {
  new:                   'bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]',
  approved:              'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
  appointment_scheduled: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
  appointment_confirmed: 'bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]',
  denied:                'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]',
  enrolled:              'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]',
  closed:                'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]',
};

function AgingIndicator({ createdAt, now }: { createdAt: string; now: number }) {
  const days = Math.floor((now - new Date(createdAt).getTime()) / 86_400_000);
  const label = days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
  return (
    <span className={`text-xs ${days >= 7 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
      {label}
    </span>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Calendar view helpers ─────────────────────────────────────────────────

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getLeadPrimaryDate(lead: EnrollmentLead): string | null {
  const programDates = lead.programBookings
    ?.filter(b => b.appointment_date)
    .map(b => b.appointment_date as string)
    .sort() ?? []
  return programDates[0] ?? lead.appointment_date ?? null
}

function getLeadPrimaryTime(lead: EnrollmentLead): string | null {
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

function formatTimeShort(timeStr: string): string {
  return new Date('1970-01-01T' + timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatGroupHeader(dateKey: string) {
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

function getMondayOfWeek(offset: number): Date {
  const today = new Date()
  const day = today.getDay() // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatWeekRange(monday: Date): string {
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const monLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const friLabel =
    monday.getMonth() === friday.getMonth()
      ? String(friday.getDate())
      : friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${monLabel} – ${friLabel}`
}

function findNearestWeekOffset(appointmentDates: string[]): number | null {
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

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminEnrollmentLeadsTab() {
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading: loading } = useEnrollmentLeads();
  const updateStatus = useUpdateLeadStatus();
  const updateNotes = useUpdateLeadNotes();
  const dismissLead = useDismissLead();
  const deleteLead = useDeleteLead();
  const [now] = useState(Date.now);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('new');
  const [search, setSearch] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [denyTarget, setDenyTarget] = useState<EnrollmentLead | null>(null);
  const [pickDateTarget, setPickDateTarget] = useState<EnrollmentLead | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [closedDeniedFilter, setClosedDeniedFilter] = useState<ClosedDeniedFilter>('all');
  const [pendingAction, setPendingAction] = useState<{ type: 'dismiss' | 'delete'; lead: EnrollmentLead } | null>(null);
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({});
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({});
  const [messageExpanded, setMessageExpanded] = useState<Record<string, boolean>>({});
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);

  useEffect(() => {
    setNotesDraft(d => {
      const next: Record<string, string> = {};
      for (const l of leads) {
        next[l.lead_id] = notesExpanded[l.lead_id] && l.lead_id in d
          ? d[l.lead_id]
          : (l.admin_notes ?? '');
      }
      return next;
    });
  }, [leads, notesExpanded]);

  async function handleApprove(lead: EnrollmentLead) {
    if (actionLeadId) return;
    setActionLeadId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
      const { error } = await supabase.functions.invoke('approve-enrollment-lead', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) { toast.error('Failed to send approval'); return; }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast.success('Approval sent');
    } finally {
      setActionLeadId(null);
    }
  }

  async function handleResendBookingLink(lead: EnrollmentLead) {
    if (actionLeadId) return;
    setActionLeadId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
      const { error } = await supabase.functions.invoke('resend-booking-link', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) { toast.error('Failed to resend booking link'); return; }
      toast.success('Booking link resent');
    } finally {
      setActionLeadId(null);
    }
  }

  async function handleDenyConfirm(leadId: string, message: string) {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
    const { error } = await supabase.functions.invoke('deny-enrollment-lead', {
      body: { leadId, message },
      headers: fnHeaders,
    });
    if (error) { toast.error('Failed to send denial'); return; }
    queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    setDenyTarget(null);
  }

  async function handleBookingConfirm(
    bookings: Array<{ programBookingId: string; slotId: string; appointmentDate: string }>
  ) {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }

    for (const b of bookings) {
      const { data, error } = await supabase.functions.invoke('admin-book-appointment', {
        body: { programBookingId: b.programBookingId, slotId: b.slotId, appointmentDate: b.appointmentDate },
        headers: fnHeaders,
      });
      if (error || !data) { toast.error('Failed to book appointment'); return; }
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    setPickDateTarget(null);
    toast.success('Appointment(s) booked');
  }

  async function handleSendReminder(lead: EnrollmentLead) {
    setSendingReminderId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
      const { error } = await supabase.functions.invoke('send-appointment-reminder', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 409) {
          toast.error('Confirmation email already sent or queued');
        } else {
          toast.error('Failed to send confirmation email');
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast.success('Confirmation email sent');
    } finally {
      setSendingReminderId(null);
    }
  }

  async function handleStatusChange(leadId: string, status: EnrollmentLead['status']) {
    setUpdatingId(leadId);
    try {
      await updateStatus.mutateAsync({ leadId, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleNotesSave(leadId: string) {
    try {
      await updateNotes.mutateAsync({ leadId, notes: notesDraft[leadId] ?? '' });
      setNotesSaved(s => ({ ...s, [leadId]: true }));
      setTimeout(() => setNotesSaved(s => ({ ...s, [leadId]: false })), 2000);
    } catch {
      // silent — notes are best-effort
    }
    setNotesExpanded(e => ({ ...e, [leadId]: false }));
  }

  async function handleDismissSilently(lead: EnrollmentLead) {
    try {
      await dismissLead.mutateAsync(lead.lead_id);
      toast.success('Lead dismissed');
    } catch {
      toast.error('Failed to dismiss lead');
    }
    setPendingAction(null);
  }

  async function handleDeleteLead(lead: EnrollmentLead) {
    try {
      await deleteLead.mutateAsync(lead.lead_id);
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
    setPendingAction(null);
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const visibleLeads = filterLeads(leads, activeTab, search, closedDeniedFilter);
  const todayKey = toLocalDateKey(new Date());
  const newCount = leads.filter(l => l.status === 'new').length;
  const approvedCount = leads.filter(l => l.status === 'approved').length;
  const scheduledCount = leads.filter(
    l => l.status === 'appointment_scheduled' && !hasPastAppointment(l, todayKey)
  ).length;

  const isCalendarTab = activeTab === 'appointment_scheduled' || activeTab === 'appointment_confirmed';

  // Count appointments per date (unfiltered by search, for the week strip)
  const appointmentCountsByDate: Record<string, number> = {};
  if (isCalendarTab) {
    const tabObj = TABS.find(t => t.id === activeTab);
    for (const lead of leads) {
      if (!tabObj?.statuses?.includes(lead.status)) continue;
      const date = getLeadPrimaryDate(lead);
      if (date) appointmentCountsByDate[date] = (appointmentCountsByDate[date] ?? 0) + 1;
    }
  }

  // 5-day Mon–Fri strip for the current weekOffset
  const weekStripDays = (() => {
    const monday = getMondayOfWeek(weekOffset)
    const todayKey = toLocalDateKey(new Date())
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateKey = toLocalDateKey(d)
      return {
        dateKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        count: appointmentCountsByDate[dateKey] ?? 0,
        isToday: dateKey === todayKey,
      }
    })
  })()

  // Group visible leads by appointment date for calendar tabs
  const dateGroups: Array<{ dateKey: string; leads: EnrollmentLead[] }> = [];
  if (isCalendarTab) {
    const weekDateSet = new Set(weekStripDays.map(d => d.dateKey))
    const toGroup = selectedWeekDate
      ? visibleLeads.filter(l => getLeadPrimaryDate(l) === selectedWeekDate)
      : visibleLeads.filter(l => {
          const date = getLeadPrimaryDate(l)
          return date !== null && weekDateSet.has(date)
        })
    const groups: Record<string, EnrollmentLead[]> = {};
    const noDates: EnrollmentLead[] = [];
    for (const lead of toGroup) {
      const date = getLeadPrimaryDate(lead);
      if (date) {
        (groups[date] = groups[date] ?? []).push(lead);
      } else {
        noDates.push(lead);
      }
    }
    Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dateKey, groupLeads]) => dateGroups.push({ dateKey, leads: groupLeads }));
    if (noDates.length) dateGroups.push({ dateKey: '', leads: noDates });
  }

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-3" />
        Loading leads…
      </div>
    );
  }

  // ─── Lead card renderer ────────────────────────────────────────────────────

  function renderLeadCard(lead: EnrollmentLead) {
    const primaryTime = getLeadPrimaryTime(lead);

    return (
      <div
        key={lead.lead_id}
        className={`bg-card rounded-lg border overflow-hidden ${
          lead.status === 'new' ? 'border-primary/25' : 'border-border'
        }`}
      >
        <div className="p-4 space-y-3">

          {/* Row 1: name + time (for calendar tabs) or aging + badge + kebab */}
          <div className="flex items-start justify-between gap-3">
            <span className="font-semibold text-base leading-tight">{lead.parent_name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isCalendarTab && primaryTime ? (
                <div className="text-right">
                  <div className="text-base font-bold text-primary leading-tight tabular-nums">
                    {formatTimeShort(primaryTime)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mt-0.5">
                    {STATUS_LABELS[lead.status]}
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'new' && <AgingIndicator createdAt={lead.created_at} now={now} />}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    disabled={lead.status === 'denied'}
                    onSelect={() => setPendingAction({ type: 'dismiss', lead })}
                  >
                    Dismiss silently
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => setPendingAction({ type: 'delete', lead })}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Row 2: contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a
              href={`mailto:${lead.parent_email}`}
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <Mail className="w-3.5 h-3.5" />
              {lead.parent_email}
            </a>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Phone className="w-3.5 h-3.5" />
                {lead.phone}
              </a>
            )}
          </div>

          {/* Children / program bookings */}
          {(lead.children?.length > 0 || lead.student_name) && (
            <div className="border-t border-border/50 pt-3">
              <ChildrenSection lead={lead} />
            </div>
          )}

          {/* Approval timestamp — hidden for calendar tabs since date is shown in the group header */}
          {!isCalendarTab && lead.approval_email_sent_at && (
            <div className="text-xs text-muted-foreground">
              Invite sent {formatDate(lead.approval_email_sent_at)}
            </div>
          )}

          {/* Confirmation email status */}
          {(lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && lead.reminderNotification && lead.reminderNotification.status !== 'failed' && (
            <ReminderStatusBadge notification={lead.reminderNotification} />
          )}

          {/* Appointment date — shown on non-calendar tabs only */}
          {!isCalendarTab && (lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && lead.appointment_date && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
              {lead.appointment_time && ` at ${new Date('1970-01-01T' + lead.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </div>
          )}

          {/* Message */}
          {lead.message && (
            <div>
              <div className={`text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 leading-relaxed border border-border/50 ${!messageExpanded[lead.lead_id] && lead.message.length > 150 ? 'line-clamp-3' : ''}`}>
                {lead.message}
              </div>
              {lead.message.length > 150 && (
                <button
                  onClick={() => setMessageExpanded(e => ({ ...e, [lead.lead_id]: !e[lead.lead_id] }))}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1 px-1 transition-colors"
                >
                  {messageExpanded[lead.lead_id] ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Admin notes */}
          {notesExpanded[lead.lead_id] ? (
            <textarea
              autoFocus
              value={notesDraft[lead.lead_id] ?? ''}
              onChange={e => setNotesDraft(d => ({ ...d, [lead.lead_id]: e.target.value }))}
              onBlur={() => handleNotesSave(lead.lead_id)}
              rows={2}
              placeholder="Internal notes (only visible to admins)…"
              className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          ) : notesDraft[lead.lead_id]?.trim() ? (
            <div className="flex items-start gap-2 group">
              <p className="flex-1 text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 leading-relaxed border border-border/50">
                {notesDraft[lead.lead_id]}
              </p>
              <div className="flex items-center gap-0.5 flex-shrink-0 pt-1.5">
                {notesSaved[lead.lead_id] && <Check className="w-3.5 h-3.5 text-green-600" />}
                <button
                  onClick={() => setNotesExpanded(e => ({ ...e, [lead.lead_id]: true }))}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNotesExpanded(e => ({ ...e, [lead.lead_id]: true }))}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add note
            </button>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
              {lead.status === 'new' && (
                <>
                  <Button size="sm" onClick={() => handleApprove(lead)} disabled={actionLeadId === lead.lead_id}>
                    Approve &amp; Send Invites
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => setDenyTarget(lead)}
                  >
                    Deny
                  </Button>
                </>
              )}
              {lead.status === 'approved' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleResendBookingLink(lead)} disabled={actionLeadId === lead.lead_id}>
                    Resend Invites
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPickDateTarget(lead)}>
                    Pick Date for Them
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => setDenyTarget(lead)}
                  >
                    Deny
                  </Button>
                </>
              )}
              {(lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleResendBookingLink(lead)} disabled={actionLeadId === lead.lead_id}>
                    Resend Invites
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPickDateTarget(lead)}>
                    Pick New Date
                  </Button>
                  {(!lead.reminderNotification || lead.reminderNotification.status === 'failed') && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingReminderId === lead.lead_id}
                      onClick={() => handleSendReminder(lead)}
                      className="gap-1.5"
                    >
                      {sendingReminderId === lead.lead_id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
                      ) : lead.reminderNotification?.status === 'failed' ? (
                        <><AlertCircle className="w-3.5 h-3.5 text-[#A01F23]" />Retry Confirmation</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" />Send Confirmation</>
                      )}
                    </Button>
                  )}
                </>
              )}
              {(lead.status === 'enrolled' || lead.status === 'closed') && (
                <Select
                  value={lead.status}
                  onValueChange={val => handleStatusChange(lead.lead_id, val as EnrollmentLead['status'])}
                  disabled={updatingId === lead.lead_id}
                >
                  <SelectTrigger className="w-40 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Enrollment Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {newCount > 0 && <span className="text-primary font-medium">{newCount} new · </span>}
            {approvedCount > 0 && <span>{approvedCount} approved · </span>}
            {scheduledCount > 0 && <span>{scheduledCount} scheduled · </span>}
            <span>{leads.length} total</span>
          </p>
        </div>
        <Button onClick={() => setShowNewLeadModal(true)} variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Lead
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-2">{error}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const count = tabCount(leads, tab, todayKey);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch('');
                  setClosedDeniedFilter('all');
                  setSelectedWeekDate(null);
                  if (tab.id === 'appointment_scheduled' || tab.id === 'appointment_confirmed') {
                    const tabStatuses = TABS.find(t => t.id === tab.id)!.statuses!;
                    const apptDates = leads
                      .filter(l => tabStatuses.includes(l.status))
                      .map(l => getLeadPrimaryDate(l))
                      .filter((d): d is string => d !== null);
                    setWeekOffset(findNearestWeekOffset(apptDates) ?? 0);
                  } else {
                    setWeekOffset(0);
                  }
                }}
                className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'border-primary text-primary font-semibold -mb-px'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab explanation */}
      {TAB_EXPLANATIONS[activeTab] && (
        <p className="text-xs text-muted-foreground px-1">{TAB_EXPLANATIONS[activeTab]}</p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or student…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Sub-filter for Closed / Denied tab */}
      {activeTab === 'denied_closed' && (
        <div className="flex gap-1.5">
          {(['all', 'denied', 'closed'] as ClosedDeniedFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setClosedDeniedFilter(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors capitalize ${
                closedDeniedFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Week strip — calendar tabs only */}
      {isCalendarTab && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setWeekOffset(w => w - 1); setSelectedWeekDate(null); }}
              aria-label="Previous week"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground/80">
              {formatWeekRange(getMondayOfWeek(weekOffset))}
            </span>
            <button
              onClick={() => { setWeekOffset(w => w + 1); setSelectedWeekDate(null); }}
              aria-label="Next week"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1">
            {weekStripDays.map(day => {
              const isSelected = selectedWeekDate === day.dateKey;
              const hasApts = day.count > 0;
              return (
                <button
                  key={day.dateKey}
                  onClick={() => setSelectedWeekDate(isSelected ? null : day.dateKey)}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg flex-1 min-w-0 transition-colors border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : day.isToday
                      ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-widest ${
                    isSelected ? 'text-primary-foreground/75' : 'text-muted-foreground'
                  }`}>
                    {day.dayName}
                  </span>
                  <span className={`text-lg font-bold leading-tight ${
                    isSelected ? 'text-primary-foreground' : day.isToday ? 'text-primary' : 'text-foreground'
                  }`}>
                    {day.dayNum}
                  </span>
                  <div className="flex gap-0.5 mt-1 min-h-[6px] items-center">
                    {Array.from({ length: Math.min(day.count, 3) }, (_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-primary-foreground/60' : 'bg-primary'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold mt-0.5 ${
                    isSelected ? 'text-primary-foreground/75' : hasApts ? 'text-primary' : 'text-muted-foreground/35'
                  }`}>
                    {hasApts ? day.count : '·'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lead list */}
      {visibleLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search.trim() ? 'No leads match your search.' : 'No leads in this status.'}
        </div>
      ) : isCalendarTab ? (
        /* ── Date-grouped calendar view ── */
        dateGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {selectedWeekDate ? 'No appointments on this date.' : 'No appointments this week.'}
          </div>
        ) : (
          <div className="space-y-6">
            {dateGroups.map(({ dateKey, leads: groupLeads }) => {
              if (!dateKey) {
                return (
                  <div key="no-date">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">No date set</span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-semibold">{groupLeads.length}</span>
                    </div>
                    <div className="space-y-2">{groupLeads.map(renderLeadCard)}</div>
                  </div>
                );
              }
              const { label, isToday, isTomorrow } = formatGroupHeader(dateKey);
              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-sm font-bold tracking-wide uppercase ${isToday ? 'text-primary' : 'text-foreground/80'}`}>
                      {label}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground tracking-wide uppercase">
                        Today
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
                        Tomorrow
                      </span>
                    )}
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-semibold flex-shrink-0">
                      {groupLeads.length} {groupLeads.length === 1 ? 'appointment' : 'appointments'}
                    </span>
                  </div>
                  <div className="space-y-2">{groupLeads.map(renderLeadCard)}</div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── Flat list for all other tabs ── */
        <div className="space-y-3">
          {visibleLeads.map(renderLeadCard)}
        </div>
      )}

      {/* Modals */}
      {pendingAction && (
        <AlertDialog open onOpenChange={open => { if (!open) setPendingAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction.type === 'dismiss' ? 'Dismiss lead?' : 'Delete lead?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction.type === 'dismiss'
                  ? `This will mark ${pendingAction.lead.parent_name}'s lead as denied without notifying them.`
                  : `This will permanently delete ${pendingAction.lead.parent_name}'s lead. This cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() =>
                  pendingAction.type === 'dismiss'
                    ? handleDismissSilently(pendingAction.lead)
                    : handleDeleteLead(pendingAction.lead)
                }
              >
                {pendingAction.type === 'dismiss' ? 'Dismiss' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {denyTarget && (
        <DenyModal lead={denyTarget} onConfirm={handleDenyConfirm} onCancel={() => setDenyTarget(null)} />
      )}
      {pickDateTarget && (
        <PickDateModal lead={pickDateTarget} onConfirm={handleBookingConfirm} onCancel={() => setPickDateTarget(null)} />
      )}
      {showNewLeadModal && (
        <NewLeadModal
          onSuccess={lead => {
            queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
            setNotesDraft(d => ({ ...d, [lead.lead_id]: lead.admin_notes ?? '' }));
            setShowNewLeadModal(false);
          }}
          onCancel={() => setShowNewLeadModal(false)}
        />
      )}
    </div>
  );
}
