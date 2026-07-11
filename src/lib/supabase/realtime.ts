import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';
import type { UserNotification } from '../types';

export type RealtimeCallback<T> = (payload: T) => void;

// ============================================
// ANNOUNCEMENTS
// ============================================

export function subscribeToAnnouncements(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('announcements-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'announcements',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToAnnouncementComments(
  announcementId: string,
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel(`announcement-comments-${announcementId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'announcement_comments',
        filter: `announcement_id=eq.${announcementId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToAllAnnouncementComments(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('all-announcement-comments-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'announcement_comments',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// BLOG POSTS
// ============================================

export function subscribeToBlogPosts(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('blog-posts-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blog_posts',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToBlogComments(
  postId: string,
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel(`blog-comments-${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blog_comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToAllBlogComments(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('all-blog-comments-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blog_comments',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// MESSAGES
// ============================================

export function subscribeToMessages(
  conversationId: string,
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToConversations(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('conversations-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToAllMessages(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('all-messages-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// REVIEWS
// ============================================

export function subscribeToReviews(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('reviews-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reviews',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// ENROLLMENT LEADS
// ============================================

export function subscribeToEnrollmentLeads(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('enrollment-leads-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enrollment_leads',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enrollment_lead_program_bookings',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enrollment_lead_notifications',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// ADMIN PROFILES
// ============================================

export function subscribeToAdminProfiles(
  callback: RealtimeCallback<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }>
): RealtimeChannel {
  const channel = supabase
    .channel('admin-profiles-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// USER NOTIFICATIONS
// ============================================

export function subscribeToUserNotifications(
  userId: string,
  onNewNotification: (notification: UserNotification) => void
): RealtimeChannel {
  return supabase
    .channel(`user_notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => onNewNotification(payload.new as UserNotification)
    )
    .subscribe();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
