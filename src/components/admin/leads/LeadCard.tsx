import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Loader2, Mail, Phone, Calendar, Plus, MoreVertical, Check, Pencil, Clock, AlertCircle, Send } from 'lucide-react';
import type { EnrollmentLead, EnrollmentLeadNotification } from '../../../lib/types';
import {
  PROGRAM_LABELS,
  PROGRAM_BADGE_STYLES,
  formatProgramBookingStatus,
  effectiveConfirmationNotification,
  STATUS_LABELS,
  BADGE_STYLES,
  formatDate,
  getLeadPrimaryTime,
  formatTimeShort,
  hasPastAppointment,
  toLocalDateKey,
  type TabId,
} from './leadDisplay';
import type { useLeadActions } from './useLeadActions';

function ReminderStatusBadge({ notification }: { notification: EnrollmentLeadNotification }) {
  if (notification.status === 'sent') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]">
        <Check className="w-3 h-3 flex-shrink-0" />
        <span>Confirmation sent · {formatDate(notification.created_at)}</span>
      </div>
    )
  }
  if (notification.status === 'queued') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
        <Clock className="w-3 h-3 flex-shrink-0" />
        <span>Confirmation queued</span>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FFF0F0] text-[#A01F23] border border-[rgba(160,31,35,0.2)]">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span>Confirmation email failed</span>
    </div>
  )
}

