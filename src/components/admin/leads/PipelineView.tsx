import type { ReactNode } from 'react';
import type { EnrollmentLead } from '../../../lib/types';
import { Button } from '../../ui/button';
import { formatPhone } from '../../../lib/format';
import { childSummary, daysSince, STALE_INQUIRY_DAYS, STALE_INVITE_DAYS } from './leadViews';
import { PROGRAM_LABELS } from './leadDisplay';
import { LeadRow, SectionHeader, Surface } from './ui';
import type { useLeadActions } from './useLeadActions';

function relativeAge(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function EmptySection({ text }: { text: string }): JSX.Element {
  return <p className="py-8 text-center text-[13px] text-muted-foreground">{text}</p>;
}

export function PipelineView({
  leads,
  now,
  actions,
  onOpenLead,
  onDeny,
  onNewLead,
  highlightedLeadId,
}: {
  leads: EnrollmentLead[];
  now: number;
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  onDeny: (lead: EnrollmentLead) => void;
  onNewLead: () => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const newInquiries = leads
    .filter(lead => lead.status === 'new')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const invited = leads
    .filter(
      lead =>
        lead.status === 'approved' &&
        (lead.programBookings?.length
          ? lead.programBookings.some(b => !b.appointment_date)
          : !lead.appointment_date),
    )
    .sort((a, b) => inviteSentDate(a).localeCompare(inviteSentDate(b)));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pipeline</h2>
        <Button variant="outline" onClick={onNewLead}>
          + New Lead
        </Button>
      </div>

      <section>
        <SectionHeader
          title="New inquiries"
          count={newInquiries.length}
          hint="approve to send a booking invite"
        />
        {newInquiries.length === 0 ? (
          <EmptySection text="No new inquiries. Website inquiries appear here." />
        ) : (
          <Surface>
            {newInquiries.map(lead => (
              <LeadRow
                key={lead.lead_id}
                id={'lead-' + lead.lead_id}
                highlighted={highlightedLeadId === lead.lead_id}
                title={lead.parent_name}
                titleMeta={childSummary(lead)}
                line2={inquiryLine2(lead, now)}
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
            ))}
          </Surface>
        )}
      </section>

      <section>
        <SectionHeader title="Invited, waiting to book" count={invited.length} />
        {invited.length === 0 ? (
          <EmptySection text="No one is waiting to book." />
        ) : (
          <Surface>
            {invited.map(lead => (
              <InvitedRow
                key={lead.lead_id}
                lead={lead}
                now={now}
                actions={actions}
                onOpenLead={onOpenLead}
                highlightedLeadId={highlightedLeadId}
              />
            ))}
          </Surface>
        )}
      </section>
    </div>
  );
}

function inviteSentDate(lead: EnrollmentLead): string {
  return lead.approval_email_sent_at ?? lead.approved_at ?? lead.created_at;
}

function inquiryLine2(lead: EnrollmentLead, now: number): ReactNode {
  const days = daysSince(lead.created_at, now);
  const timePart =
    days >= STALE_INQUIRY_DAYS ? (
      <span className="text-[#92400E] font-bold">Waiting {days} days</span>
    ) : (
      relativeAge(days)
    );
  const snippet = lead.message.slice(0, 60);
  const message = snippet ? ` · "${snippet}${lead.message.length > 60 ? '…' : ''}"` : '';
  return (
    <>
      {timePart}
      {message}
    </>
  );
}

function InvitedRow({
  lead,
  now,
  actions,
  onOpenLead,
  highlightedLeadId,
}: {
  lead: EnrollmentLead;
  now: number;
  actions: ReturnType<typeof useLeadActions>;
  onOpenLead: (leadId: string) => void;
  highlightedLeadId: string | null;
}): JSX.Element {
  const days = daysSince(inviteSentDate(lead), now);
  const stale = days >= STALE_INVITE_DAYS;

  const someBooked = (lead.programBookings ?? []).some(b => b.appointment_date);
  const unbookedNote = someBooked
    ? (lead.programBookings ?? [])
        .filter(b => !b.appointment_date)
        .map(b => `${PROGRAM_LABELS[b.program_type]} not booked yet`)
        .join(' · ')
    : '';
  const noteSuffix = unbookedNote ? ` · ${unbookedNote}` : '';

  const line2: ReactNode = stale ? (
    <>
      <span className="text-[#92400E] font-bold">
        Invite sent {days} days ago, hasn't booked.
      </span>
      {lead.phone ? ' ' + formatPhone(lead.phone) : ''}
      {noteSuffix}
    </>
  ) : (
    `Invite sent ${relativeAge(days)}${noteSuffix}`
  );

  const chipLabel = days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'}`;
  const badge = (
    <span
      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
        stale ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-muted text-muted-foreground'
      }`}
    >
      {chipLabel}
    </span>
  );

  return (
    <LeadRow
      id={'lead-' + lead.lead_id}
      highlighted={highlightedLeadId === lead.lead_id}
      title={lead.parent_name}
      titleMeta={childSummary(lead)}
      line2={line2}
      badge={badge}
      action={
        stale ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px]"
            disabled={actions.busyLeadIds.has(lead.lead_id)}
            onClick={() => actions.resendBookingLink(lead)}
          >
            Resend invite
          </Button>
        ) : undefined
      }
      onOpen={() => onOpenLead(lead.lead_id)}
    />
  );
}
