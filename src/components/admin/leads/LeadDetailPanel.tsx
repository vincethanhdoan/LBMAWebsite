import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  X,
  Pencil,
  Check,
  MoreVertical,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { ActionButton, StatusBadge } from './ui';
import { LeadTimeline } from './LeadTimeline';
import { buildTimelineEntries } from './timelineEntries';
import { RecordOutcomeButton } from './RecordOutcomePopover';
import {
  PROGRAM_LABELS,
  STATUS_LABELS,
  formatDateConcise,
  formatTimeShort,
  effectiveConfirmationNotification,
  toLocalDateKey,
} from './leadDisplay';
import {
  childSummary,
  deriveLeadStatusFromBookings,
  getAppointmentOccurrences,
} from './leadViews';
import type { useLeadActions } from './useLeadActions';
import { formatPhone } from '../../../lib/format';
import { pacificTodayISO } from '../../../lib/pacificTime';
import {
  useUpdateLeadNotes,
  useUpdateLeadStatus,
  useCloseLead,
} from '../../../lib/hooks/leads';
import type {
  EnrollmentLead,
  EnrollmentLeadProgramBooking,
} from '../../../lib/types';

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
    case 'attended':
      return <StatusBadge kind="attended" />;
    case 'no_show':
      return <StatusBadge kind="no_show" />;
    case 'closed':
      return <StatusBadge kind="closed" />;
    case 'denied':
      return <StatusBadge kind="denied" />;
    case 'approved':
      return (
        <span className="text-[11px] text-muted-foreground">
          {STATUS_LABELS.approved}
        </span>
      );
  }
}

