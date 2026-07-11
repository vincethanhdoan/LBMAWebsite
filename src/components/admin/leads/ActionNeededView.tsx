import { Button } from '../../ui/button';
import { Loader2, Mail, Phone, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import type { EnrollmentLead } from '../../../lib/types';
import { formatPhone, relativeDayLabel } from '../../../lib/format';
import { effectiveConfirmationNotification, getLeadPrimaryDate, formatDate } from './leadDisplay';
import { AgingIndicator } from './LeadCard';
import type { ActionNeededItem } from './actionNeeded';
import type { useLeadActions } from './useLeadActions';

const SECTIONS = [
  { reason: 'unconfirmed_soon', title: 'Confirm soon' },
  { reason: 'awaiting_decision', title: 'Awaiting decision' },
  { reason: 'email_failed', title: 'Email failed' },
] as const;

function childrenSummary(lead: EnrollmentLead): string {
  if (lead.children?.length) return lead.children.map(c => c.name).join(', ');
  return lead.student_name ?? '';
}

interface ActionNeededViewProps {
  items: ActionNeededItem[];
  now: number;
  actions: ReturnType<typeof useLeadActions>;
  onPickDate: (lead: EnrollmentLead) => void;
  onDeny: (lead: EnrollmentLead) => void;
}

export function ActionNeededView({ items, now, actions, onPickDate, onDeny }: ActionNeededViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium">All caught up.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New leads and appointment reminders will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map(section => {
        const sectionItems = items.filter(i => i.reason === section.reason);
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.reason} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{section.title}</h3>
            <div className="space-y-2">
              {sectionItems.map(item => (
                <ActionRow
                  key={item.lead.lead_id}
                  item={item}
                  now={now}
                  actions={actions}
                  onPickDate={onPickDate}
                  onDeny={onDeny}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionRow({
  item,
  now,
  actions,
  onPickDate,
  onDeny,
}: {
  item: ActionNeededItem;
  now: number;
  actions: ReturnType<typeof useLeadActions>;
  onPickDate: (lead: EnrollmentLead) => void;
  onDeny: (lead: EnrollmentLead) => void;
}) {
  const { lead, reason } = item;
  const summary = childrenSummary(lead);
  const confirmationEmail = effectiveConfirmationNotification(lead);
  const isProminentPhone = reason === 'unconfirmed_soon';

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-base leading-tight">{lead.parent_name}</div>
          {summary && <div className="text-sm text-muted-foreground truncate">{summary}</div>}
        </div>
        {reason === 'unconfirmed_soon' && <ConfirmByChip dateKey={getLeadPrimaryDate(lead)} />}
        {reason === 'awaiting_decision' && <AgingIndicator createdAt={lead.created_at} now={now} />}
        {reason === 'email_failed' && (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Email failed
          </span>
        )}
      </div>

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
            className={
              isProminentPhone
                ? 'flex items-center gap-1.5 font-semibold text-primary hover:underline'
                : 'flex items-center gap-1.5 text-muted-foreground hover:text-foreground'
            }
          >
            <Phone className="w-3.5 h-3.5" />
            {formatPhone(lead.phone)}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {reason === 'unconfirmed_soon' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] gap-1.5"
              disabled={actions.sendingReminderId === lead.lead_id}
              onClick={() => actions.sendReminder(lead)}
            >
              {actions.sendingReminderId === lead.lead_id ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
              ) : confirmationEmail?.status === 'failed' ? (
                <><AlertCircle className="w-3.5 h-3.5 text-[#A01F23]" />Retry Confirmation</>
              ) : (
                <><Send className="w-3.5 h-3.5" />Send Confirmation</>
              )}
            </Button>
            <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => onPickDate(lead)}>
              Pick New Date
            </Button>
          </>
        )}
        {reason === 'awaiting_decision' && (
          <>
            <Button
              size="sm"
              className="min-h-[44px]"
              disabled={actions.busyLeadIds.has(lead.lead_id)}
              onClick={() => actions.approve(lead)}
            >
              Approve &amp; Send Invites
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] text-destructive border-destructive/40 hover:bg-destructive/5"
              onClick={() => onDeny(lead)}
            >
              Deny
            </Button>
          </>
        )}
        {reason === 'email_failed' && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] gap-1.5"
            disabled={actions.sendingReminderId === lead.lead_id}
            onClick={() => actions.sendReminder(lead)}
          >
            {actions.sendingReminderId === lead.lead_id ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
            ) : (
              <><AlertCircle className="w-3.5 h-3.5 text-[#A01F23]" />Retry Confirmation</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ConfirmByChip({ dateKey }: { dateKey: string | null }) {
  if (!dateKey) return null;
  const relative = relativeDayLabel(dateKey);
  return (
    <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
      Confirm by {formatDate(dateKey + 'T12:00:00')}{relative && ` · ${relative}`}
    </span>
  );
}
