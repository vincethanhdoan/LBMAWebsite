import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeToAnnouncements,
  subscribeToAllAnnouncementComments,
  subscribeToBlogPosts,
  subscribeToAllBlogComments,
  subscribeToConversations,
  subscribeToAllMessages,
  subscribeToEnrollmentLeads,
  subscribeToUserNotifications,
  unsubscribe,
} from '../supabase/realtime';
import { queryKeys } from '../queryKeys';

export function useRealtimeInvalidation(userId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channels = [
      subscribeToAnnouncements(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.announcements() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
      }),

      subscribeToAllAnnouncementComments(({ new: n, old: o }) => {
        const announcementId = (n as any)?.announcement_id ?? (o as any)?.announcement_id;
        if (announcementId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.announcementComments(announcementId) });
        } else {
          queryClient.invalidateQueries({ queryKey: ['announcement-comments'] });
        }
      }),

      subscribeToBlogPosts(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
      }),

      subscribeToAllBlogComments(({ new: n, old: o }) => {
        const postId = (n as any)?.post_id ?? (o as any)?.post_id;
        if (postId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.blogComments(postId) });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog-comments'] });
        }
      }),

      subscribeToConversations(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      }),

      subscribeToAllMessages(({ new: n, old: o }) => {
        const conversationId = (n as any)?.conversation_id ?? (o as any)?.conversation_id;
        if (conversationId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
      }),

      subscribeToEnrollmentLeads(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      }),

      subscribeToUserNotifications(userId, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
      }),
    ];

    return () => {
      channels.forEach(unsubscribe);
    };
  }, [userId, queryClient]);
}
