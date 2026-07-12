import type { BlockedDate } from '../../../lib/types';

export function blockDateLabel(block: BlockedDate): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  return block.start_date === block.end_date
    ? fmt(block.start_date)
    : `${fmt(block.start_date)} – ${fmt(block.end_date)}`;
}
