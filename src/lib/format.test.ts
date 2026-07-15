import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getInitials,
  formatPhone,
  calculateAge,
  relativeDayLabel,
  formatRelativeTime,
} from './format';

describe('getInitials', () => {
  it('takes the first letter of each word, uppercased', () => {
    expect(getInitials('eduardo guerra')).toBe('EG');
    expect(getInitials('Ana')).toBe('A');
  });
});

describe('formatPhone', () => {
  it('formats a 10-digit number', () => {
    expect(formatPhone('2095550123')).toBe('(209) 555-0123');
  });

  it('formats an 11-digit number with a leading 1', () => {
    expect(formatPhone('12095550123')).toBe('(209) 555-0123');
  });

  it('strips non-digits before formatting', () => {
    expect(formatPhone('209.555.0123')).toBe('(209) 555-0123');
  });

  it('returns the raw input when it is not a US number', () => {
    expect(formatPhone('12345')).toBe('12345');
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });
});

describe('time-dependent helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00-07:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateAge', () => {
    // Dates chosen away from the month/day boundary so the UTC-parse of
    // "YYYY-MM-DD" read against Pacific local `today` can't shift the result.
    it('returns whole years, decrementing when the birthday is later this year', () => {
      expect(calculateAge('2010-03-10')).toBe(16); // birthday already passed (July > March)
      expect(calculateAge('2010-11-20')).toBe(15); // birthday still ahead (November > July)
    });

    it('returns 0 for a null date of birth', () => {
      expect(calculateAge(null)).toBe(0);
    });
  });

  describe('relativeDayLabel', () => {
    it('labels today, tomorrow, and further-out dates', () => {
      expect(relativeDayLabel('2026-07-15')).toBe('today');
      expect(relativeDayLabel('2026-07-16')).toBe('tomorrow');
      expect(relativeDayLabel('2026-07-20')).toBe('in 5 days');
    });

    it('returns null for a past date', () => {
      expect(relativeDayLabel('2026-07-14')).toBeNull();
    });
  });

  describe('formatRelativeTime', () => {
    it('describes recent timestamps compactly', () => {
      expect(formatRelativeTime('2026-07-15T12:00:00-07:00')).toBe('just now');
      expect(formatRelativeTime('2026-07-15T11:30:00-07:00')).toBe('30m ago');
      expect(formatRelativeTime('2026-07-15T09:00:00-07:00')).toBe('3h ago');
      expect(formatRelativeTime('2026-07-13T12:00:00-07:00')).toBe('2d ago');
    });

    it('returns an empty string for an unparseable input', () => {
      expect(formatRelativeTime('not-a-date')).toBe('');
    });
  });
});