// Quiet group label for the drawer body. Lighter than the page-level
// SectionHeader: a small uppercase micro-label, no counts or borders.
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
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
  onDelete,
}: {
  lead: EnrollmentLead;
  onClose: () => void;
  actions: ReturnType<typeof useLeadActions>;
  onEdit: (lead: EnrollmentLead) => void;
  onDeny: (lead: EnrollmentLead) => void;
  onPickDate: (lead: EnrollmentLead) => void;
  onResend: (lead: EnrollmentLead) => void;
  onDismiss: (lead: EnrollmentLead) => void;
  onDelete: (lead: EnrollmentLead) => void;
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
    if (!notesSaved) return;
    const t = setTimeout(() => setNotesSaved(false), 2500);
    return () => clearTimeout(t);
  }, [notesSaved]);

  const panelRef = useRef<HTMLDivElement>(null);

  const bookings = lead.programBookings ?? [];
  const hasAppointmentSection =
    bookings.length > 0 || lead.appointment_date !== null;
  const confirmationEmail = effectiveConfirmationNotification(lead);

  const today = pacificTodayISO();
  const occurrences = getAppointmentOccurrences([lead]);
  const hasPastAppointment = occurrences.some((o) => o.dateKey < today);

  // The confirm-attendance email auto-sends 2 days before the visit (daily
  // cron); until then the panel shows the scheduled date with a send-now option.
  const autoSendDateKey = (() => {
    const next = occurrences.find((o) => o.dateKey >= today);
    if (!next) return null;
    const d = new Date(next.dateKey + 'T12:00:00');
    d.setDate(d.getDate() - 2);
    const key = toLocalDateKey(d);
    return key > today ? key : null;
  })();
  const isActive = ACTIVE_STATUSES.includes(lead.status);
  const busy = actions.busyLeadIds.has(lead.lead_id);

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

  // Recompute the reopened status from the bookings themselves (cancelled ones
  // don't count) so a reopened lead can't claim an appointment it no longer
  // has. Legacy leads without program bookings keep the old date-based guess.
  function reopen() {
    const status =
      bookings.length > 0
        ? deriveLeadStatusFromBookings(bookings)
        : lead.appointment_date !== null
          ? 'appointment_confirmed'
          : 'approved';
    updateStatus.mutate({ leadId: lead.lead_id, status });
  }

  const primaryAction: { label: string; run: () => void } | null = (() => {
    switch (lead.status) {
      case 'new':
        return {
          label: 'Approve and send invites',
          run: () => actions.approve(lead),
        };
      case 'appointment_scheduled':
        return {
          label: 'Mark confirmed',
          run: () => actions.markConfirmed(lead),
        };
      default:
        return null;
    }
  })();

  // The visit is what staff opens the panel for; it renders as the hero card.
  // Program and kids are supporting context; per-program status appears only
  // when multiple bookings could disagree with the header badge.
  function renderBooking(booking: EnrollmentLeadProgramBooking) {
    const kids =
      lead.children?.filter((c) => c.program_type === booking.program_type) ??
      [];
    const booked =
      (booking.status === 'scheduled' || booking.status === 'confirmed') &&
      booking.appointment_date !== null;
    const cancelled = booking.status === 'cancelled';
    const context = [
      PROGRAM_LABELS[booking.program_type],
      bookings.length > 1 && kids.length > 0
        ? kids.map((c) => `${c.name} · age ${c.age}`).join(', ')
        : null,
      bookings.length > 1 && booked
        ? booking.status === 'confirmed'
          ? 'Confirmed'
          : 'Not confirmed'
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <div
        key={booking.booking_id}
        className="rounded-lg border border-border bg-background px-3.5 py-2.5"
      >
        {booked ? (
          <div className="text-[15px] font-semibold leading-snug">
            {formatVisit(
              booking.appointment_date as string,
              booking.appointment_time,
            )}
          </div>
        ) : cancelled ? (
          <div className="text-[13px] text-muted-foreground">
            Visit cancelled, booking link still active
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground">
            Invite sent, not booked yet
          </div>
        )}
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {context}
        </div>
      </div>
    );
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/20 z-40" />
        <DialogPrimitive.Content
          ref={panelRef}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            panelRef.current?.focus();
          }}
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border overflow-y-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogPrimitive.Title asChild>
                  <span className="text-[15px] font-semibold leading-tight">
                    {lead.parent_name}
                  </span>
                </DialogPrimitive.Title>
                <HeaderStatus lead={lead} />
              </div>
              {childSummary(lead) && (
                <div className="text-[11px] text-muted-foreground">
                  {childSummary(lead)}
                </div>
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
                      {formatVisit(
                        lead.appointment_date as string,
                        lead.appointment_time,
                      )}
                    </div>
                    {lead.student_name && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {lead.student_name}
                        {lead.student_age !== null
                          ? ` · age ${lead.student_age}`
                          : ''}
                      </div>
                    )}
                  </div>
                )}
                {/* Email state only when it still needs something from staff or family. */}
                {lead.status === 'appointment_scheduled' &&
                  !confirmationEmail && (
                    <div className="text-[11px] flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {autoSendDateKey
                          ? `Confirmation email will be sent ${formatDateConcise(autoSendDateKey + 'T12:00:00')}`
                          : 'No confirmation email sent'}
                      </span>
                      <button
                        type="button"
                        onClick={() => actions.sendReminder(lead)}
                        disabled={actions.sendingReminderId === lead.lead_id}
                        className="font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {actions.sendingReminderId === lead.lead_id
                          ? 'Sending…'
                          : autoSendDateKey
                            ? 'Send now'
                            : 'Send confirmation email'}
                      </button>
                    </div>
                  )}
                {lead.status === 'appointment_scheduled' &&
                  (confirmationEmail?.status === 'sent' ||
                    confirmationEmail?.status === 'queued') && (
                    <div className="text-[11px] flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {confirmationEmail.status === 'sent'
                          ? `Confirmation email sent ${formatDateConcise(confirmationEmail.created_at)}, waiting on the family`
                          : 'Confirmation email queued'}
                      </span>
                      {confirmationEmail.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => actions.sendReminder(lead)}
                          disabled={actions.sendingReminderId === lead.lead_id}
                          className="font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          {actions.sendingReminderId === lead.lead_id
                            ? 'Sending…'
                            : 'Resend'}
                        </button>
                      )}
                    </div>
                  )}
                {confirmationEmail?.status === 'failed' && (
                  <div className="text-[11px] flex items-center gap-2">
                    <span className="flex items-center gap-1 text-status-danger-fg">
                      <AlertCircle className="w-3 h-3" />
                      Confirmation email failed
                    </span>
                    <button
                      type="button"
                      onClick={() => actions.sendReminder(lead)}
                      disabled={actions.sendingReminderId === lead.lead_id}
                      className="font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {actions.sendingReminderId === lead.lead_id
                        ? 'Sending…'
                        : 'Retry'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Contact */}
            <div className="space-y-1.5">
              <SectionLabel>Contact</SectionLabel>
              <a
                href={`mailto:${lead.parent_email}`}
                className="block text-[13px] text-primary hover:underline break-all"
              >
                {lead.parent_email}
              </a>
              {lead.phone && (
                <div className="text-[13px] text-muted-foreground">
                  {formatPhone(lead.phone)}
                </div>
              )}
            </div>

            {/* The family's inquiry message, quoted */}
            {lead.message && (
              <div className="space-y-1.5">
                <SectionLabel>Inquiry message</SectionLabel>
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-3">
                  {lead.message}
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <SectionLabel>Notes</SectionLabel>
              {notesEditing ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={3}
                    placeholder="Internal notes (only visible to admins)…"
                    className="w-full text-[13px] px-3 py-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                  />
                  {notesError && (
                    <p className="text-[11px] text-destructive">
                      {"Couldn't save notes. Please try again."}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={saveNotes}
                      disabled={updateNotes.isPending}
                    >
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
                    {notesSaved && (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    )}
                    <button
                      type="button"
                      onClick={openNotesEditor}
                      className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit notes
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
                onClick={() => setActivityOpen((o) => !o)}
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
              <ActionButton
                onClick={primaryAction.run}
                disabled={busy || updateStatus.isPending}
              >
                {primaryAction.label}
              </ActionButton>
            )}
            {(lead.status === 'approved' ||
              lead.status === 'appointment_scheduled' ||
              lead.status === 'appointment_confirmed') && (
              <>
                <ActionButton
                  variant="outline"
                  onClick={() => onPickDate(lead)}
                >
                  Pick new date
                </ActionButton>
                <ActionButton variant="outline" onClick={() => onResend(lead)}>
                  Resend invites
                </ActionButton>
              </>
            )}
            {hasPastAppointment && isActive && (
              <RecordOutcomeButton lead={lead} onClosed={onClose} />
            )}
            {isActive && (
              <ActionButton
                variant="outline"
                className="text-muted-foreground"
                disabled={closeLead.isPending}
                onClick={() => closeLead.mutate(lead.lead_id)}
              >
                Close lead
              </ActionButton>
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
                  <DropdownMenuItem onSelect={() => onEdit(lead)}>
                    Edit lead
                  </DropdownMenuItem>
                  {(lead.status === 'attended' ||
                    lead.status === 'no_show' ||
                    lead.status === 'closed') && (
                    <DropdownMenuItem
                      onSelect={reopen}
                      disabled={updateStatus.isPending}
                    >
                      Reopen
                    </DropdownMenuItem>
                  )}
                  {lead.status === 'new' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => onDeny(lead)}
                      >
                        Deny…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => onDismiss(lead)}
                      >
                        Deny silently
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => onDelete(lead)}
                  >
                    Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
