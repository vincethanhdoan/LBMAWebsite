import type { EnrollmentLead, EnrollmentLeadNotification } from '../../../lib/types';

const EMAIL_LABELS: Record<string, string> = {
  new_lead: 'Admin alert email',
  submission: 'Submission receipt',
  approval: 'Booking invite email',
  booking_confirmation: 'Booking receipt email',
  reminder: 'Confirmation email',
  denial: 'Denial email',
};

export type TimelineEntry = {
  key: string;
  label: string;
  timestamp: string | null;
  recipient?: string | null;
  status?: EnrollmentLeadNotification['status'];
};

export function buildTimelineEntries(lead: EnrollmentLead): TimelineEntry[] {
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
