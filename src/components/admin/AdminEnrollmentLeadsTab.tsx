import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import type { EnrollmentLead } from '../../lib/types';
import { useEnrollmentLeads, useUpdateLeadStatus, useUpdateLeadNotes, useDismissLead, useCloseLead, useArchiveLead, useRestoreLead } from '../../lib/hooks/leads';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { DenyModal } from './DenyModal';
import { PickDateModal } from './PickDateModal';
import { NewLeadModal } from './NewLeadModal';
import { LeadCard } from './leads/LeadCard';
import { LeadCalendarView } from './leads/LeadCalendarView';
import { useLeadActions } from './leads/useLeadActions';
import {
  filterLeads,
  hasPastAppointment,
  toLocalDateKey,
  getLeadPrimaryDate,
  getMondayOfWeek,
  formatWeekRange,
  findNearestWeekOffset,
  TABS,
  TAB_EXPLANATIONS,
  type TabId,
  type ClosedDeniedFilter,
} from './leads/leadDisplay';

function tabCount(leads: EnrollmentLead[], tab: (typeof TABS)[number], todayKey: string): number {
  if (!tab.statuses) return leads.length;
  let matching = leads.filter(l => tab.statuses!.includes(l.status));
  if (tab.id === 'appointment_scheduled' || tab.id === 'appointment_confirmed') {
    matching = matching.filter(l => !hasPastAppointment(l, todayKey));
  }
  return matching.length;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminEnrollmentLeadsTab() {
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading: loading } = useEnrollmentLeads();
  const updateStatus = useUpdateLeadStatus();
  const updateNotes = useUpdateLeadNotes();
  const dismissLead = useDismissLead();
  const closeLead = useCloseLead();
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const actions = useLeadActions({ onError: msg => toast.error(msg) });
  const [now] = useState(Date.now);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('new');
  const [search, setSearch] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [denyTarget, setDenyTarget] = useState<EnrollmentLead | null>(null);
  const [pickDateTargetId, setPickDateTargetId] = useState<string | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [closedDeniedFilter, setClosedDeniedFilter] = useState<ClosedDeniedFilter>('all');
  const [pendingAction, setPendingAction] = useState<{ type: 'dismiss' | 'archive'; lead: EnrollmentLead } | null>(null);
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({});
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({});
  const [messageExpanded, setMessageExpanded] = useState<Record<string, boolean>>({});
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);
  const [showPastAppointments, setShowPastAppointments] = useState(false);

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

  // Derived from the live query so the pick-date modal reflects booking status
  // after a refetch (e.g. a partial multi-program booking failure).
  const pickDateTarget = pickDateTargetId
    ? leads.find(l => l.lead_id === pickDateTargetId) ?? null
    : null;

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

  async function handleCloseLead(leadId: string) {
    setUpdatingId(leadId);
    try {
      await closeLead.mutateAsync(leadId);
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
    if (actionLeadId) return;
    setActionLeadId(lead.lead_id);
    try {
      await dismissLead.mutateAsync(lead.lead_id);
      toast.success('Lead dismissed');
    } catch {
      toast.error('Failed to dismiss lead');
    } finally {
      setActionLeadId(null);
      setPendingAction(null);
    }
  }

  async function handleArchiveLead(lead: EnrollmentLead) {
    if (actionLeadId) return;
    setActionLeadId(lead.lead_id);
    try {
      await archiveLead.mutateAsync(lead.lead_id);
      toast('Lead archived', {
        action: {
          label: 'Undo',
          onClick: () => { restoreLead.mutate(lead.lead_id, { onError: () => toast.error('Failed to restore lead') }); },
        },
      });
    } catch {
      toast.error('Failed to archive lead');
    } finally {
      setActionLeadId(null);
      setPendingAction(null);
    }
  }

  const renderCard = (lead: EnrollmentLead) => (
    <LeadCard
      key={lead.lead_id}
      lead={lead}
      now={now}
      activeTab={activeTab}
      actions={actions}
      updatingId={updatingId}
      onDeny={setDenyTarget}
      onPickDate={l => setPickDateTargetId(l.lead_id)}
      onDismiss={l => setPendingAction({ type: 'dismiss', lead: l })}
      onArchive={l => setPendingAction({ type: 'archive', lead: l })}
      onStatusChange={handleStatusChange}
      onCloseLead={handleCloseLead}
      notes={{
        draft: notesDraft[lead.lead_id] ?? '',
        expanded: notesExpanded[lead.lead_id] ?? false,
        saved: notesSaved[lead.lead_id] ?? false,
        onDraftChange: v => setNotesDraft(d => ({ ...d, [lead.lead_id]: v })),
        onToggle: () => setNotesExpanded(e => ({ ...e, [lead.lead_id]: true })),
        onSave: () => handleNotesSave(lead.lead_id),
      }}
      messageExpanded={messageExpanded[lead.lead_id] ?? false}
      onToggleMessage={() => setMessageExpanded(e => ({ ...e, [lead.lead_id]: !e[lead.lead_id] }))}
    />
  );

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
      if (hasPastAppointment(lead, todayKey)) continue;
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

  // Group visible leads by appointment date for calendar tabs. Past-appointment
  // leads are pulled into a separate follow-up section rather than the week view.
  const dateGroups: Array<{ dateKey: string; leads: EnrollmentLead[] }> = [];
  const pastDateGroups: Array<{ dateKey: string; leads: EnrollmentLead[] }> = [];
  if (isCalendarTab) {
    const weekDateSet = new Set(weekStripDays.map(d => d.dateKey))
    const upcoming = visibleLeads.filter(l => !hasPastAppointment(l, todayKey))
    const toGroup = selectedWeekDate
      ? upcoming.filter(l => getLeadPrimaryDate(l) === selectedWeekDate)
      : upcoming.filter(l => {
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

    const pastGroups: Record<string, EnrollmentLead[]> = {};
    for (const lead of visibleLeads.filter(l => hasPastAppointment(l, todayKey))) {
      const date = getLeadPrimaryDate(lead) as string;
      (pastGroups[date] = pastGroups[date] ?? []).push(lead);
    }
    Object.entries(pastGroups)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([dateKey, groupLeads]) => pastDateGroups.push({ dateKey, leads: groupLeads }));
  }
  const pastAppointmentCount = pastDateGroups.reduce((sum, g) => sum + g.leads.length, 0);

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-3" />
        Loading leads…
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

      {/* Lead list */}
      {isCalendarTab ? (
        <LeadCalendarView
          dateGroups={dateGroups}
          pastDateGroups={pastDateGroups}
          pastAppointmentCount={pastAppointmentCount}
          showPastAppointments={showPastAppointments}
          onToggleShowPast={() => setShowPastAppointments(s => !s)}
          weekStripDays={weekStripDays}
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
          selectedWeekDate={selectedWeekDate}
          onSelectWeekDate={setSelectedWeekDate}
          weekRangeLabel={formatWeekRange(getMondayOfWeek(weekOffset))}
          appointmentCountsByDate={appointmentCountsByDate}
          renderCard={renderCard}
          emptyMessage={
            visibleLeads.length === 0
              ? (search.trim() ? 'No leads match your search.' : 'No leads in this status.')
              : null
          }
        />
      ) : visibleLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search.trim() ? 'No leads match your search.' : 'No leads in this status.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLeads.map(renderCard)}
        </div>
      )}

      {/* Modals */}
      {pendingAction && (
        <AlertDialog open onOpenChange={open => { if (!open) setPendingAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction.type === 'dismiss' ? 'Dismiss lead?' : 'Archive this lead?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction.type === 'dismiss'
                  ? 'No email will be sent. Any booked appointment is cancelled.'
                  : 'The lead is hidden from all views. You can restore it later.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={pendingAction.type === 'dismiss' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
                disabled={actionLeadId === pendingAction.lead.lead_id}
                onClick={() =>
                  pendingAction.type === 'dismiss'
                    ? handleDismissSilently(pendingAction.lead)
                    : handleArchiveLead(pendingAction.lead)
                }
              >
                {pendingAction.type === 'dismiss' ? 'Dismiss' : 'Archive'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {denyTarget && (
        <DenyModal
          lead={denyTarget}
          onConfirm={async (leadId, message) => { if (await actions.deny(leadId, message)) setDenyTarget(null); }}
          onCancel={() => setDenyTarget(null)}
        />
      )}
      {pickDateTarget && (
        <PickDateModal
          lead={pickDateTarget}
          onConfirm={async bookings => { if (await actions.bookAppointments(pickDateTarget, bookings)) setPickDateTargetId(null); }}
          onCancel={() => setPickDateTargetId(null)}
        />
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
