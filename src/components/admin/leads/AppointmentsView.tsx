import { useState } from 'react';
import type { JSX } from 'react';
import { X } from 'lucide-react';
import type { BlockedDate, EnrollmentLead } from '../../../lib/types';
import { Button } from '../../ui/button';
import { formatPhone } from '../../../lib/format';
import { daysUntilInPacific } from '../../../lib/pacificTime';
import {
  buildWeekDays,
  childSummary,
  deriveFollowUps,
  getAppointmentOccurrences,
  nextOccurrenceAfter,
  occurrenceKidCount,
} from './leadViews';
import type { AppointmentOccurrence, FollowUpItem } from './leadViews';
import { WeekCard } from './WeekCard';
import { LeadRow, StatusBadge, Surface } from './ui';
import { RecordOutcomeButton } from './RecordOutcomePopover';
import {
  PROGRAM_LABELS,
  formatDate,
  formatDateConcise,
  formatGroupHeader,
  formatTimeShort,
  getWeekStart,
  toLocalDateKey,
} from './leadDisplay';
import type { useLeadActions } from './useLeadActions';

// Scans a bounded window of week offsets for the one containing dateKey.
function weekOffsetForDate(dateKey: string): number | null {
  for (let offset = -8; offset <= 20; offset++) {
    const start = getWeekStart(offset);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (toLocalDateKey(d) === dateKey) return offset;
    }
  }
  return null;
}

