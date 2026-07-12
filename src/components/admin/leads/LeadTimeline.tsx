import { useState } from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import type { EnrollmentLead, EnrollmentLeadNotification } from '../../../lib/types';
import { formatDateConcise } from './leadDisplay';

const EMAIL_LABELS: Record<string, string> = {
  new_lead: 'Admin alert email',
  submission: 'Submission receipt',
  approval: 'Booking invite email',
  booking_confirmation: 'Confirmation email',
  reminder: 'Reminder email',
  denial: 'Denial email',
};

// Status pill styling mirrors ReminderStatusBadge (sent green / queued amber / failed red).
function StatusPill({ status }: { status: EnrollmentLeadNotification['status'] }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]">
        <Check className="w-3 h-3 flex-shrink-0" />
        Sent
      </span>
    );
  }
  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
        <Clock className="w-3 h-3 flex-shrink-0" />
        Queued
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      Failed
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const time = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${formatDateConcise(iso)} · ${time}`;
}

type TimelineEntry = {
  key: string;
  label: string;
  timestamp: string | null;
  recipient?: string | null;
  status?: EnrollmentLeadNotification['status'];
};

function buildEntries(lead: EnrollmentLead): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Current-state lines have no timestamp column; surface them at the top.
  if (lead.status === 'enrolled') {
    entries.push({ key: 'state-enrolled', label: 'Marked enrolled', timestamp: null });
  } else if (lead.status === 'closed') {
    entries.push({ key: 'state-closed', label: 'Marked closed', timestamp: null });
  }

  entries.push({ key: 'milestone-created', label: 'Lead received', timestamp: lead.created_at });
  if (lead.approved_at) {
    entries.push({ key: 'milestone-approved', label: 'Approved', timestamp: lead.approved_at });
  }
  if (lead.denied_at) {
    entries.push({ key: 'milestone-denied', label: 'Denied', timestamp: lead.denied_at });
  }
  if (lead.attendance_status && lead.attendance_recorded_at) {
    entries.push({
      key: 'milestone-attendance',
      label: lead.attendance_status === 'attended' ? 'Marked attended' : 'Marked no-show',
      timestamp: lead.attendance_recorded_at,
    });
  }

  const parentEmail = lead.parent_email.trim().toLowerCase();
  for (const n of lead.notificationHistory) {
    // Admin alert emails are internal plumbing, not lead history.
    if (n.type === 'new_lead') continue;
    entries.push({
      key: `email-${n.notification_id}`,
      label: EMAIL_LABELS[n.type] ?? n.type,
      timestamp: n.created_at,
      // The family's own address is implied; show a recipient only when it differs.
      recipient:
        n.recipient_email && n.recipient_email.trim().toLowerCase() !== parentEmail
          ? n.recipient_email
          : null,
      status: n.status,
    });
  }

  // Newest-first; timestamp-less current-state lines sort ahead of dated entries.
  return entries.sort((a, b) => {
    if (a.timestamp === null && b.timestamp === null) return 0;
    if (a.timestamp === null) return -1;
    if (b.timestamp === null) return 1;
    return b.timestamp.localeCompare(a.timestamp);
  });
}

const COLLAPSED_ENTRY_COUNT = 3;

export function LeadTimeline({ lead }: { lead: EnrollmentLead }) {
  const [showAll, setShowAll] = useState(false);
  const entries = buildEntries(lead);
  const visible = showAll ? entries : entries.slice(0, COLLAPSED_ENTRY_COUNT);
  const hiddenCount = entries.length - visible.length;

  return (
    <ol className="flex flex-col gap-2.5">
      {visible.map(entry => (
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
                {entry.timestamp && <span>{formatTimestamp(entry.timestamp)}</span>}
              </div>
            )}
          </div>
        </li>
      ))}
      {hiddenCount > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Show all activity ({entries.length})
          </button>
        </li>
      )}
    </ol>
  );
}
