import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  EnrollmentLead,
  EnrollmentLeadProgramBooking,
} from '../../../lib/types';
import {
  getAppointmentOccurrences,
  occurrenceKidCount,
  deriveFollowUps,
  deriveAttentionItems,
  buildWeekDays,
  nextOccurrenceAfter,
  daysSince,
  STALE_INVITE_DAYS,
} from './leadViews';

function makeLead(partial: Partial<EnrollmentLead> = {}): EnrollmentLead {
  return {
    lead_id: 'lead-1',
    parent_name: 'Eduardo Guerra',
    parent_email: 'eduardo@example.com',
    phone: '(209) 555-0123',
    student_name: null,
    student_age: null,
    message: '',
    source_page: 'contact',
    notification_status: 'sent',
    notified_at: null,
    status: 'new',
    approved_at: null,
    approval_email_sent_at: null,
    booking_token: null,
    appointment_date: null,
    appointment_time: null,
    denied_at: null,
    denial_message: null,
    admin_notes: null,
    created_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
    attendance_recorded_at: null,
    attendance_recorded_by: null,
    children: [],
    programBookings: [],
    reminderNotification: null,
    notificationHistory: [],
    ...partial,
  };
}

function makeBooking(
  partial: Partial<EnrollmentLeadProgramBooking> = {},
): EnrollmentLeadProgramBooking {
  return {
    booking_id: 'b1',
    lead_id: 'lead-1',
    program_type: 'youth',
    booking_token: null,
    appointment_slot_id: null,
    appointment_date: '2026-07-20',
    appointment_time: '17:00:00',
    status: 'scheduled',
    created_at: '2026-07-10T00:00:00Z',
    ...partial,
  };
}

describe('getAppointmentOccurrences', () => {
  it('emits one occurrence per dated, scheduled/confirmed program booking', () => {
    const lead = makeLead({
      programBookings: [
        makeBooking({
          booking_id: 'b1',
          appointment_date: '2026-07-20',
          status: 'scheduled',
        }),
        makeBooking({
          booking_id: 'b2',
          appointment_date: '2026-07-18',
          status: 'confirmed',
        }),
        makeBooking({
          booking_id: 'b3',
          appointment_date: null,
          status: 'pending',
        }),
      ],
    });
    const occ = getAppointmentOccurrences([lead]);
    expect(occ.map((o) => o.dateKey)).toEqual(['2026-07-18', '2026-07-20']); // sorted
    expect(occ[0].confirmed).toBe(true);
    expect(occ[1].confirmed).toBe(false);
  });

  it('falls back to a legacy lead-level appointment when no bookings carry dates', () => {
    const lead = makeLead({
      status: 'appointment_confirmed',
      appointment_date: '2026-07-22',
      appointment_time: '18:00:00',
    });
    const occ = getAppointmentOccurrences([lead]);
    expect(occ).toHaveLength(1);
    expect(occ[0].booking).toBeNull();
    expect(occ[0].confirmed).toBe(true);
  });

  it('ignores leads with no booked visit', () => {
    expect(getAppointmentOccurrences([makeLead({ status: 'new' })])).toEqual(
      [],
    );
  });

  it('excludes cancelled bookings from upcoming visits', () => {
    const lead = makeLead({
      programBookings: [
        makeBooking({
          booking_id: 'b1',
          appointment_date: '2026-07-20',
          status: 'cancelled',
        }),
        makeBooking({
          booking_id: 'b2',
          appointment_date: '2026-07-22',
          status: 'scheduled',
        }),
      ],
    });
    const occ = getAppointmentOccurrences([lead]);
    expect(occ.map((o) => o.dateKey)).toEqual(['2026-07-22']);
  });
});

describe('daysSince', () => {
  it('clamps to zero when the timestamp is slightly in the future', () => {
    const nowMs = new Date('2026-07-15T12:00:00Z').getTime();
    const future = new Date(nowMs + 500).toISOString();
    expect(daysSince(future, nowMs)).toBe(0);
  });

  it('counts whole elapsed days for past timestamps', () => {
    const nowMs = new Date('2026-07-15T12:00:00Z').getTime();
    const past = new Date(nowMs - 3 * 86_400_000).toISOString();
    expect(daysSince(past, nowMs)).toBe(3);
  });
});

describe('occurrenceKidCount', () => {
  it('counts children matching the booking program, at least 1', () => {
    const lead = makeLead({
      children: [
        {
          child_id: 'c1',
          lead_id: 'lead-1',
          name: 'A',
          age: 9,
          program_type: 'youth',
          created_at: '',
        },
        {
          child_id: 'c2',
          lead_id: 'lead-1',
          name: 'B',
          age: 10,
          program_type: 'youth',
          created_at: '',
        },
        {
          child_id: 'c3',
          lead_id: 'lead-1',
          name: 'C',
          age: 5,
          program_type: 'little_dragons',
          created_at: '',
        },
      ],
      programBookings: [makeBooking({ program_type: 'youth' })],
    });
    const occ = getAppointmentOccurrences([lead]);
    expect(occurrenceKidCount(occ[0])).toBe(2);
  });

  it('counts a legacy lead-level occurrence as 1', () => {
    const lead = makeLead({
      status: 'appointment_scheduled',
      appointment_date: '2026-07-20',
    });
    const occ = getAppointmentOccurrences([lead]);
    expect(occurrenceKidCount(occ[0])).toBe(1);
  });
});

