import type {
  BlockedDate,
  EnrollmentLead,
  EnrollmentLeadProgramBooking,
} from '../../../lib/types';
import { daysUntilInPacific } from '../../../lib/pacificTime';
import {
  effectiveConfirmationNotification,
  getWeekStart,
  toLocalDateKey,
} from './leadDisplay';

export type AppointmentOccurrence = {
  lead: EnrollmentLead;
  booking: EnrollmentLeadProgramBooking | null; // null = legacy lead-level appointment
  dateKey: string;
  time: string | null;
  confirmed: boolean;
};

// Every booked visit, one entry per program booking with a date. Falls back to
// the legacy lead-level appointment when no program bookings carry dates.
export function getAppointmentOccurrences(
  leads: EnrollmentLead[],
): AppointmentOccurrence[] {
  const occurrences: AppointmentOccurrence[] = [];
  for (const lead of leads) {
    const booked = (lead.programBookings ?? []).filter(
      (b) =>
        b.appointment_date &&
        (b.status === 'scheduled' || b.status === 'confirmed'),
    );
    if (booked.length > 0) {
      for (const b of booked) {
        occurrences.push({
          lead,
          booking: b,
          dateKey: b.appointment_date!,
          time: b.appointment_time,
          confirmed: b.status === 'confirmed',
        });
      }
    } else if (
      lead.appointment_date &&
      (lead.status === 'appointment_scheduled' ||
        lead.status === 'appointment_confirmed')
    ) {
      occurrences.push({
        lead,
        booking: null,
        dateKey: lead.appointment_date,
        time: lead.appointment_time,
        confirmed: lead.status === 'appointment_confirmed',
      });
    }
  }
  return occurrences.sort((a, b) =>
    (a.dateKey + (a.time ?? '')).localeCompare(b.dateKey + (b.time ?? '')),
  );
}

export function occurrenceKidCount(o: AppointmentOccurrence): number {
  if (!o.booking) return 1;
  const matching =
    o.lead.children?.filter((c) => c.program_type === o.booking!.program_type)
      .length ?? 0;
  return Math.max(matching, 1);
}

export type FollowUpItem = {
  lead: EnrollmentLead;
  lastPastDateKey: string;
};

// A lead needs follow-up when its last booked visit is in the past and no
// future visit exists — staff still has to record whether they came in.
// Recording the outcome makes the lead terminal, so it drops out of here.
export function deriveFollowUps(
  leads: EnrollmentLead[],
  todayKey: string,
): FollowUpItem[] {
  const items: FollowUpItem[] = [];
  for (const lead of leads) {
    const occ = getAppointmentOccurrences([lead]);
    if (occ.length === 0) continue;
    if (occ.some((o) => o.dateKey >= todayKey)) continue;
    const lastPastDateKey = occ[occ.length - 1].dateKey;
    items.push({ lead, lastPastDateKey });
  }
  return items.sort((a, b) =>
    a.lastPastDateKey.localeCompare(b.lastPastDateKey),
  );
}

export type AttentionItem =
  | {
      reason: 'call_to_confirm';
      lead: EnrollmentLead;
      occurrence: AppointmentOccurrence;
    }
  | { reason: 'record_outcome'; lead: EnrollmentLead; followUp: FollowUpItem }
  | { reason: 'email_failed'; lead: EnrollmentLead }
  | { reason: 'stale_invite'; lead: EnrollmentLead; daysWaiting: number };

export const STALE_INVITE_DAYS = 5;
export const STALE_INQUIRY_DAYS = 3;

export function daysSince(iso: string, nowMs: number): number {
  return Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000);
}

// Priority order: call_to_confirm, record_outcome, email_failed, stale_invite.
// One attention row per lead; the highest-priority reason wins.
export function deriveAttentionItems(
  leads: EnrollmentLead[],
  todayKey: string,
  nowMs: number,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const seen = new Set<string>();
  const push = (item: AttentionItem) => {
    if (seen.has(item.lead.lead_id)) return;
    seen.add(item.lead.lead_id);
    items.push(item);
  };
  for (const o of getAppointmentOccurrences(leads)) {
    if (o.confirmed) continue;
    const days = daysUntilInPacific(new Date(o.dateKey + 'T12:00:00'));
    if (days >= 0 && days <= 2)
      push({ reason: 'call_to_confirm', lead: o.lead, occurrence: o });
  }
  for (const followUp of deriveFollowUps(leads, todayKey)) {
    push({ reason: 'record_outcome', lead: followUp.lead, followUp });
  }
  for (const lead of leads) {
    if (effectiveConfirmationNotification(lead)?.status === 'failed') {
      push({ reason: 'email_failed', lead });
    }
  }
  for (const lead of leads) {
    if (lead.status !== 'approved') continue;
    const sentAt = lead.approval_email_sent_at ?? lead.approved_at;
    if (!sentAt) continue;
    const hasBooked =
      lead.programBookings?.some((b) => b.appointment_date) ||
      lead.appointment_date !== null;
    if (hasBooked) continue;
    const daysWaiting = daysSince(sentAt, nowMs);
    if (daysWaiting >= STALE_INVITE_DAYS)
      push({ reason: 'stale_invite', lead, daysWaiting });
  }
  return items;
}

export type WeekDay = {
  dateKey: string;
  dayName: string;
  dayNum: number;
  confirmedKids: number;
  unconfirmedKids: number;
  isToday: boolean;
  isBlocked: boolean;
};

export function buildWeekDays(
  occurrences: AppointmentOccurrence[],
  weekOffset: number,
  todayKey: string,
  blocks: BlockedDate[],
): WeekDay[] {
  const weekStart = getWeekStart(weekOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateKey = toLocalDateKey(d);
    let confirmedKids = 0;
    let unconfirmedKids = 0;
    for (const o of occurrences) {
      if (o.dateKey !== dateKey) continue;
      if (o.confirmed) confirmedKids += occurrenceKidCount(o);
      else unconfirmedKids += occurrenceKidCount(o);
    }
    return {
      dateKey,
      dayName: d
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toUpperCase()
        .slice(0, 3),
      dayNum: d.getDate(),
      confirmedKids,
      unconfirmedKids,
      isToday: dateKey === todayKey,
      isBlocked: blocks.some(
        (b) => b.start_date <= dateKey && b.end_date >= dateKey,
      ),
    };
  });
}

export function childSummary(lead: EnrollmentLead): string {
  if (lead.children?.length) {
    return lead.children.map((c) => `${c.name}, age ${c.age}`).join(' + ');
  }
  if (lead.student_name) {
    return lead.student_age !== null
      ? `${lead.student_name}, age ${lead.student_age}`
      : lead.student_name;
  }
  return '';
}

export function nextOccurrenceAfter(
  occurrences: AppointmentOccurrence[],
  dateKey: string,
): AppointmentOccurrence | null {
  return occurrences.find((o) => o.dateKey > dateKey) ?? null;
}
