import type { AppointmentSlot } from '../../../lib/types';
import { PROGRAM_LABELS, PROGRAM_BADGE_STYLES } from '../leads/leadDisplay';

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const WEEK_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Every' },
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function slotStartLabel(slot: AppointmentSlot): string {
  return formatTime(new Date('1970-01-01T' + slot.start_time));
}

export function programLabel(programType: string): string {
  return programType === 'all'
    ? 'All programs'
    : (PROGRAM_LABELS[programType] ?? programType);
}

export function programBadgeClass(programType: string): string {
  return programType === 'all'
    ? 'bg-muted text-muted-foreground'
    : (PROGRAM_BADGE_STYLES[programType] ?? 'bg-muted text-muted-foreground');
}

// Null for ordinary weekly slots (no badge); otherwise the week-of-month label.
export function frequencyBadgeLabel(slot: AppointmentSlot): string | null {
  if (slot.week_of_month == null) return null;
  return WEEK_OPTIONS.find((o) => o.value === slot.week_of_month)?.label ?? null;
}

// Sort order within a day: Every, 1st–4th, Last.
function weekSortIndex(week: number | null): number {
  return week == null ? 0 : week === -1 ? 5 : week;
}

export function groupSlotsByDay(
  slots: AppointmentSlot[],
): { day: number; slots: AppointmentSlot[] }[] {
  const byDay = new Map<number, AppointmentSlot[]>();
  for (const s of slots) {
    const arr = byDay.get(s.day_of_week) ?? [];
    arr.push(s);
    byDay.set(s.day_of_week, arr);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, daySlots]) => ({
      day,
      slots: [...daySlots].sort(
        (a, b) =>
          a.start_time.localeCompare(b.start_time) ||
          weekSortIndex(a.week_of_month) - weekSortIndex(b.week_of_month),
      ),
    }));
}