export function AppointmentsView({
  leads,
  blocks,
  actions,
  onOpenLead,
  onManageAvailability,
  initialSelectedDate,
  highlightedLeadId,
}: {
  leads: EnrollmentLead[];
  blocks: BlockedDate[];
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  onManageAvailability: () => void;
  initialSelectedDate: string | null;
  highlightedLeadId: string | null;
}): JSX.Element {
  const [segment, setSegment] = useState<'upcoming' | 'follow_up'>('upcoming');
  const [weekOffset, setWeekOffset] = useState(() =>
    initialSelectedDate ? (weekOffsetForDate(initialSelectedDate) ?? 0) : 0,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialSelectedDate,
  );

  const todayKey = toLocalDateKey(new Date());
  const occurrences = getAppointmentOccurrences(leads);
  const followUps = deriveFollowUps(leads, todayKey);

  const days = buildWeekDays(occurrences, weekOffset, todayKey, blocks);
  const confirmedKids = days.reduce((sum, d) => sum + d.confirmedKids, 0);
  const unconfirmedKids = days.reduce((sum, d) => sum + d.unconfirmedKids, 0);
  const totalKids = confirmedKids + unconfirmedKids;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <div className="inline-flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setSegment('upcoming')}
              className={`px-3 py-1 rounded-md text-[13px] font-semibold ${
                segment === 'upcoming'
                  ? 'bg-card shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setSegment('follow_up')}
              className={`px-3 py-1 rounded-md text-[13px] font-semibold inline-flex items-center gap-1.5 ${
                segment === 'follow_up'
                  ? 'bg-card shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Needs follow-up
              {followUps.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[11px] font-bold rounded-full px-1.5">
                  {followUps.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={onManageAvailability}
        >
          Manage availability →
        </Button>
      </div>

      {segment === 'upcoming' ? (
        <UpcomingSegment
          occurrences={occurrences}
          days={days}
          blocks={blocks}
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          totalKids={totalKids}
          confirmedKids={confirmedKids}
          unconfirmedKids={unconfirmedKids}
          todayKey={todayKey}
          actions={actions}
          onOpenLead={onOpenLead}
          highlightedLeadId={highlightedLeadId}
        />
      ) : (
        <FollowUpSegment
          followUps={followUps}
          onOpenLead={onOpenLead}
          highlightedLeadId={highlightedLeadId}
        />
      )}
    </div>
  );
}

function UpcomingSegment({
  occurrences,
  days,
  blocks,
  weekOffset,
  onWeekOffsetChange,
  selectedDate,
  onSelectDate,
  totalKids,
  confirmedKids,
  unconfirmedKids,
  todayKey,
  actions,
  onOpenLead,
  highlightedLeadId,
}: {
  occurrences: AppointmentOccurrence[];
  days: ReturnType<typeof buildWeekDays>;
  blocks: BlockedDate[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  totalKids: number;
  confirmedKids: number;
  unconfirmedKids: number;
  todayKey: string;
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const weekKeys = days.map((d) => d.dateKey);
  const visible = occurrences.filter(
    (o) =>
      o.dateKey >= todayKey &&
      (selectedDate
        ? o.dateKey === selectedDate
        : weekKeys.includes(o.dateKey)),
  );

  // occurrences arrive sorted by dateKey+time, so groups form in ascending order.
  const grouped: [string, AppointmentOccurrence[]][] = [];
  for (const o of visible) {
    const last = grouped[grouped.length - 1];
    if (last && last[0] === o.dateKey) last[1].push(o);
    else grouped.push([o.dateKey, [o]]);
  }

  const blockedDays = days.filter(
    (d) =>
      d.isBlocked &&
      (!selectedDate || d.dateKey === selectedDate) &&
      !grouped.some(([k]) => k === d.dateKey),
  );

  const hasAnyUpcoming = occurrences.some((o) => o.dateKey >= todayKey);
  const nextAfterWeek = nextOccurrenceAfter(
    occurrences,
    days[days.length - 1].dateKey,
  );

  function jumpToNext() {
    if (!nextAfterWeek) return;
    const off = weekOffsetForDate(nextAfterWeek.dateKey);
    if (off !== null) onWeekOffsetChange(off);
    onSelectDate(null);
  }

  return (
    <div className="space-y-4">
      <WeekCard
        days={days}
        weekOffset={weekOffset}
        onWeekOffsetChange={onWeekOffsetChange}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        totalKids={totalKids}
        confirmedKids={confirmedKids}
        unconfirmedKids={unconfirmedKids}
        showTodayButton
      />

      {selectedDate && (
        <div className="inline-flex items-center gap-1 bg-muted rounded-full pl-3 pr-1.5 py-1 text-[12px]">
          <span>Showing {formatGroupHeader(selectedDate).label}</span>
          <button
            aria-label="Clear day filter"
            onClick={() => onSelectDate(null)}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-foreground/10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(([dateKey, occs]) => {
          const gh = formatGroupHeader(dateKey);
          const prefix = gh.isToday
            ? 'Today · '
            : gh.isTomorrow
              ? 'Tomorrow · '
              : '';
          const kidCount = occs.reduce(
            (sum, o) => sum + occurrenceKidCount(o),
            0,
          );
          return (
            <Surface key={dateKey}>
              <div className="px-4 py-2 bg-muted/40 text-[12px] font-semibold flex items-center gap-2">
                <span>
                  {prefix}
                  {gh.label}
                </span>
                <span className="text-muted-foreground font-normal">
                  {kidCount} {kidCount === 1 ? 'kid' : 'kids'}
                </span>
              </div>
              {occs.map((o) => (
                <OccurrenceRow
                  key={o.lead.lead_id + o.dateKey + (o.time ?? '')}
                  occurrence={o}
                  actions={actions}
                  onOpenLead={onOpenLead}
                  highlightedLeadId={highlightedLeadId}
                />
              ))}
            </Surface>
          );
        })}

        {blockedDays.map((d) => {
          const reason = blocks.find(
            (b) => b.start_date <= d.dateKey && b.end_date >= d.dateKey,
          )?.reason;
          return (
            <div
              key={d.dateKey}
              className="border border-dashed border-border rounded-xl px-4 py-3 text-[12px] text-muted-foreground bg-muted/30"
            >
              Blocked {formatGroupHeader(d.dateKey).label} ·{' '}
              {reason ?? 'No bookings'}
            </div>
          );
        })}

        {!hasAnyUpcoming ? (
          <div className="text-center py-10">
            <p className="text-[13px] text-muted-foreground">
              No upcoming appointments. Approve a lead and send a booking invite
              to get started.
            </p>
          </div>
        ) : (
          grouped.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[13px] text-muted-foreground">
                No appointments this week.
              </p>
              {nextAfterWeek && (
                <button
                  onClick={jumpToNext}
                  className="mt-2 text-[13px] font-semibold text-primary hover:underline"
                >
                  Next appointment:{' '}
                  {formatDateConcise(nextAfterWeek.dateKey + 'T12:00:00')} →
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function OccurrenceRow({
  occurrence,
  actions,
  onOpenLead,
  highlightedLeadId,
}: {
  occurrence: AppointmentOccurrence;
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const { lead, booking } = occurrence;
  const phone = lead.phone;
  const unconfirmed = !occurrence.confirmed;
  const daysUntil = daysUntilInPacific(
    new Date(occurrence.dateKey + 'T12:00:00'),
  );
  const callNow = unconfirmed && daysUntil >= 0 && daysUntil <= 2;

  return (
    <LeadRow
      id={'lead-' + lead.lead_id}
      highlighted={highlightedLeadId === lead.lead_id}
      leading={
        <span className="text-[13px] font-semibold w-16 flex-shrink-0">
          {occurrence.time ? formatTimeShort(occurrence.time) : '—'}
        </span>
      }
      title={childSummary(lead) || lead.parent_name}
      titleMeta={booking ? PROGRAM_LABELS[booking.program_type] : undefined}
      line2={
        callNow ? (
          <span className="text-[#A01F23] font-bold">
            Not confirmed, call {lead.parent_name}
            {phone ? ' · ' + formatPhone(phone) : ''}
          </span>
        ) : (
          `Parent: ${lead.parent_name}${phone ? ' · ' + formatPhone(phone) : ''}`
        )
      }
      badge={
        callNow ? undefined : (
          <StatusBadge
            kind={occurrence.confirmed ? 'confirmed' : 'unconfirmed'}
          />
        )
      }
      action={
        callNow ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px]"
            disabled={actions.busyLeadIds.has(lead.lead_id)}
            onClick={() => actions.markConfirmed(lead)}
          >
            Mark confirmed
          </Button>
        ) : undefined
      }
      onOpen={() => onOpenLead(lead.lead_id)}
    />
  );
}

function FollowUpSegment({
  followUps,
  onOpenLead,
  highlightedLeadId,
}: {
  followUps: FollowUpItem[];
  onOpenLead: (leadId: string) => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Appointments that came and went with no outcome recorded.
      </p>
      {followUps.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[13px] text-muted-foreground">
            Nothing to follow up.
          </p>
        </div>
      ) : (
        <Surface>
          {followUps.map((item) => (
            <FollowUpRow
              key={item.lead.lead_id}
              item={item}
              onOpenLead={onOpenLead}
              highlightedLeadId={highlightedLeadId}
            />
          ))}
        </Surface>
      )}
    </div>
  );
}

function FollowUpRow({
  item,
  onOpenLead,
  highlightedLeadId,
}: {
  item: FollowUpItem;
  onOpenLead: (leadId: string) => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const { lead, lastPastDateKey } = item;
  const phone = lead.phone;
  const lastOccurrence = getAppointmentOccurrences([lead]).slice(-1)[0];
  const booking = lastOccurrence?.booking ?? null;

  const line2 = `Was ${formatGroupHeader(lastPastDateKey).label} · Parent: ${lead.parent_name}${
    phone ? ' · ' + formatPhone(phone) : ''
  }`;

  return (
    <LeadRow
      id={'lead-' + lead.lead_id}
      highlighted={highlightedLeadId === lead.lead_id}
      leading={
        <span className="text-[11px] font-semibold text-muted-foreground w-16 flex-shrink-0">
          {formatDate(lastPastDateKey + 'T12:00:00')}
        </span>
      }
      title={childSummary(lead) || lead.parent_name}
      titleMeta={booking ? PROGRAM_LABELS[booking.program_type] : undefined}
      line2={line2}
      action={<RecordOutcomeButton lead={lead} />}
      onOpen={() => onOpenLead(lead.lead_id)}
    />
  );
}
