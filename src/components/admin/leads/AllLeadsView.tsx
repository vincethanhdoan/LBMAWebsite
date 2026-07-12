import { useEffect, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import type { EnrollmentLead } from '../../../lib/types';
import type { TerminalLeadFilter } from '../../../lib/supabase/queries';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import {
  useRestoreLead,
  useTerminalLeadCounts,
  useTerminalLeads,
} from '../../../lib/hooks/leads';
import {
  formatDate,
  leadMatchesSearch,
  STATUS_LABELS,
  toLocalDateKey,
} from './leadDisplay';
import { childSummary, getAppointmentOccurrences } from './leadViews';
import { LeadRow, StatusBadge, Surface } from './ui';

export type AllLeadsFilter =
  | 'everyone'
  | 'active'
  | 'attended'
  | 'no_show'
  | 'closed'
  | 'denied'
  | 'archived';

type BadgeKind =
  | 'confirmed'
  | 'unconfirmed'
  | 'attended'
  | 'no_show'
  | 'closed'
  | 'denied'
  | 'new';

const FILTERS: { id: AllLeadsFilter; label: string }[] = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'active', label: 'Active' },
  { id: 'attended', label: 'Attended' },
  { id: 'no_show', label: 'No-show' },
  { id: 'closed', label: 'Closed' },
  { id: 'denied', label: 'Denied' },
  { id: 'archived', label: 'Archived' },
];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function mapFilter(filter: AllLeadsFilter): TerminalLeadFilter {
  return filter === 'everyone' || filter === 'active' ? 'all_terminal' : filter;
}

function badgeKind(status: EnrollmentLead['status']): BadgeKind | null {
  switch (status) {
    case 'new':
      return 'new';
    case 'appointment_scheduled':
      return 'unconfirmed';
    case 'appointment_confirmed':
      return 'confirmed';
    case 'attended':
      return 'attended';
    case 'no_show':
      return 'no_show';
    case 'closed':
      return 'closed';
    case 'denied':
      return 'denied';
    default:
      return null;
  }
}

