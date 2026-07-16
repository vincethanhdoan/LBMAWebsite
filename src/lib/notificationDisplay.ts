import type { UserNotification } from './types';

export function notificationTitle(n: UserNotification): string {
  const actor = n.actor_display_name ?? 'Someone';
  switch (n.type) {
    case 'new_lead':
      return `New enrollment lead from ${actor}`;
    case 'appointment_booked':
      return `${actor} booked an appointment`;
    case 'appointment_confirmed':
      return `${actor} confirmed their appointment`;
    case 'appointment_rescheduled':
      return `${actor} rescheduled their appointment`;
    case 'appointment_cancelled':
      return `${actor} cancelled their appointment`;
    case 'comment_reply':
      return `${actor} replied to your comment`;
    case 'post_comment':
      return `${actor} commented on your post`;
    default:
      return 'Notification';
  }
}

export function isLeadNotification(n: UserNotification): boolean {
  return n.reference_type === 'enrollment_lead';
}
