import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { EnrollmentLead } from '../../lib/types';
import {
  useActiveLeads,
  useArchiveLead,
  useBlockedDates,
  useDismissLead,
  useRestoreLead,
  useTerminalLeads,
} from '../../lib/hooks/leads';
import { DenyModal } from './DenyModal';
import { PickDateModal } from './PickDateModal';
import { NewLeadModal } from './NewLeadModal';
import { EditLeadModal } from './leads/EditLeadModal';
import { useLeadActions } from './leads/useLeadActions';
import { OverviewView } from './leads/OverviewView';
import { PipelineView } from './leads/PipelineView';
import { AppointmentsView } from './leads/AppointmentsView';
import { AllLeadsView, type AllLeadsFilter } from './leads/AllLeadsView';
import { LeadDetailPanel } from './leads/LeadDetailPanel';
import { LeadsContentSkeleton } from './leads/LeadsSkeleton';

type LeadView = 'overview' | 'pipeline' | 'appointments' | 'all';

const VIEWS: { id: LeadView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'all', label: 'All Leads' },
];

const TERMINAL_STATUSES = new Set<EnrollmentLead['status']>(['enrolled', 'closed', 'denied']);

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

export function AdminEnrollmentLeadsTab() {
  const queryClient = useQueryClient();
  const { data: activeLeads = [], isLoading: activeLoading, isError: activeIsError, refetch: refetchActiveLeads } = useActiveLeads();
  const { data: blocks = [] } = useBlockedDates();
  const actions = useLeadActions({ onError: msg => toast.error(msg) });

  // Terminal + archived leads are loaded here only so deep links and the detail
  // panel can resolve leads that live outside the active set. The empty search
  // key is shared with AllLeadsView's unfiltered queries, so pages it loads are
  // visible here too.
  const terminalQuery = useTerminalLeads('all_terminal', '');
  const archivedQuery = useTerminalLeads('archived', '');
  const terminalLoading = terminalQuery.isLoading || archivedQuery.isLoading;

  const dismissLead = useDismissLead();
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();

  const [now, setNow] = useState(() => Date.now());
  const [searchParams, setSearchParams] = useSearchParams();

  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  // Snapshot passed by a view whose lead may be absent from the shell's loaded
  // pages (AllLeadsView under a typed search, a status filter, or deeper
  // pagination). Used only when the live lookup misses, so fresher query data
  // always wins.
  const [fallbackLead, setFallbackLead] = useState<EnrollmentLead | null>(null);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const [allInitialFilter, setAllInitialFilter] = useState<AllLeadsFilter | undefined>(undefined);

  const [denyTarget, setDenyTarget] = useState<EnrollmentLead | null>(null);
  const [resendTarget, setResendTarget] = useState<EnrollmentLead | null>(null);
  const [pickDateTargetId, setPickDateTargetId] = useState<string | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'dismiss' | 'archive'; lead: EnrollmentLead } | null>(null);
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());

  const processedLeadParam = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const rawView = searchParams.get('view');
  const view: LeadView = VIEWS.some(v => v.id === rawView) ? (rawView as LeadView) : 'overview';

  const terminalLeads = useMemo(
    () => (terminalQuery.data?.pages ?? []).flatMap(p => p.leads),
    [terminalQuery.data],
  );
  const archivedLeads = useMemo(
    () => (archivedQuery.data?.pages ?? []).flatMap(p => p.leads),
    [archivedQuery.data],
  );
  const allLoadedLeads = useMemo(
    () => [...activeLeads, ...terminalLeads, ...archivedLeads],
    [activeLeads, terminalLeads, archivedLeads],
  );

  function goToView(next: LeadView) {
    setSearchParams({ tab: 'leads', view: next }, { replace: true });
  }

  function openLead(leadId: string, lead?: EnrollmentLead) {
    setDetailLeadId(leadId);
    setFallbackLead(lead ?? null);
  }

  function closeDetail() {
    setDetailLeadId(null);
    setFallbackLead(null);
  }

  // Overview day taps and the "open calendar" link route to the appointments
  // view. A date lands as a URL param that AppointmentsView reads on mount; it
  // is stripped immediately after so a later remount starts clean.
  function goToAppointments(dateKey?: string) {
    if (dateKey) {
      setSearchParams({ tab: 'leads', view: 'appointments', date: dateKey }, { replace: true });
    } else {
      goToView('appointments');
    }
  }

  const dateParam = searchParams.get('date');
  useEffect(() => {
    if (!dateParam) return;
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    setSearchParams(next, { replace: true });
  }, [dateParam, searchParams, setSearchParams]);

  // Deep link: `?lead=<id>` opens the detail panel for a specific lead and
  // switches to a view where it renders. Runs once per param value (ref guard)
  // so refetches don't re-trigger it; the param is stripped afterward.
  const deepLinkLeadId = searchParams.get('lead');
  useEffect(() => {
    // Wait for the active and terminal queries so a loaded-but-not-yet-fetched
    // lead isn't wrongly treated as missing.
    if (!deepLinkLeadId || activeLoading || terminalLoading) return;

    if (processedLeadParam.current === deepLinkLeadId) {
      setSearchParams({ tab: 'leads', view }, { replace: true });
      return;
    }
    processedLeadParam.current = deepLinkLeadId;

    const lead = allLoadedLeads.find(l => l.lead_id === deepLinkLeadId);
    let nextView: LeadView = 'all';
    if (lead) {
      setDetailLeadId(lead.lead_id);
      setHighlightedLeadId(lead.lead_id);
      if (lead.deleted_at) {
        setAllInitialFilter('archived');
        nextView = 'all';
      } else if (TERMINAL_STATUSES.has(lead.status)) {
        setAllInitialFilter(undefined);
        nextView = 'all';
      } else {
        nextView = 'overview';
      }
    } else {
      setAllInitialFilter(undefined);
      nextView = 'all';
    }
    setSearchParams({ tab: 'leads', view: nextView }, { replace: true });
  }, [deepLinkLeadId, activeLoading, terminalLoading, allLoadedLeads, view, searchParams, setSearchParams]);

  // Scroll the highlighted row into view once it renders, then fade the ring.
  useEffect(() => {
    if (!highlightedLeadId) return;
    document.getElementById('lead-' + highlightedLeadId)?.scrollIntoView({ block: 'center' });
    const timer = setTimeout(() => setHighlightedLeadId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedLeadId]);

  // Modal + panel targets resolve live from query data so their contents track
  // mutations. The detail panel falls back to the snapshot the opening view
  // passed when the lead isn't in the loaded pages; a fallback-resolved lead is
  // exempt from close-on-disappear since it will never appear in those pages.
  const liveDetailLead = detailLeadId
    ? allLoadedLeads.find(l => l.lead_id === detailLeadId) ?? null
    : null;
  const detailLead =
    liveDetailLead ??
    (fallbackLead && fallbackLead.lead_id === detailLeadId ? fallbackLead : null);
  const pickDateTarget = pickDateTargetId
    ? activeLeads.find(l => l.lead_id === pickDateTargetId) ?? null
    : null;
  const liveEditTarget = editTargetId
    ? allLoadedLeads.find(l => l.lead_id === editTargetId) ?? null
    : null;
  const editTarget =
    liveEditTarget ??
    (fallbackLead && fallbackLead.lead_id === editTargetId ? fallbackLead : null);

  useEffect(() => {
    if (detailLeadId && !detailLead && !activeLoading && !terminalLoading) {
      setDetailLeadId(null);
      setFallbackLead(null);
    }
  }, [detailLeadId, detailLead, activeLoading, terminalLoading]);

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

  const todayLabel = new Date(now).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Enrollment Leads</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
        <Button variant="outline" onClick={() => setShowNewLeadModal(true)}>
          + New Lead
        </Button>
      </div>

      {/* Sub-nav */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {VIEWS.map(v => {
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => goToView(v.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-4 py-2.5 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary font-semibold -mb-px'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeLoading ? (
        <LeadsContentSkeleton />
      ) : activeIsError ? (
        <div className="rounded-xl border bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium">Couldn't load leads.</p>
          <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchActiveLeads()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {view === 'overview' && (
            <OverviewView
              leads={activeLeads}
              blocks={blocks}
              now={now}
              actions={actions}
              onOpenLead={openLead}
              onDeny={setDenyTarget}
              onGoToAppointments={goToAppointments}
              onGoToPipeline={() => goToView('pipeline')}
              highlightedLeadId={highlightedLeadId}
            />
          )}

          {view === 'pipeline' && (
            <PipelineView
              leads={activeLeads}
              now={now}
              actions={actions}
              onOpenLead={openLead}
              onDeny={setDenyTarget}
              highlightedLeadId={highlightedLeadId}
            />
          )}

          {view === 'appointments' && (
            <AppointmentsView
              leads={activeLeads}
              blocks={blocks}
              actions={actions}
              onOpenLead={openLead}
              onManageAvailability={() => setSearchParams({ tab: 'availability' })}
              initialSelectedDate={dateParam}
              highlightedLeadId={highlightedLeadId}
            />
          )}

          {view === 'all' && (
            <AllLeadsView
              activeLeads={activeLeads}
              onOpenLead={openLead}
              highlightedLeadId={highlightedLeadId}
              initialFilter={allInitialFilter}
            />
          )}
        </>
      )}

      {detailLead && (
        <LeadDetailPanel
          lead={detailLead}
          onClose={closeDetail}
          actions={actions}
          onEdit={l => setEditTargetId(l.lead_id)}
          onDeny={setDenyTarget}
          onPickDate={l => setPickDateTargetId(l.lead_id)}
          onResend={setResendTarget}
          onDismiss={l => setPendingAction({ type: 'dismiss', lead: l })}
          onArchive={l => setPendingAction({ type: 'archive', lead: l })}
        />
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
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
            setShowNewLeadModal(false);
          }}
          onCancel={() => setShowNewLeadModal(false)}
        />
      )}
    </div>
  );
}
