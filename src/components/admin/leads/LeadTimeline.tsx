import { Check, Clock, AlertCircle } from 'lucide-react';
import type {
  EnrollmentLead,
  EnrollmentLeadNotification,
} from '../../../lib/types';
import { formatDateConcise } from './leadDisplay';
import { buildTimelineEntries } from './timelineEntries';

// Status pill styling mirrors ReminderStatusBadge (sent green / queued amber / failed red).
function StatusPill({
  status,
}: {
  status: EnrollmentLeadNotification['status'];
}) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success-fg border border-status-success-border">
        <Check className="w-3 h-3 flex-shrink-0" />
        Sent
      </span>
    );
  }
  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-status-warning-bg text-status-warning-fg border border-status-warning-border">
        <Clock className="w-3 h-3 flex-shrink-0" />
        Queued
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-status-danger-bg text-status-danger-fg border border-status-danger-border">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      Failed
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const time = new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatDateConcise(iso)} · ${time}`;
}

export function LeadTimeline({ lead }: { lead: EnrollmentLead }) {
  const entries = buildTimelineEntries(lead);

  return (
    <ol className="flex flex-col gap-2.5">
      {entries.map((entry) => (
        <li key={entry.key} className="flex items-start gap-2.5 text-xs">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <span className="font-medium text-foreground">{entry.label}</span>
              {entry.status && <StatusPill status={entry.status} />}
            </div>
            {(entry.recipient || entry.timestamp) && (
              <div className="text-muted-foreground mt-0.5 truncate">
                {entry.recipient && <span>{entry.recipient}</span>}
                {entry.recipient && entry.timestamp && <span> · </span>}
                {entry.timestamp && (
                  <span>{formatTimestamp(entry.timestamp)}</span>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
