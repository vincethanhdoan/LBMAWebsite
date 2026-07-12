import { useEffect, useRef, useState } from 'react';
import { X, Pencil, Check, MoreVertical, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { StatusBadge } from './ui';
import { LeadTimeline } from './LeadTimeline';
import { buildTimelineEntries } from './timelineEntries';
import { RecordOutcomeButton } from './RecordOutcomePopover';
import {
  PROGRAM_LABELS,
  STATUS_LABELS,
  formatDateConcise,
  formatTimeShort,
  effectiveConfirmationNotification,
} from './leadDisplay';
import { childSummary, getAppointmentOccurrences } from './leadViews';
import type { useLeadActions } from './useLeadActions';
import { formatPhone } from '../../../lib/format';
import { pacificTodayISO } from '../../../lib/pacificTime';
import { useUpdateLeadNotes, useUpdateLeadStatus, useCloseLead } from '../../../lib/hooks/leads';
import type { EnrollmentLead, EnrollmentLeadProgramBooking } from '../../../lib/types';

const ACTIVE_STATUSES: EnrollmentLead['status'][] = [
  'approved',
  'appointment_scheduled',
  'appointment_confirmed',
];

function HeaderStatus({ lead }: { lead: EnrollmentLead }) {
  switch (lead.status) {
    case 'new':
      return <StatusBadge kind="new" />;
    case 'appointment_scheduled':
      return <StatusBadge kind="unconfirmed" />;
    case 'appointment_confirmed':
      return <StatusBadge kind="confirmed" />;
    case 'enrolled':
      return <StatusBadge kind="enrolled" />;
    case 'closed':
      return <StatusBadge kind="closed" />;
    case 'denied':
      return <StatusBadge kind="denied" />;
    case 'approved':
      return <span className="text-[11px] text-muted-foreground">{STATUS_LABELS.approved}</span>;
  }
}

function formatVisit(date: string, time: string | null): string {
  const d = new Date(date + 'T12:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dateLabel = `${weekday}, ${formatDateConcise(date + 'T12:00:00')}`;
  return time ? `${dateLabel} at ${formatTimeShort(time)}` : dateLabel;
}

export function LeadDetailPanel({
  lead,
  onClose,
  actions,
  onEdit,
  onDeny,
  onPickDate,
  onResend,
  onDismiss,
  onArchive,
}: {
  lead: EnrollmentLead;
  onClose: () => void;
  actions: ReturnType<typeof useLeadActions>;
  onEdit: (lead: EnrollmentLead) => void;
  onDeny: (lead: EnrollmentLead) => void;
  onPickDate: (lead: EnrollmentLead) => void;
  onResend: (lead: EnrollmentLead) => void;
  onDismiss: (lead: EnrollmentLead) => void;
  onArchive: (lead: EnrollmentLead) => void;
}) {
  const updateStatus = useUpdateLeadStatus();
  const closeLead = useCloseLead();
  const updateNotes = useUpdateLeadNotes();

  const leadIdRef = useRef(lead.lead_id);
  useEffect(() => {
    leadIdRef.current = lead.lead_id;
  }, [lead.lead_id]);

  const [notesDraft, setNotesDraft] = useState(lead.admin_notes ?? '');
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  // Re-seed notes state when the shell swaps the displayed lead on a mounted
  // panel, so one lead's draft can never be shown for or saved onto another.
  const [notesLeadId, setNotesLeadId] = useState(lead.lead_id);
  if (notesLeadId !== lead.lead_id) {
    setNotesLeadId(lead.lead_id);
    setNotesDraft(lead.admin_notes ?? '');
    setNotesEditing(false);
    setNotesSaved(false);
    setNotesError(false);
    setActivityOpen(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Radix dialogs stacked above the panel prevent default on the Esc that
      // closed them; only an unclaimed Esc closes the panel itself.
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const bookings = lead.programBookings ?? [];
  const hasAppointmentSection = bookings.length > 0 || lead.appointment_date !== null;
  const confirmationEmail = effectiveConfirmationNotification(lead);

  const today = pacificTodayISO();
  const hasPastAppointment = getAppointmentOccurrences([lead]).some(o => o.dateKey < today);
  const isActive = ACTIVE_STATUSES.includes(lead.status);
  const busy = actions.busyLeadIds.has(lead.lead_id);
  const hasAppointmentDate =
    lead.appointment_date !== null || bookings.some(b => b.appointment_date !== null);

  function openNotesEditor() {
    setNotesSaved(false);
    setNotesEditing(true);
  }

  function saveNotes() {
    const savedLeadId = lead.lead_id;
    const trimmed = notesDraft.trim();
    setNotesError(false);
    updateNotes.mutate(
      { leadId: savedLeadId, notes: trimmed },
      {
        // If the shell swapped the displayed lead while the save was in
        // flight, leave the freshly seeded state for the new lead untouched.
        onSuccess: () => {
          if (leadIdRef.current !== savedLeadId) return;
          setNotesDraft(trimmed);
          setNotesEditing(false);
          setNotesSaved(true);
        },
        onError: () => {
          if (leadIdRef.current !== savedLeadId) return;
          setNotesError(true);
        },
      },
    );
  }

  function reopen() {
    updateStatus.mutate({
      leadId: lead.lead_id,
      status: hasAppointmentDate ? 'appointment_confirmed' : 'approved',
    });
  }

  const primaryAction: { label: string; run: () => void } | null = (() => {
    switch (lead.status) {
      case 'new':
        return { label: 'Approve and send invites', run: () => actions.approve(lead) };
      case 'appointment_scheduled':
        return { label: 'Mark confirmed', run: () => actions.markConfirmed(lead) };
      case 'appointment_confirmed':
        return {
          label: 'Mark enrolled',
          run: () => updateStatus.mutate({ leadId: lead.lead_id, status: 'enrolled' }),
        };
      default:
        return null;
    }
  })();

  // The visit is what staff opens the panel for; it renders as the hero card.
  // Program and kids are supporting context; per-program status appears only
  // when multiple bookings could disagree with the header badge.
  function renderBooking(booking: EnrollmentLeadProgramBooking) {
    const kids = lead.children?.filter(c => c.program_type === booking.program_type) ?? [];
    const booked =
      (booking.status === 'scheduled' || booking.status === 'confirmed') &&
      booking.appointment_date !== null;
    const context = [
      PROGRAM_LABELS[booking.program_type],
      bookings.length > 1 && kids.length > 0
        ? kids.map(c => `${c.name} · age ${c.age}`).join(', ')
        : null,
      bookings.length > 1 && booked
        ? booking.status === 'confirmed' ? 'Confirmed' : 'Not confirmed'
        : null,
    ].filter(Boolean).join(' · ');
    return (
      <div key={booking.booking_id} className="rounded-lg border border-border bg-background px-3.5 py-2.5">
        {booked ? (
          <div className="text-[15px] font-semibold leading-snug">
            {formatVisit(booking.appointment_date as string, booking.appointment_time)}
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground">Invite sent, not booked yet</div>
        )}
        <div className="text-[11px] text-muted-foreground mt-0.5">{context}</div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold leading-tight">{lead.parent_name}</span>
              <HeaderStatus lead={lead} />
            </div>
            {childSummary(lead) && (
              <div className="text-[11px] text-muted-foreground">{childSummary(lead)}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* The visit comes first: it is what staff opens the panel to see. */}
          {hasAppointmentSection && (
            <div className="space-y-2">
              {bookings.length > 0 ? (
                bookings.map(renderBooking)
              ) : (
                <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
                  <div className="text-[15px] font-semibold leading-snug">
                    {formatVisit(lead.appointment_date as string, lead.appointment_time)}
                  </div>
                  {lead.student_name && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {lead.student_name}
                      {lead.student_age !== null ? ` · age ${lead.student_age}` : ''}
                    </div>
                  )}
                </div>
              )}
              {/* Email state only when it still needs something from staff or family. */}
              {lead.status === 'appointment_scheduled' && !confirmationEmail && (
                <div className="text-[11px] flex items-center gap-2">
                  <span className="text-muted-foreground">No confirmation email sent</span>
                  <button
                    type="button"
                    onClick={() => actions.sendReminder(lead)}
                    disabled={actions.sendingReminderId === lead.lead_id}
                    className="font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {actions.sendingReminderId === lead.lead_id ? 'Sending…' : 'Send confirmation email'}
                  </button>
                </div>
              )}
              {lead.status === 'appointment_scheduled' &&
                (confirmationEmail?.status === 'sent' || confirmationEmail?.status === 'queued') && (
                  <div className="text-[11px] text-muted-foreground">
                    {confirmationEmail.status === 'sent'
                      ? `Confirmation email sent ${formatDateConcise(confirmationEmail.created_at)}, waiting on the family`
                      : 'Confirmation email queued'}
                  </div>
                )}
              {confirmationEmail?.status === 'failed' && (
                <div className="text-[11px] flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[#A01F23]">
                    <AlertCircle className="w-3 h-3" />
                    Confirmation email failed
                  </span>
                  <button
                    type="button"
                    onClick={() => actions.sendReminder(lead)}
                    disabled={actions.sendingReminderId === lead.lead_id}
                    className="font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {actions.sendingReminderId === lead.lead_id ? 'Sending…' : 'Retry'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="space-y-1">
            <a
              href={`mailto:${lead.parent_email}`}
              className="block text-[13px] text-primary hover:underline break-all"
            >
              {lead.parent_email}
            </a>
            {lead.phone && (
              <div className="text-[13px] text-muted-foreground">{formatPhone(lead.phone)}</div>
            )}
          </div>

          {/* The family's inquiry message, quoted */}
          {lead.message && (
            <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-3">
              {lead.message}
            </p>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            {notesEditing ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  rows={3}
                  placeholder="Internal notes (only visible to admins)…"
                  className="w-full text-[13px] px-3 py-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                />
                {notesError && (
                  <p className="text-[11px] text-destructive">{"Couldn't save, try again"}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveNotes} disabled={updateNotes.isPending}>
                    {updateNotes.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => {
                      setNotesEditing(false);
                      setNotesError(false);
                      setNotesDraft(lead.admin_notes ?? '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : notesDraft.trim() ? (
              <div className="flex items-start gap-2 group">
                <p className="flex-1 text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {notesDraft}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {notesSaved && <Check className="w-3.5 h-3.5 text-green-600" />}
                  <button
                    type="button"
                    onClick={openNotesEditor}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Edit notes"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openNotesEditor}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Add a note
              </button>
            )}
          </div>

          {/* Activity, collapsed to one row until asked for */}
          <div>
            <button
              type="button"
              onClick={() => setActivityOpen(o => !o)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${activityOpen ? 'rotate-90' : ''}`}
              />
              Activity ({buildTimelineEntries(lead).length})
            </button>
            {activityOpen && (
              <div className="mt-3 pl-1">
                <LeadTimeline lead={lead} />
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex flex-wrap items-center gap-2">
          {primaryAction && (
            <Button size="sm" onClick={primaryAction.run} disabled={busy || updateStatus.isPending}>
              {primaryAction.label}
            </Button>
          )}
          {(lead.status === 'approved' ||
            lead.status === 'appointment_scheduled' ||
            lead.status === 'appointment_confirmed') && (
            <>
              <Button size="sm" variant="outline" onClick={() => onPickDate(lead)}>
                Pick new date
              </Button>
              <Button size="sm" variant="outline" onClick={() => onResend(lead)}>
                Resend invites
              </Button>
            </>
          )}
          {hasPastAppointment && isActive && (
            <RecordOutcomeButton lead={lead} onClosed={onClose} />
          )}
          {lead.status === 'new' && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/5"
              onClick={() => onDeny(lead)}
            >
              Deny
            </Button>
          )}
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              className="text-muted-foreground"
              disabled={closeLead.isPending}
              onClick={() => closeLead.mutate(lead.lead_id)}
            >
              Close lead
            </Button>
          )}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(lead)}>Edit lead</DropdownMenuItem>
                {(lead.status === 'enrolled' || lead.status === 'closed') && (
                  <DropdownMenuItem onSelect={reopen} disabled={updateStatus.isPending}>
                    Reopen
                  </DropdownMenuItem>
                )}
                {lead.status === 'new' && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => onDismiss(lead)}
                  >
                    Dismiss silently
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => onArchive(lead)}
                >
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}