describe('deriveFollowUps', () => {
  it('flags leads whose last visit is in the past with no future visit', () => {
    const past = makeLead({
      lead_id: 'past',
      programBookings: [
        makeBooking({ appointment_date: '2026-07-10', status: 'confirmed' }),
      ],
    });
    const future = makeLead({
      lead_id: 'future',
      programBookings: [
        makeBooking({ appointment_date: '2026-07-20', status: 'confirmed' }),
      ],
    });
    const items = deriveFollowUps([past, future], '2026-07-15');
    expect(items.map((i) => i.lead.lead_id)).toEqual(['past']);
    expect(items[0].lastPastDateKey).toBe('2026-07-10');
  });
});

describe('deriveAttentionItems', () => {
  const nowMs = new Date('2026-07-15T12:00:00-07:00').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00-07:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('raises call_to_confirm for an unconfirmed visit within 2 days', () => {
    const lead = makeLead({
      programBookings: [
        makeBooking({ appointment_date: '2026-07-16', status: 'scheduled' }),
      ],
    });
    const items = deriveAttentionItems([lead], '2026-07-15', nowMs);
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe('call_to_confirm');
  });

  it('does not raise call_to_confirm outside the 2-day window or when confirmed', () => {
    const farOut = makeLead({
      lead_id: 'far',
      programBookings: [
        makeBooking({ appointment_date: '2026-07-20', status: 'scheduled' }),
      ],
    });
    const confirmed = makeLead({
      lead_id: 'conf',
      programBookings: [
        makeBooking({ appointment_date: '2026-07-16', status: 'confirmed' }),
      ],
    });
    const items = deriveAttentionItems(
      [farOut, confirmed],
      '2026-07-15',
      nowMs,
    );
    expect(items.find((i) => i.reason === 'call_to_confirm')).toBeUndefined();
  });

  it('raises stale_invite for an approved lead that has not booked after the threshold', () => {
    const sentAt = new Date(
      nowMs - (STALE_INVITE_DAYS + 1) * 86_400_000,
    ).toISOString();
    const lead = makeLead({
      status: 'approved',
      approval_email_sent_at: sentAt,
    });
    const items = deriveAttentionItems([lead], '2026-07-15', nowMs);
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe('stale_invite');
  });

  it('keeps only the highest-priority reason per lead', () => {
    // A lead both due-to-confirm and email-failed → call_to_confirm wins.
    const lead = makeLead({
      programBookings: [
        makeBooking({ appointment_date: '2026-07-16', status: 'scheduled' }),
      ],
      reminderNotification: {
        notification_id: 'n1',
        type: 'reminder',
        status: 'failed',
        recipient_email: 'eduardo@example.com',
        created_at: '2026-07-14T00:00:00Z',
      },
    });
    const items = deriveAttentionItems([lead], '2026-07-15', nowMs);
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe('call_to_confirm');
  });
});

describe('buildWeekDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00-07:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces 7 days, tallies confirmed/unconfirmed kids, and marks today + blocks', () => {
    const lead = makeLead({
      programBookings: [
        makeBooking({ appointment_date: '2026-07-15', status: 'scheduled' }),
      ],
    });
    const occ = getAppointmentOccurrences([lead]);
    const week = buildWeekDays(occ, 0, '2026-07-15', [
      {
        block_id: 'x',
        start_date: '2026-07-17',
        end_date: '2026-07-17',
        reason: null,
        created_at: '',
      },
    ]);
    expect(week).toHaveLength(7);
    const wed = week.find((d) => d.dateKey === '2026-07-15')!;
    expect(wed.isToday).toBe(true);
    expect(wed.unconfirmedKids).toBe(1);
    expect(week.find((d) => d.dateKey === '2026-07-17')!.isBlocked).toBe(true);
  });
});

describe('nextOccurrenceAfter', () => {
  it('returns the first occurrence strictly after the given date key', () => {
    const lead = makeLead({
      programBookings: [
        makeBooking({ booking_id: 'b1', appointment_date: '2026-07-16' }),
        makeBooking({ booking_id: 'b2', appointment_date: '2026-07-20' }),
      ],
    });
    const occ = getAppointmentOccurrences([lead]);
    expect(nextOccurrenceAfter(occ, '2026-07-16')?.dateKey).toBe('2026-07-20');
    expect(nextOccurrenceAfter(occ, '2026-07-20')).toBeNull();
  });
});
