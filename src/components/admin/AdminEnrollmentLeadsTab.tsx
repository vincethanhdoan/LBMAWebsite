import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Mail, Phone, User, Calendar, Plus, Search, MoreVertical, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { edgeFunctionUserAuthHeaders, supabase } from '../../lib/supabase/client';
import { getEnrollmentLeads } from '../../lib/supabase/queries';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { updateLeadStatus, updateLeadAdminNotes, dismissLeadSilently, deleteEnrollmentLead } from '../../lib/supabase/mutations';
import type { EnrollmentLead, EnrollmentLeadProgramBooking } from '../../lib/types';
import { DenyModal } from './DenyModal';
import { PickDateModal } from './PickDateModal';
import { NewLeadModal } from './NewLeadModal';

// ─── Program booking helpers ───────────────────────────────────────────────

const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
}

const PROGRAM_BADGE_STYLES: Record<string, string> = {
  little_dragons: 'bg-purple-100 text-purple-700',
  youth: 'bg-blue-100 text-blue-700',
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

function computeLeadStatus(programBookings: EnrollmentLeadProgramBooking[]): EnrollmentLead['status'] {
  if (!programBookings?.length) return 'new'
  const statuses = programBookings.map(b => b.status)
  if (statuses.every(s => s === 'confirmed')) return 'appointment_confirmed'
  if (statuses.some(s => s === 'scheduled' || s === 'confirmed')) return 'appointment_scheduled'
  return 'approved'
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

type ClosedDeniedFilter = 'all' | 'denied' | 'closed' | 'deleted';

function tabCount(leads: EnrollmentLead[], tab: (typeof TABS)[number]): number {
  if (!tab.statuses) return leads.filter(l => !l.deleted_at).length;
  if (tab.id === 'denied_closed') {
    return leads.filter(l =>
      (tab.statuses!.includes(l.status) && !l.deleted_at) || !!l.deleted_at
    ).length;
  }
  return leads.filter(l => tab.statuses!.includes(l.status) && !l.deleted_at).length;
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
        result = leads.filter(l => l.status === 'denied' && !l.deleted_at);
        break;
      case 'closed':
        result = leads.filter(l => l.status === 'closed' && !l.deleted_at);
        break;
      case 'deleted':
        result = leads.filter(l => !!l.deleted_at);
        break;
      default:
        result = leads.filter(l =>
          ((l.status === 'denied' || l.status === 'closed') && !l.deleted_at) || !!l.deleted_at
        );
    }
  } else {
    const tab = TABS.find(t => t.id === tabId)!;
    result = tab.statuses
      ? leads.filter(l => tab.statuses!.includes(l.status) && !l.deleted_at)
      : leads.filter(l => !l.deleted_at);
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

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminEnrollmentLeadsTab() {
  const [leads, setLeads] = useState<EnrollmentLead[]>([]);
  const [now] = useState(Date.now);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await getEnrollmentLeads();
      setLeads(data);
      setNotesDraft(Object.fromEntries(data.map(l => [l.lead_id, l.admin_notes ?? ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(lead: EnrollmentLead) {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
    const { error } = await supabase.functions.invoke('approve-enrollment-lead', {
      body: { leadId: lead.lead_id },
      headers: fnHeaders,
    });
    if (error) { toast.error('Failed to send approval'); return; }
    setLeads(prev => prev.map(l => l.lead_id === lead.lead_id ? { ...l, status: 'approved' as const } : l));
    toast.success('Approval sent');
  }

  async function handleResendBookingLink(lead: EnrollmentLead) {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
    const { error } = await supabase.functions.invoke('resend-booking-link', {
      body: { leadId: lead.lead_id },
      headers: fnHeaders,
    });
    if (error) { toast.error('Failed to resend booking link'); return; }
    toast.success('Booking link resent');
  }

  async function handleDenyConfirm(leadId: string, message: string) {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { toast.error('Session expired. Please sign in again.'); return; }
    const { error } = await supabase.functions.invoke('deny-enrollment-lead', {
      body: { leadId, message },
      headers: fnHeaders,
    });
    if (error) { toast.error('Failed to send denial'); return; }
    setLeads(prev => prev.map(l => l.lead_id === leadId ? { ...l, status: 'denied' as const } : l));
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

    await load();
    setPickDateTarget(null);
    toast.success('Appointment(s) booked');
  }

  async function handleStatusChange(leadId: string, status: EnrollmentLead['status']) {
    setUpdatingId(leadId);
    try {
      await updateLeadStatus(leadId, status);
      setLeads(prev => prev.map(l => l.lead_id === leadId ? { ...l, status } : l));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleNotesSave(leadId: string) {
    try {
      await updateLeadAdminNotes(leadId, notesDraft[leadId] ?? '');
      setNotesSaved(s => ({ ...s, [leadId]: true }));
      setTimeout(() => setNotesSaved(s => ({ ...s, [leadId]: false })), 2000);
    } catch {
      // silent — notes are best-effort
    }
    setNotesExpanded(e => ({ ...e, [leadId]: false }));
  }

  async function handleDismissSilently(lead: EnrollmentLead) {
    try {
      await dismissLeadSilently(lead.lead_id);
      setLeads(prev => prev.map(l =>
        l.lead_id === lead.lead_id ? { ...l, status: 'denied' as const, denied_at: new Date().toISOString() } : l
      ));
      toast.success('Lead dismissed');
    } catch {
      toast.error('Failed to dismiss lead');
    }
    setPendingAction(null);
  }

  async function handleDeleteLead(lead: EnrollmentLead) {
    try {
      await deleteEnrollmentLead(lead.lead_id);
      setLeads(prev => prev.map(l =>
        l.lead_id === lead.lead_id ? { ...l, deleted_at: new Date().toISOString() } : l
      ));
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
    setPendingAction(null);
  }

  const visibleLeads = filterLeads(leads, activeTab, search, closedDeniedFilter);
  const newCount = leads.filter(l => l.status === 'new').length;
  const approvedCount = leads.filter(l => l.status === 'approved').length;
  const scheduledCount = leads.filter(l => l.status === 'appointment_scheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-3" />
        Loading leads…
      </div>
    );
  }

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
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(''); setClosedDeniedFilter('all'); }}
                className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary font-semibold -mb-px'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

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
          {(['all', 'denied', 'closed', 'deleted'] as ClosedDeniedFilter[]).map(f => (
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

      {visibleLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search.trim() ? 'No leads match your search.' : 'No leads in this status.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLeads.map(lead => (
            <div
              key={lead.lead_id}
              className={`bg-card rounded-lg border overflow-hidden ${
                lead.status === 'new' && !lead.deleted_at ? 'border-primary/25' : 'border-border'
              }`}
            >
              <div className="p-4 space-y-3">

                {/* Row 1: name + aging + badge + kebab */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-base">{lead.parent_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeTab === 'new' && <AgingIndicator createdAt={lead.created_at} now={now} />}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      lead.deleted_at
                        ? 'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]'
                        : BADGE_STYLES[lead.status]
                    }`}>
                      {lead.deleted_at ? 'Deleted' : STATUS_LABELS[lead.status]}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          disabled={lead.status === 'denied' || !!lead.deleted_at}
                          onSelect={() => setPendingAction({ type: 'dismiss', lead })}
                        >
                          Dismiss silently
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          disabled={!!lead.deleted_at}
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

                {/* Approval timestamp + appointment date */}
                {(lead.approval_email_sent_at || ((lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && lead.appointment_date)) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {lead.approval_email_sent_at && (
                      <span>Invite sent {formatDate(lead.approval_email_sent_at)}</span>
                    )}
                    {(lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && lead.appointment_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        })}
                        {lead.appointment_time && ` at ${new Date('1970-01-01T' + lead.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    )}
                  </div>
                )}

                {/* Message */}
                {lead.message && (
                  <div>
                    <div className={`text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 leading-relaxed border-l-2 border-primary/20 ${!messageExpanded[lead.lead_id] && lead.message.length > 150 ? 'line-clamp-3' : ''}`}>
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

                {/* Actions — denied leads are terminal; no actions shown */}
                {!lead.deleted_at && (
                  <div className="flex flex-wrap gap-2">
                    {lead.status === 'new' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(lead)}>
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
                        <Button size="sm" variant="outline" onClick={() => handleResendBookingLink(lead)}>
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
                        <Button size="sm" variant="outline" onClick={() => handleResendBookingLink(lead)}>
                          Resend Invites
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPickDateTarget(lead)}>
                          Pick New Date
                        </Button>
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
                )}

              </div>
            </div>
          ))}
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
                  : `This will hide ${pendingAction.lead.parent_name}'s lead from all views. It can still be found in the Closed / Denied tab under "Deleted".`}
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
            setLeads(prev => [lead, ...prev]);
            setNotesDraft(d => ({ ...d, [lead.lead_id]: lead.admin_notes ?? '' }));
            setShowNewLeadModal(false);
          }}
          onCancel={() => setShowNewLeadModal(false)}
        />
      )}
    </div>
  );
}
