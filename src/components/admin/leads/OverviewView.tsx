import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { BlockedDate, EnrollmentLead } from '../../../lib/types';
import { Button } from '../../ui/button';
import { formatPhone, relativeDayLabel } from '../../../lib/format';
import {
  buildWeekDays,
  childSummary,
  daysSince,
  deriveAttentionItems,
  getAppointmentOccurrences,
  nextOccurrenceAfter,
} from './leadViews';
import type { AttentionItem } from './leadViews';
import { WeekCard } from './WeekCard';
import { LeadRow, SectionHeader, StatusBadge, Surface } from './ui';
import { RecordOutcomeButton } from './RecordOutcomePopover';
import { formatDate, formatTimeShort, toLocalDateKey } from './leadDisplay';
import type { useLeadActions } from './useLeadActions';

function inquiryAge(createdAt: string, now: number): string {
  const days = daysSince(createdAt, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function OverviewView({
  leads,
  blocks,
  now,
  actions,
  onOpenLead,
  onDeny,
  onGoToAppointments,
  onGoToPipeline,
  highlightedLeadId,
}: {
  leads: EnrollmentLead[];
  blocks: BlockedDate[];
  now: number;
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  onDeny: (lead: EnrollmentLead) => void;
  onGoToAppointments: (dateKey?: string) => void;
  onGoToPipeline: () => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const [weekOffset, setWeekOffset] = useState(0);
  const todayKey = toLocalDateKey(new Date());

  const occurrences = getAppointmentOccurrences(leads);
  const days = buildWeekDays(occurrences, weekOffset, todayKey, blocks);
  const confirmedKids = days.reduce((sum, d) => sum + d.confirmedKids, 0);
  const unconfirmedKids = days.reduce((sum, d) => sum + d.unconfirmedKids, 0);
  const totalKids = confirmedKids + unconfirmedKids;

  const todayOccurrences = occurrences.filter((o) => o.dateKey === todayKey);
  const nextUpcoming = nextOccurrenceAfter(occurrences, todayKey);

  const attentionItems = deriveAttentionItems(leads, todayKey, now);

  const newLeads = leads
    .filter((l) => l.status === 'new')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const newPreview = newLeads.slice(0, 3);

  const allEmpty =
    occurrences.length === 0 &&
    attentionItems.length === 0 &&
    newLeads.length === 0;

  if (allEmpty) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
        <p className="mt-3 text-[15px] font-semibold">All caught up.</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          New inquiries and appointments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader
          title="This week"
          action={
            <button
              onClick={() => onGoToAppointments()}
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              Open calendar →
            </button>
          }
        />
        <WeekCard
          days={days}
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
          selectedDate={null}
          onSelectDate={(d) => d && onGoToAppointments(d)}
          totalKids={totalKids}
          confirmedKids={confirmedKids}
          unconfirmedKids={unconfirmedKids}
          showTodayButton={false}
        >
          {todayOccurrences.length > 0 ? (
            todayOccurrences.map((o) => (
              <LeadRow
                key={o.lead.lead_id + o.dateKey + (o.time ?? '')}
                id={'lead-' + o.lead.lead_id}
                highlighted={highlightedLeadId === o.lead.lead_id}
                leading={
                  <span className="text-[13px] font-semibold w-16 flex-shrink-0">
                    {o.time ? formatTimeShort(o.time) : '—'}
                  </span>
                }
                title={childSummary(o.lead) || o.lead.parent_name}
                badge={
                  <StatusBadge
                    kind={o.confirmed ? 'confirmed' : 'unconfirmed'}
                  />
                }
                onOpen={() => onOpenLead(o.lead.lead_id)}
              />
            ))
          ) : nextUpcoming ? (
            <LeadRow
              id={'lead-' + nextUpcoming.lead.lead_id}
              highlighted={highlightedLeadId === nextUpcoming.lead.lead_id}
              leading={
                <span className="text-[11px] font-semibold text-muted-foreground flex-shrink-0">
                  Next: {formatDate(nextUpcoming.dateKey + 'T12:00:00')}
                </span>
              }
              title={
                childSummary(nextUpcoming.lead) || nextUpcoming.lead.parent_name
              }
              badge={
                <StatusBadge
                  kind={nextUpcoming.confirmed ? 'confirmed' : 'unconfirmed'}
                />
              }
              onOpen={() => onOpenLead(nextUpcoming.lead.lead_id)}
            />
          ) : null}
        </WeekCard>
      </section>

      {attentionItems.length > 0 && (
        <section>
          <SectionHeader
            title="Needs attention"
            count={attentionItems.length}
            alert
          />
          <Surface>
            {attentionItems.map((item) => (
              <AttentionRow
                key={item.lead.lead_id}
                item={item}
                actions={actions}
                onOpenLead={onOpenLead}
                highlightedLeadId={highlightedLeadId}
              />
            ))}
          </Surface>
        </section>
      )}

      {newLeads.length > 0 && (
        <section>
          <SectionHeader
            title="New inquiries"
            count={newLeads.length}
            action={
              <button
                onClick={onGoToPipeline}
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                View all →
              </button>
            }
          />
          <Surface>
            {newPreview.map((lead) => {
              const snippet = lead.message.slice(0, 60);
              const age = inquiryAge(lead.created_at, now);
              return (
                <LeadRow
                  key={lead.lead_id}
                  id={'lead-' + lead.lead_id}
                  highlighted={highlightedLeadId === lead.lead_id}
                  title={lead.parent_name}
                  titleMeta={childSummary(lead)}
                  line2={snippet ? `${age} · ${snippet}` : age}
                  onOpen={() => onOpenLead(lead.lead_id)}
                  action={
                    <>
                      <Button
                        size="sm"
                        className="min-h-[44px]"
                        disabled={actions.busyLeadIds.has(lead.lead_id)}
                        onClick={() => actions.approve(lead)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-[44px] text-muted-foreground"
                        onClick={() => onDeny(lead)}
                      >
                        Deny
                      </Button>
                    </>
                  }
                />
              );
            })}
          </Surface>
        </section>
      )}
    </div>
  );
}

function AttentionRow({
  item,
  actions,
  onOpenLead,
  highlightedLeadId,
}: {
  item: AttentionItem;
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const { lead } = item;
  const busy = actions.busyLeadIds.has(lead.lead_id);

  let line2: ReactNode = null;
  let action: ReactNode = null;

  if (item.reason === 'call_to_confirm') {
    const { occurrence } = item;
    line2 = (
      <>
        <span className="text-[#A01F23] font-bold">
          {relativeDayLabel(occurrence.dateKey)}
          {occurrence.time ? ` ${formatTimeShort(occurrence.time)}` : ''}, not
          confirmed
        </span>
        {lead.phone ? ` · call ${formatPhone(lead.phone)}` : ''}
      </>
    );
    action = (
      <Button
        size="sm"
        variant="outline"
        className="min-h-[44px]"
        disabled={busy}
        onClick={() => actions.markConfirmed(lead)}
      >
        Mark confirmed
      </Button>
    );
  } else if (item.reason === 'record_outcome') {
    const { followUp } = item;
    const dateLabel = formatDate(followUp.lastPastDateKey + 'T12:00:00');
    line2 = followUp.noShow
      ? `No-show ${dateLabel}${followUp.newLinkSent ? ' · new link sent' : ''}`
      : `Was ${dateLabel} · did they come in?`;
    action =
      followUp.noShow && !followUp.newLinkSent ? (
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px]"
          disabled={busy}
          onClick={() => actions.resendBookingLink(lead)}
        >
          Send new link
        </Button>
      ) : (
        <RecordOutcomeButton lead={lead} />
      );
  } else if (item.reason === 'email_failed') {
    line2 = 'Confirmation email failed';
    action = (
      <Button
        size="sm"
        variant="outline"
        className="min-h-[44px]"
        disabled={actions.sendingReminderId === lead.lead_id}
        onClick={() => actions.sendReminder(lead)}
      >
        Retry email
      </Button>
    );
  } else {
    const { daysWaiting } = item;
    line2 = `Invite sent ${daysWaiting} days ago · hasn't booked.${
      lead.phone ? ` · ${formatPhone(lead.phone)}` : ''
    }`;
    action = (
      <Button
        size="sm"
        variant="outline"
        className="min-h-[44px]"
        disabled={busy}
        onClick={() => actions.resendBookingLink(lead)}
      >
        Resend invite
      </Button>
    );
  }

  return (
    <LeadRow
      id={'lead-' + lead.lead_id}
      highlighted={highlightedLeadId === lead.lead_id}
      title={lead.parent_name}
      titleMeta={childSummary(lead)}
      line2={line2}
      action={action}
      onOpen={() => onOpenLead(lead.lead_id)}
    />
  );
}