function ChildrenSection({ lead }: { lead: EnrollmentLead }) {
  const hasChildren = lead.children && lead.children.length > 0
  const hasBookings = lead.programBookings && lead.programBookings.length > 0

  if (!hasChildren && !lead.student_name) return null

  if (!hasChildren) {
    return (
      <p className="text-sm text-muted-foreground">
        [legacy] {lead.student_name}{lead.student_age ? `, age ${lead.student_age}` : ''}
      </p>
    )
  }

  if (!hasBookings) {
    return (
      <div className="flex flex-col gap-1">
        {lead.children.map(c => (
          <div key={c.child_id} className="flex items-center gap-2 text-sm">
            <span>{c.name}</span>
            <span className="text-muted-foreground">age {c.age}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROGRAM_BADGE_STYLES[c.program_type]}`}>
              {PROGRAM_LABELS[c.program_type]}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {lead.programBookings.map(booking => {
        const groupChildren = lead.children.filter(c => c.program_type === booking.program_type)
        return (
          <div key={booking.booking_id}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROGRAM_BADGE_STYLES[booking.program_type]}`}>
                {PROGRAM_LABELS[booking.program_type]}
              </span>
              <span className={`text-xs ${
                booking.status === 'confirmed' ? 'text-green-600 font-medium'
                : booking.status === 'scheduled' ? 'text-green-600'
                : 'text-muted-foreground'
              }`}>
                {formatProgramBookingStatus(booking)}
              </span>
            </div>
            <div className="pl-2 mt-1 flex flex-col gap-0.5">
              {groupChildren.map(c => (
                <span key={c.child_id} className="text-sm text-muted-foreground">
                  {c.name} · age {c.age}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AgingIndicator({ createdAt, now }: { createdAt: string; now: number }) {
  const days = Math.floor((now - new Date(createdAt).getTime()) / 86_400_000);
  const label = days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
  return (
    <span className={`text-xs ${days >= 7 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
      {label}
    </span>
  );
}

interface LeadCardProps {
  lead: EnrollmentLead;
  now: number;
  activeTab: TabId;
  actions: ReturnType<typeof useLeadActions>;
  updatingId: string | null;
  onDeny: (lead: EnrollmentLead) => void;
  onPickDate: (lead: EnrollmentLead) => void;
  onEdit: (lead: EnrollmentLead) => void;
  onDismiss: (lead: EnrollmentLead) => void;
  onArchive: (lead: EnrollmentLead) => void;
  onStatusChange: (leadId: string, status: EnrollmentLead['status']) => void;
  onCloseLead: (leadId: string) => void;
  notes: {
    draft: string;
    expanded: boolean;
    saved: boolean;
    onDraftChange: (value: string) => void;
    onToggle: () => void;
    onSave: () => void;
  };
  messageExpanded: boolean;
  onToggleMessage: () => void;
}

export function LeadCard({
  lead,
  now,
  activeTab,
  actions,
  updatingId,
  onDeny,
  onPickDate,
  onEdit,
  onDismiss,
  onArchive,
  onStatusChange,
  onCloseLead,
  notes,
  messageExpanded,
  onToggleMessage,
}: LeadCardProps) {
  const isCalendarTab = activeTab === 'appointment_scheduled' || activeTab === 'appointment_confirmed';
  const todayKey = toLocalDateKey(new Date());
  const primaryTime = getLeadPrimaryTime(lead);
  const confirmationEmail = effectiveConfirmationNotification(lead);

  return (
    <div
      key={lead.lead_id}
      className={`bg-card rounded-lg border overflow-hidden ${
        lead.status === 'new' ? 'border-primary/25' : 'border-border'
      }`}
    >
      <div className="p-4 space-y-3">

        {/* Row 1: name + time (for calendar tabs) or aging + badge + kebab */}
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold text-base leading-tight">{lead.parent_name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isCalendarTab && primaryTime ? (
              <div className="text-right">
                <div className="text-base font-bold text-primary leading-tight tabular-nums">
                  {formatTimeShort(primaryTime)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mt-0.5">
                  {STATUS_LABELS[lead.status]}
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'new' && <AgingIndicator createdAt={lead.created_at} now={now} />}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[lead.status]}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(lead)}>
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  disabled={lead.status === 'denied'}
                  onSelect={() => onDismiss(lead)}
                >
                  Dismiss silently
                </DropdownMenuItem>
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

        {/* Row 2: contact info */}
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
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Phone className="w-3.5 h-3.5" />
              {lead.phone}
            </a>
          )}
        </div>

        {/* Children / program bookings */}
        {(lead.children?.length > 0 || lead.student_name) && (
          <div className="border-t border-border/50 pt-3">
            <ChildrenSection lead={lead} />
          </div>
        )}

        {/* Approval timestamp — hidden for calendar tabs since date is shown in the group header */}
        {!isCalendarTab && lead.approval_email_sent_at && (
          <div className="text-xs text-muted-foreground">
            Invite sent {formatDate(lead.approval_email_sent_at)}
          </div>
        )}

        {/* Confirmation email status */}
        {(lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && confirmationEmail && confirmationEmail.status !== 'failed' && (
          <ReminderStatusBadge notification={confirmationEmail} />
        )}

        {/* Appointment date — shown on non-calendar tabs only */}
        {!isCalendarTab && (lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && lead.appointment_date && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })}
            {lead.appointment_time && ` at ${new Date('1970-01-01T' + lead.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
          </div>
        )}

        {/* Message */}
        {lead.message && (
          <div>
            <div className={`text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 leading-relaxed border border-border/50 ${!messageExpanded && lead.message.length > 150 ? 'line-clamp-3' : ''}`}>
              {lead.message}
            </div>
            {lead.message.length > 150 && (
              <button
                onClick={onToggleMessage}
                className="text-xs text-muted-foreground hover:text-foreground mt-1 px-1 transition-colors"
              >
                {messageExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Admin notes */}
        {notes.expanded ? (
          <textarea
            autoFocus
            value={notes.draft}
            onChange={e => notes.onDraftChange(e.target.value)}
            onBlur={notes.onSave}
            rows={2}
            placeholder="Internal notes (only visible to admins)…"
            className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
          />
        ) : notes.draft?.trim() ? (
          <div className="flex items-start gap-2 group">
            <p className="flex-1 text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 leading-relaxed border border-border/50">
              {notes.draft}
            </p>
            <div className="flex items-center gap-0.5 flex-shrink-0 pt-1.5">
              {notes.saved && <Check className="w-3.5 h-3.5 text-green-600" />}
              <button
                onClick={notes.onToggle}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={notes.onToggle}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add note
          </button>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
            {lead.status === 'new' && (
              <>
                <Button size="sm" onClick={() => actions.approve(lead)} disabled={actions.busyLeadId === lead.lead_id}>
                  Approve &amp; Send Invites
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5"
                  onClick={() => onDeny(lead)}
                >
                  Deny
                </Button>
              </>
            )}
            {lead.status === 'approved' && (
              <>
                <Button size="sm" variant="outline" onClick={() => actions.resendBookingLink(lead)} disabled={actions.busyLeadId === lead.lead_id}>
                  Resend Invites
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPickDate(lead)}>
                  Pick Date for Them
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5"
                  onClick={() => onDeny(lead)}
                >
                  Deny
                </Button>
              </>
            )}
            {(lead.status === 'appointment_scheduled' || lead.status === 'appointment_confirmed') && (
              <>
                <Button size="sm" variant="outline" onClick={() => actions.resendBookingLink(lead)} disabled={actions.busyLeadId === lead.lead_id}>
                  Resend Invites
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPickDate(lead)}>
                  Pick New Date
                </Button>
                {(!confirmationEmail || confirmationEmail.status === 'failed') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actions.sendingReminderId === lead.lead_id}
                    onClick={() => actions.sendReminder(lead)}
                    className="gap-1.5"
                  >
                    {actions.sendingReminderId === lead.lead_id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
                    ) : confirmationEmail?.status === 'failed' ? (
                      <><AlertCircle className="w-3.5 h-3.5 text-[#A01F23]" />Retry Confirmation</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" />Send Confirmation</>
                    )}
                  </Button>
                )}
              </>
            )}
            {(lead.status === 'appointment_confirmed' || hasPastAppointment(lead, todayKey)) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[#166534] border-[#BBF7D0] hover:bg-[#F0FDF4]"
                  disabled={updatingId === lead.lead_id}
                  onClick={() => onStatusChange(lead.lead_id, 'enrolled')}
                >
                  Mark enrolled
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-muted-foreground"
                  disabled={updatingId === lead.lead_id}
                  onClick={() => onCloseLead(lead.lead_id)}
                >
                  Close lead
                </Button>
              </>
            )}
            {(lead.status === 'enrolled' || lead.status === 'closed') && (
              <Select
                value={lead.status}
                onValueChange={val =>
                  val === 'closed'
                    ? onCloseLead(lead.lead_id)
                    : onStatusChange(lead.lead_id, val as EnrollmentLead['status'])
                }
                disabled={updatingId === lead.lead_id}
              >
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

      </div>
    </div>
  );
}
