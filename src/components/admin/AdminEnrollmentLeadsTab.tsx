import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import type { EnrollmentLead } from '../../lib/types';
import { useActiveLeads, useTerminalLeads, useTerminalLeadCounts, useUpdateLeadStatus, useUpdateLeadNotes, useDismissLead, useCloseLead, useArchiveLead, useRestoreLead } from '../../lib/hooks/leads';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { DenyModal } from './DenyModal';
import { PickDateModal } from './PickDateModal';
import { NewLeadModal } from './NewLeadModal';
import { EditLeadModal } from './leads/EditLeadModal';
import { LeadCard } from './leads/LeadCard';
import { LeadCalendarView } from './leads/LeadCalendarView';
import { ActionNeededView } from './leads/ActionNeededView';
import { useLeadActions } from './leads/useLeadActions';
import { deriveActionNeeded } from './leads/actionNeeded';
import {
  filterLeads,
  leadMatchesSearch,
  hasPastAppointment,
  toLocalDateKey,
  getLeadPrimaryDate,
  getWeekStart,
  formatWeekRange,
  findNearestWeekOffset,
  formatDate,
  TABS,
  TAB_EXPLANATIONS,
  HISTORY_FILTERS,
  type TabId,
  type HistoryFilter,
} from './leads/leadDisplay';

function tabCount(leads: EnrollmentLead[], tab: (typeof TABS)[number], todayKey: string): number {
  if (!tab.statuses) return leads.length;
  let matching = leads.filter(l => tab.statuses!.includes(l.status));
  if (tab.id === 'appointment_scheduled' || tab.id === 'appointment_confirmed') {
    matching = matching.filter(l => !hasPastAppointment(l, todayKey));
  }
  return matching.length;
}

type TerminalCounts = { enrolled: number; closed: number; denied: number; archived: number };

function historyBadgeCount(counts: TerminalCounts | undefined, filter: HistoryFilter): number {
  if (!counts) return 0;
  const terminalTotal = counts.enrolled + counts.closed + counts.denied;
  switch (filter) {
    case 'enrolled': return counts.enrolled;
    case 'closed':   return counts.closed;
    case 'denied':   return counts.denied;
    case 'archived': return terminalTotal + counts.archived;
    default:         return terminalTotal;
  }
}

// Guiding empty-state copy per tab. A non-empty search always wins so the
// message reflects that the filter, not the pipeline, is empty.
function emptyStateMessage(tab: TabId, searching: boolean): string {
  if (searching) return 'No leads match your search.';
  switch (tab) {
    case 'new':
      return 'No new leads. New inquiries from the website appear here.';
    case 'approved':
      return 'No approved leads waiting to book.';
    case 'appointment_scheduled':
    case 'appointment_confirmed':
      return 'No upcoming appointments. Approve a lead and send a booking link to get started.';
    case 'history':
      return 'Nothing here yet.';
    default:
      return 'No leads in this status.';
  }
}

function withId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.add(id);
  return next;
}

