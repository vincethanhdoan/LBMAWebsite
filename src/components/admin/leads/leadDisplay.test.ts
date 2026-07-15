import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EnrollmentLead } from '../../../lib/types';
import {
  leadMatchesSearch,
  toLocalDateKey,
  getWeekStart,
  formatWeekRange,
  STATUS_LABELS,
} from './leadDisplay';

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

describe('leadMatchesSearch', () => {
  it('matches every lead on an empty query', () => {
    expect(leadMatchesSearch(makeLead(), '  ')).toBe(true);
  });

  it('matches on parent name and email, case-insensitively', () => {
    const lead = makeLead();
    expect(leadMatchesSearch(lead, 'GUERRA')).toBe(true);
    expect(leadMatchesSearch(lead, 'eduardo@example')).toBe(true);
    expect(leadMatchesSearch(lead, 'nomatch')).toBe(false);
  });

  it('matches on phone digits, ignoring formatting', () => {
    const lead = makeLead({ phone: '(209) 555-0123' });
    expect(leadMatchesSearch(lead, '5550123')).toBe(true);
    expect(leadMatchesSearch(lead, '2095')).toBe(true); // 4-digit prefix, meets threshold
  });

  it('requires at least 4 query digits to phone-match', () => {
    const lead = makeLead({
      parent_name: 'Zed',
      parent_email: 'zed@example.com',
      phone: '(209) 555-0123',
    });
    expect(leadMatchesSearch(lead, '209')).toBe(false); // 3 digits, below threshold
    expect(leadMatchesSearch(lead, '5550')).toBe(true); // 4 digits, matches phone
  });

  it('matches on a child name', () => {
    const lead = makeLead({
      children: [
        {
          child_id: 'c1',
          lead_id: 'lead-1',
          name: 'Mateo',
          age: 8,
          program_type: 'youth',
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
    });
    expect(leadMatchesSearch(lead, 'mateo')).toBe(true);
  });
});

describe('toLocalDateKey', () => {
  it('formats a Date as a zero-padded YYYY-MM-DD key', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('getWeekStart / formatWeekRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday 2026-07-15 (Pacific). Week starts Sunday 2026-07-12.
    vi.setSystemTime(new Date('2026-07-15T12:00:00-07:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the Sunday of the current week at offset 0', () => {
    expect(toLocalDateKey(getWeekStart(0))).toBe('2026-07-12');
  });

  it('shifts by whole weeks for non-zero offsets', () => {
    expect(toLocalDateKey(getWeekStart(1))).toBe('2026-07-19');
    expect(toLocalDateKey(getWeekStart(-1))).toBe('2026-07-05');
  });

  it('formats a same-month week range with a single trailing day number', () => {
    expect(formatWeekRange(getWeekStart(0))).toBe('Jul 12 – 18');
  });
});

describe('STATUS_LABELS', () => {
  it('has a human label for every lead status', () => {
    const statuses: EnrollmentLead['status'][] = [
      'new',
      'approved',
      'appointment_scheduled',
      'appointment_confirmed',
      'denied',
      'attended',
      'no_show',
      'closed',
    ];
    for (const s of statuses) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
