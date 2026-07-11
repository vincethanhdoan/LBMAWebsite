import type { UserNotification } from './types';

export function notificationTitle(n: UserNotification): string {
  const actor = n.actor_display_name ?? 'Someone';
  switch (n.type) {
    case 'new_lead': return `New enrollment lead — ${actor}`;
    case 'appointment_booked': return `Appointment booked — ${actor}`;
    case 'appointment_confirmed': return `Appointment confirmed — ${actor}`;
    case 'comment_reply': return `${actor} replied to your comment`;
    case 'post_comment': return `${actor} commented on your post`;
    default: return 'Notification';
  }
}

export function isLeadNotification(n: UserNotification): boolean {
  return n.reference_type === 'enrollment_lead';
}
