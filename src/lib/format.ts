/**
 * Shared formatting utilities used across dashboard and admin components.
 */

import { daysUntilInPacific } from './pacificTime';

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/**
 * Format a full ISO timestamp as a human-readable date.
 * e.g. "April 7, 2026"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a full ISO timestamp as a short date.
 * e.g. "Apr 7, 2026"
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a DATE-only string ("YYYY-MM-DD") as a short date.
 * Parses as local midnight to avoid off-by-one from timezone conversion.
 * e.g. "Apr 7, 2026"
 */
export function formatTestDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a TIME string ("HH:MM:SS" or "HH:MM") as a 12-hour clock string.
 * e.g. "2:30 PM"
 */
export function formatTime(timeString: string): string {
  const [h, m] = timeString.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a raw phone number for display. US 10-digit and 1-prefixed 11-digit
 * numbers become "(555) 123-4567"; anything else is returned unchanged.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

/**
 * Relative-day phrase for a DATE-only key ("YYYY-MM-DD") in Pacific time:
 * "today" / "tomorrow" / "in N days". Returns null for past dates.
 */
export function relativeDayLabel(dateKey: string): string | null {
  const days = daysUntilInPacific(new Date(dateKey + 'T12:00:00'));
  if (days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * Format a timestamp as a compact relative time.
 * e.g. "just now", "5m ago", "3h ago", "2d ago"; falls back to a short date
 * past 30 days. Returns "" for an unparseable input.
 */
export function formatRelativeTime(dateString: string): string {
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatShortDate(dateString);
}

/**
 * Calculate age in whole years from a date-of-birth string.
 */
export function calculateAge(dateOfBirth: string | null): number {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
