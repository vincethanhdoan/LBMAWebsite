import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daysUntilInPacific, pacificTodayISO } from './pacificTime';

describe('pacificTodayISO', () => {
  it('returns the Pacific calendar date even when UTC has already rolled over', () => {
    vi.useFakeTimers();
    // 2026-07-16 02:00 UTC is still 2026-07-15 19:00 in Pacific.
    vi.setSystemTime(new Date('2026-07-16T02:00:00Z'));
    expect(pacificTodayISO()).toBe('2026-07-15');
    vi.useRealTimers();
  });
});

describe('daysUntilInPacific', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00-07:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is 0 for today, 1 for tomorrow, -1 for yesterday', () => {
    expect(daysUntilInPacific(new Date(2026, 6, 15))).toBe(0);
    expect(daysUntilInPacific(new Date(2026, 6, 16))).toBe(1);
    expect(daysUntilInPacific(new Date(2026, 6, 14))).toBe(-1);
  });

  it('counts whole calendar days across a spring-forward DST boundary', () => {
    // DST spring-forward is 2026-03-08. A 2-day span must read as 2, not 1.9.
    vi.setSystemTime(new Date('2026-03-07T12:00:00-08:00'));
    expect(daysUntilInPacific(new Date(2026, 2, 9))).toBe(2);
  });

  it('counts whole calendar days across a fall-back DST boundary', () => {
    // DST fall-back is 2026-11-01.
    vi.setSystemTime(new Date('2026-10-31T12:00:00-07:00'));
    expect(daysUntilInPacific(new Date(2026, 10, 2))).toBe(2);
  });
});