function withoutId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminEnrollmentLeadsTab() {
  const queryClient = useQueryClient();
  const { data: activeLeads = [], isLoading: loading } = useActiveLeads();
  const [search, setSearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all_terminal');
  const debouncedSearch = useDebouncedValue(search, 300);
  const terminalQuery = useTerminalLeads(historyFilter, debouncedSearch);
  const { data: terminalCounts } = useTerminalLeadCounts();
  const updateStatus = useUpdateLeadStatus();
  const updateNotes = useUpdateLeadNotes();
  const dismissLead = useDismissLead();
  const closeLead = useCloseLead();
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const actions = useLeadActions({ onError: msg => toast.error(msg) });
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('action_needed');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [denyTarget, setDenyTarget] = useState<EnrollmentLead | null>(null);
  const [resendTarget, setResendTarget] = useState<EnrollmentLead | null>(null);
  const [pickDateTargetId, setPickDateTargetId] = useState<string | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'dismiss' | 'archive'; lead: EnrollmentLead } | null>(null);
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({});
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({});
  const [notesError, setNotesError] = useState<Record<string, boolean>>({});
  const [messageExpanded, setMessageExpanded] = useState<Record<string, boolean>>({});
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());
  const [showPastAppointments, setShowPastAppointments] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const processedLeadParam = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const terminalLeads = useMemo(
    () => (terminalQuery.data?.pages ?? []).flatMap(p => p.leads),
    [terminalQuery.data],
  );
  const allLoadedLeads = useMemo(
    () => [...activeLeads, ...terminalLeads],
    [activeLeads, terminalLeads],
  );

  // Deep link: `?lead=<id>` jumps to a specific lead — switch to its tab, scroll
  // to its card, flash a highlight, then strip the param. Runs once per param
  // value (guarded by a ref) so refetches don't re-trigger the jump.
  const deepLinkLeadId = searchParams.get('lead');
  useEffect(() => {
    // Wait for both the active and terminal queries so a terminal lead isn't
    // wrongly treated as not-found while its query is still loading.
    if (!deepLinkLeadId || loading || terminalQuery.isLoading) return;

    const stripLeadParam = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('lead');
      setSearchParams(next, { replace: true });
    };

    // Already handled this id while mounted — still strip the stale param.
    if (processedLeadParam.current === deepLinkLeadId) {
      stripLeadParam();
      return;
    }
    processedLeadParam.current = deepLinkLeadId;

    const lead = allLoadedLeads.find(l => l.lead_id === deepLinkLeadId);
    setSelectedWeekDate(null);
    setWeekOffset(0);
    setSearch('');
    if (!lead) {
      setActiveTab('all');
      setHistoryFilter('all_terminal');
    } else if (lead.deleted_at) {
      setActiveTab('history');
      setHistoryFilter('archived');
      setHighlightedLeadId(lead.lead_id);
    } else {
      if (
        lead.status === 'new' ||
        lead.status === 'approved' ||
        lead.status === 'appointment_scheduled' ||
        lead.status === 'appointment_confirmed'
      ) {
        setActiveTab(lead.status);
        if (lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') {
          const date = getLeadPrimaryDate(lead);
          setWeekOffset(date ? findNearestWeekOffset([date]) ?? 0 : 0);
        }
      } else {
        setActiveTab('history');
        setHistoryFilter('all_terminal');
      }
      setHighlightedLeadId(lead.lead_id);
    }

    stripLeadParam();
  }, [deepLinkLeadId, loading, terminalQuery.isLoading, allLoadedLeads, searchParams, setSearchParams]);

  // Scroll the deep-linked card into view once it renders, then clear the
  // highlight after ~2s so the ring fades away.
  useEffect(() => {
    if (!highlightedLeadId) return;
    document.getElementById('lead-' + highlightedLeadId)?.scrollIntoView({ block: 'center' });
    const timer = setTimeout(() => setHighlightedLeadId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedLeadId]);

  // A loaded lead is a possible duplicate when its email matches an
  // earlier-created loaded lead — the first occurrence of each email is never flagged.
  const duplicateLeadIds = useMemo(() => {
    const earliestByEmail = new Map<string, string>();
    for (const l of allLoadedLeads) {
      const email = l.parent_email.trim().toLowerCase();
      const earliest = earliestByEmail.get(email);
      if (!earliest || l.created_at < earliest) earliestByEmail.set(email, l.created_at);
    }
    const ids = new Set<string>();
    for (const l of allLoadedLeads) {
      const email = l.parent_email.trim().toLowerCase();
      if (l.created_at > earliestByEmail.get(email)!) ids.add(l.lead_id);
    }
    return ids;
  }, [allLoadedLeads]);

  useEffect(() => {
    setNotesDraft(d => {
      const next: Record<string, string> = {};
      for (const l of allLoadedLeads) {
        next[l.lead_id] = notesExpanded[l.lead_id] && l.lead_id in d
          ? d[l.lead_id]
          : (l.admin_notes ?? '');
      }
      return next;
    });
  }, [allLoadedLeads, notesExpanded]);

  // Derived from the live query so the pick-date modal reflects booking status
  // after a refetch (e.g. a partial multi-program booking failure).
  const pickDateTarget = pickDateTargetId
    ? activeLeads.find(l => l.lead_id === pickDateTargetId) ?? null
    : null;
  const editTarget = editTargetId
    ? allLoadedLeads.find(l => l.lead_id === editTargetId) ?? null
    : null;

  async function handleStatusChange(leadId: string, status: EnrollmentLead['status']) {
    setUpdatingIds(s => withId(s, leadId));
    try {
      await updateStatus.mutateAsync({ leadId, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingIds(s => withoutId(s, leadId));
    }
  }

  async function handleCloseLead(leadId: string) {
    setUpdatingIds(s => withId(s, leadId));
    try {
      await closeLead.mutateAsync(leadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingIds(s => withoutId(s, leadId));
    }
  }

  async function handleNotesSave(leadId: string) {
    try {
      await updateNotes.mutateAsync({ leadId, notes: notesDraft[leadId] ?? '' });
      setNotesError(e => ({ ...e, [leadId]: false }));
      setNotesExpanded(e => ({ ...e, [leadId]: false }));
      setNotesSaved(s => ({ ...s, [leadId]: true }));
      setTimeout(() => setNotesSaved(s => ({ ...s, [leadId]: false })), 2000);
    } catch {
      // Keep the draft and the editor open so the note isn't silently lost.
      setNotesError(e => ({ ...e, [leadId]: true }));
    }
  }

  async function handleDismissSilently(lead: EnrollmentLead) {
    if (actingIds.has(lead.lead_id)) return;
    setActingIds(s => withId(s, lead.lead_id));
    try {
      await dismissLead.mutateAsync(lead.lead_id);
      toast.success('Lead dismissed');
    } catch {
      toast.error('Failed to dismiss lead');
    } finally {
      setActingIds(s => withoutId(s, lead.lead_id));
      setPendingAction(null);
    }
  }

  async function handleArchiveLead(lead: EnrollmentLead) {
    if (actingIds.has(lead.lead_id)) return;
    setActingIds(s => withId(s, lead.lead_id));
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
      setActingIds(s => withoutId(s, lead.lead_id));
      setPendingAction(null);
    }
  }

  async function handleRestoreLead(lead: EnrollmentLead) {
    if (actingIds.has(lead.lead_id)) return;
    setActingIds(s => withId(s, lead.lead_id));
    try {
      await restoreLead.mutateAsync(lead.lead_id);
      toast.success('Lead restored');
    } catch {
      toast.error('Failed to restore lead');
    } finally {
      setActingIds(s => withoutId(s, lead.lead_id));
    }
  }

  const renderCard = (lead: EnrollmentLead) => (
    <LeadCard
      key={lead.lead_id}
      lead={lead}
      now={now}
      activeTab={activeTab}
      actions={actions}
      updatingIds={updatingIds}
      isPossibleDuplicate={duplicateLeadIds.has(lead.lead_id)}
      highlighted={highlightedLeadId === lead.lead_id}
      onDuplicateClick={() => {
        setActiveTab('all');
        setHistoryFilter('all_terminal');
        setSelectedWeekDate(null);
        setWeekOffset(0);
        setSearch(lead.parent_email);
      }}
      onDeny={setDenyTarget}
      onResendBookingLink={setResendTarget}
      onPickDate={l => setPickDateTargetId(l.lead_id)}
      onEdit={l => setEditTargetId(l.lead_id)}
      onDismiss={l => setPendingAction({ type: 'dismiss', lead: l })}
      onArchive={l => setPendingAction({ type: 'archive', lead: l })}
      onStatusChange={handleStatusChange}
      onCloseLead={handleCloseLead}
      notes={{
        draft: notesDraft[lead.lead_id] ?? '',
        expanded: notesExpanded[lead.lead_id] ?? false,
        saved: notesSaved[lead.lead_id] ?? false,
        error: notesError[lead.lead_id] ?? false,
        onDraftChange: v => setNotesDraft(d => ({ ...d, [lead.lead_id]: v })),
        onToggle: () => setNotesExpanded(e => ({ ...e, [lead.lead_id]: true })),
        onSave: () => handleNotesSave(lead.lead_id),
      }}
      messageExpanded={messageExpanded[lead.lead_id] ?? false}
      onToggleMessage={() => setMessageExpanded(e => ({ ...e, [lead.lead_id]: !e[lead.lead_id] }))}
      historyExpanded={historyExpanded[lead.lead_id] ?? false}
      onToggleHistory={() => setHistoryExpanded(e => ({ ...e, [lead.lead_id]: !e[lead.lead_id] }))}
    />
  );

  const renderArchivedCard = (lead: EnrollmentLead) => (
    <div
      key={lead.lead_id}
      id={`lead-${lead.lead_id}`}
      className={`bg-muted/30 rounded-lg border p-4 flex items-center justify-between gap-3 opacity-75 transition-shadow duration-700 ${
        highlightedLeadId === lead.lead_id ? 'ring-2 ring-primary border-border/50' : 'border-border/50'
      }`}
    >
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{lead.parent_name}</div>
        <div className="text-xs text-muted-foreground truncate">{lead.parent_email}</div>
        {lead.deleted_at && (
          <div className="text-xs text-muted-foreground mt-0.5">Archived {formatDate(lead.deleted_at)}</div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0"
        disabled={actingIds.has(lead.lead_id)}
        onClick={() => handleRestoreLead(lead)}
      >
        Restore
      </Button>
    </div>
  );

  const renderTerminalList = () => {
    if (terminalQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-3" />
          Loading leads…
        </div>
      );
    }
    if (terminalLeads.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {emptyStateMessage('history', debouncedSearch.trim() !== '')}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {terminalLeads.map(lead => (lead.deleted_at ? renderArchivedCard(lead) : renderCard(lead)))}
        {terminalQuery.hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={terminalQuery.isFetchingNextPage}
              onClick={() => terminalQuery.fetchNextPage()}
              className="gap-2"
            >
              {terminalQuery.isFetchingNextPage ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Loading…</>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const visibleActiveLeads = filterLeads(activeLeads, activeTab, search);
  const actionNeededItems = deriveActionNeeded(activeLeads);
  const visibleActionNeededItems = actionNeededItems.filter(i => leadMatchesSearch(i.lead, search));
  const todayKey = toLocalDateKey(new Date());
  const newCount = activeLeads.filter(l => l.status === 'new').length;
  const approvedCount = activeLeads.filter(l => l.status === 'approved').length;
  const scheduledCount = activeLeads.filter(
    l => l.status === 'appointment_scheduled' && !hasPastAppointment(l, todayKey)
  ).length;
  const terminalTotal = terminalCounts
    ? terminalCounts.enrolled + terminalCounts.closed + terminalCounts.denied
    : 0;
  const totalLeads = activeLeads.length + terminalTotal;

  const isCalendarTab = activeTab === 'appointment_scheduled' || activeTab === 'appointment_confirmed';

  // Count appointments per date, split by status (unfiltered by search, for the
  // week strip and summary). Both calendar statuses count on both calendar tabs so
  // the strip shows amber (awaiting) and green (confirmed) dots side by side.
  const appointmentCountsByDate: Record<string, { scheduled: number; confirmed: number }> = {};
  if (isCalendarTab) {
    for (const lead of activeLeads) {
      if (lead.status !== 'appointment_scheduled' && lead.status !== 'appointment_confirmed') continue;
      if (hasPastAppointment(lead, todayKey)) continue;
      const date = getLeadPrimaryDate(lead);
      if (!date) continue;
      const entry = appointmentCountsByDate[date] ?? { scheduled: 0, confirmed: 0 };
      if (lead.status === 'appointment_scheduled') entry.scheduled += 1;
      else entry.confirmed += 1;
      appointmentCountsByDate[date] = entry;
    }
  }

  // 7-day Sun–Sat strip for the current weekOffset
  const weekStripDays = (() => {
    const weekStart = getWeekStart(weekOffset)
    const todayKey = toLocalDateKey(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      const dateKey = toLocalDateKey(d)
      const counts = appointmentCountsByDate[dateKey] ?? { scheduled: 0, confirmed: 0 }
      return {
        dateKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3),
        dayNum: d.getDate(),
        scheduled: counts.scheduled,
        confirmed: counts.confirmed,
        isToday: dateKey === todayKey,
      }
    })
  })()

  // This-week / next-week totals for the summary strip, derived from the same
  // per-date counts across all loaded active leads (not just the visible week).
  const weekSummary = (() => {
    if (!isCalendarTab) return null
    const summarize = (offset: number) => {
      const weekStart = getWeekStart(offset)
      let scheduled = 0
      let confirmed = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        const counts = appointmentCountsByDate[toLocalDateKey(d)]
        if (counts) { scheduled += counts.scheduled; confirmed += counts.confirmed }
      }
      return { total: scheduled + confirmed, confirmed, scheduled }
    }
    return { thisWeek: summarize(0), nextWeek: summarize(1) }
  })()

  // Group visible leads by appointment date for calendar tabs. Past-appointment
  // leads are pulled into a separate follow-up section rather than the week view.
  const dateGroups: Array<{ dateKey: string; leads: EnrollmentLead[] }> = [];
  const pastDateGroups: Array<{ dateKey: string; leads: EnrollmentLead[] }> = [];
  if (isCalendarTab) {
    const weekDateSet = new Set(weekStripDays.map(d => d.dateKey))
    const upcoming = visibleActiveLeads.filter(l => !hasPastAppointment(l, todayKey))
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
    for (const lead of visibleActiveLeads.filter(l => hasPastAppointment(l, todayKey))) {
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
            <span>{totalLeads} total</span>
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
            const count = tab.id === 'action_needed'
              ? actionNeededItems.length
              : tab.id === 'history'
                ? historyBadgeCount(terminalCounts, historyFilter)
                : tabCount(activeLeads, tab, todayKey);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setHistoryFilter('all_terminal');
                  setSelectedWeekDate(null);
                  if (tab.id === 'appointment_scheduled' || tab.id === 'appointment_confirmed') {
                    const tabStatuses = TABS.find(t => t.id === tab.id)!.statuses!;
                    const apptDates = activeLeads
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
          className="w-full pl-9 pr-10 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sub-filter for History tab */}
      {activeTab === 'history' && (
        <div className="flex gap-1.5">
          {HISTORY_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setHistoryFilter(f.id)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                historyFilter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Lead list */}
      {activeTab === 'action_needed' ? (
        <ActionNeededView
          items={visibleActionNeededItems}
          now={now}
          actions={actions}
          onPickDate={l => setPickDateTargetId(l.lead_id)}
          onDeny={setDenyTarget}
        />
      ) : isCalendarTab ? (
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
          weekRangeLabel={formatWeekRange(getWeekStart(weekOffset))}
          weekSummary={weekSummary}
          renderCard={renderCard}
          emptyMessage={
            visibleActiveLeads.length === 0
              ? emptyStateMessage(activeTab, search.trim() !== '')
              : null
          }
        />
      ) : activeTab === 'history' ? (
        renderTerminalList()
      ) : activeTab === 'all' ? (
        <div className="space-y-6">
          {visibleActiveLeads.length > 0 && (
            <div className="space-y-3">
              {visibleActiveLeads.map(renderCard)}
            </div>
          )}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
            {renderTerminalList()}
          </div>
        </div>
      ) : visibleActiveLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {emptyStateMessage(activeTab, search.trim() !== '')}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleActiveLeads.map(renderCard)}
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
                disabled={actingIds.has(pendingAction.lead.lead_id)}
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
      {resendTarget && (
        <AlertDialog open onOpenChange={open => { if (!open) setResendTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resend booking link?</AlertDialogTitle>
              <AlertDialogDescription>
                This re-sends the booking link and lets the family rebook. Their current appointment stays until they pick a new date.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={actions.busyLeadIds.has(resendTarget.lead_id)}
                onClick={async () => { await actions.resendBookingLink(resendTarget); setResendTarget(null); }}
              >
                Resend booking link
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
      {editTarget && (
        <EditLeadModal
          lead={editTarget}
          onSuccess={() => setEditTargetId(null)}
          onCancel={() => setEditTargetId(null)}
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