export function AllLeadsView({
  activeLeads,
  onOpenLead,
  highlightedLeadId,
  initialFilter,
}: {
  activeLeads: EnrollmentLead[];
  // The lead rides along with its id because rows here can come from filtered
  // or searched terminal queries the shell doesn't load; the shell keeps it as
  // a fallback for the detail panel when its own lookup misses.
  onOpenLead: (leadId: string, lead?: EnrollmentLead) => void;
  highlightedLeadId: string | null;
  initialFilter?: AllLeadsFilter;
}): JSX.Element {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AllLeadsFilter>(
    initialFilter ?? 'everyone',
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const terminalQuery = useTerminalLeads(mapFilter(filter), debouncedSearch);
  const { data: counts } = useTerminalLeadCounts();
  const restoreLead = useRestoreLead();

  const terminalLeads = useMemo(
    () => (terminalQuery.data?.pages ?? []).flatMap((p) => p.leads),
    [terminalQuery.data],
  );

  const showActive = filter === 'everyone' || filter === 'active';
  const showTerminal = filter !== 'active';

  const activeMatches = useMemo(
    () =>
      showActive ? activeLeads.filter((l) => leadMatchesSearch(l, search)) : [],
    [showActive, activeLeads, search],
  );

  // Next booked visit on or after today, per active lead — occurrences come back
  // sorted ascending, so the first future one is the soonest.
  const nextUpcomingByLead = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const map = new Map<string, string>();
    for (const o of getAppointmentOccurrences(activeLeads)) {
      if (o.dateKey >= todayKey && !map.has(o.lead.lead_id))
        map.set(o.lead.lead_id, o.dateKey);
    }
    return map;
  }, [activeLeads]);

  // A loaded lead is a possible duplicate when its email matches an
  // earlier-created loaded lead — the first occurrence of each email is never flagged.
  const duplicateLeadIds = useMemo(() => {
    const loaded = [...activeLeads, ...terminalLeads];
    const earliestByEmail = new Map<string, string>();
    for (const l of loaded) {
      const email = l.parent_email.trim().toLowerCase();
      const earliest = earliestByEmail.get(email);
      if (!earliest || l.created_at < earliest)
        earliestByEmail.set(email, l.created_at);
    }
    const ids = new Set<string>();
    for (const l of loaded) {
      const email = l.parent_email.trim().toLowerCase();
      if (l.created_at > earliestByEmail.get(email)!) ids.add(l.lead_id);
    }
    return ids;
  }, [activeLeads, terminalLeads]);

  const terminalTotal = counts
    ? counts.enrolled +
      counts.attended +
      counts.no_show +
      counts.closed +
      counts.denied +
      counts.archived
    : 0;
  const total = activeLeads.length + terminalTotal;

  function titleMeta(lead: EnrollmentLead): string | undefined {
    const parts: string[] = [];
    const summary = childSummary(lead);
    if (summary) parts.push(summary);
    if (duplicateLeadIds.has(lead.lead_id))
      parts.push('previous inquiry exists');
    return parts.length ? parts.join(' · ') : undefined;
  }

  function activeRow(lead: EnrollmentLead): ReactNode {
    const upcoming = nextUpcomingByLead.get(lead.lead_id);
    const line2 = upcoming
      ? `appointment ${formatDate(upcoming + 'T12:00:00')}`
      : STATUS_LABELS[lead.status];
    const kind = badgeKind(lead.status);
    return (
      <LeadRow
        key={lead.lead_id}
        id={'lead-' + lead.lead_id}
        highlighted={highlightedLeadId === lead.lead_id}
        title={lead.parent_name}
        titleMeta={titleMeta(lead)}
        line2={line2}
        badge={kind ? <StatusBadge kind={kind} /> : undefined}
        onOpen={() => onOpenLead(lead.lead_id, lead)}
      />
    );
  }

  function terminalRow(lead: EnrollmentLead): ReactNode {
    if (lead.deleted_at) {
      return (
        <LeadRow
          key={lead.lead_id}
          id={'lead-' + lead.lead_id}
          highlighted={highlightedLeadId === lead.lead_id}
          dimmed
          title={lead.parent_name}
          titleMeta={titleMeta(lead)}
          line2={`Archived ${formatDate(lead.deleted_at)}`}
          action={
            <Button
              size="sm"
              variant="outline"
              disabled={
                restoreLead.isPending && restoreLead.variables === lead.lead_id
              }
              onClick={() =>
                restoreLead.mutate(lead.lead_id, {
                  onError: () =>
                    toast.error("Couldn't restore lead. Please try again."),
                })
              }
            >
              Restore
            </Button>
          }
          onOpen={() => onOpenLead(lead.lead_id, lead)}
        />
      );
    }
    const outcomeDate = lead.denied_at ?? lead.attendance_recorded_at;
    const line2 = outcomeDate
      ? `${STATUS_LABELS[lead.status]} ${formatDate(outcomeDate)}`
      : `${STATUS_LABELS[lead.status]} · inquired ${formatDate(lead.created_at)}`;
    const kind = badgeKind(lead.status);
    return (
      <LeadRow
        key={lead.lead_id}
        id={'lead-' + lead.lead_id}
        highlighted={highlightedLeadId === lead.lead_id}
        title={lead.parent_name}
        titleMeta={titleMeta(lead)}
        line2={line2}
        badge={kind ? <StatusBadge kind={kind} /> : undefined}
        onOpen={() => onOpenLead(lead.lead_id, lead)}
      />
    );
  }

  const terminalLoading = showTerminal && terminalQuery.isLoading;
  const terminalErrored =
    showTerminal && terminalQuery.isError && !terminalLoading;
  const activeRows = showActive ? activeMatches : [];
  const visibleTerminal = showTerminal && !terminalLoading && !terminalErrored ? terminalLeads : [];
  const hasAny = activeRows.length + visibleTerminal.length > 0;
  const searching = search.trim() !== '';

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">All Leads</h2>
        <span className="text-[13px] text-muted-foreground">{total} total</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or student"
          aria-label="Search leads"
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

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`text-[12px] font-semibold rounded-full px-3 py-1 transition-colors ${
              filter === f.id
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {hasAny && (
        <Surface
          className={`transition-opacity ${terminalQuery.isFetching && !terminalLoading ? 'opacity-60' : ''}`}
        >
          {activeRows.map(activeRow)}
          {visibleTerminal.map(terminalRow)}
        </Surface>
      )}

      {terminalLoading && (
        <div
          className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
              <div className="w-4 h-4 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {terminalErrored && (
        <div className="rounded-xl border bg-card px-6 py-8 text-center">
          <p className="text-sm font-medium">Couldn't load leads.</p>
          <button
            type="button"
            onClick={() => terminalQuery.refetch()}
            className="mt-3 text-sm underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {!hasAny && !terminalLoading && !terminalErrored && (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          {searching ? 'No leads match your search.' : 'Nothing here yet.'}
        </p>
      )}

      {showTerminal && !terminalErrored && terminalQuery.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={terminalQuery.isFetchingNextPage}
            onClick={() => terminalQuery.fetchNextPage()}
            className="gap-2"
          >
            {terminalQuery.isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
