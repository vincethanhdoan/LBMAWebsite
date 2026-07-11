import { keepPreviousData, useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query';
import {
  getNotificationHistory,
  getNotificationSummary,
  getSectionUnreadCounts,
  getUnreadMessageCount,
  getNewFeedbackCount,
  getUnreadNotificationCount,
} from '../supabase/queries';
import { queryKeys } from '../queryKeys';

export type NotificationFeedFilter = 'all' | 'leads' | 'comments';

export function invalidateNotificationCaches(queryClient: QueryClient, userId: string): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.notificationHistory() });
}

export function useNotificationFeed(filter: NotificationFeedFilter) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.notificationHistory(), filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getNotificationHistory(pageParam, 20, filter === 'all' ? undefined : filter),
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useNotificationSummary(userId: string) {
  return useQuery({
    queryKey: queryKeys.notificationSummary(userId),
    queryFn: () => getNotificationSummary(userId),
  });
}

export function useSidebarCounts(userId: string) {
  return useQuery({
    queryKey: queryKeys.sidebarCounts(userId),
    queryFn: async () => {
      const [{ announcements, blog }, unreadMessages, unreadNotifications] = await Promise.all([
        getSectionUnreadCounts(userId),
        getUnreadMessageCount(),
        getUnreadNotificationCount(),
      ]);
      return { unreadMessages, unreadAnnouncements: announcements, unreadBlog: blog, unreadNotifications };
    },
  });
}

export function useHomeCounts(userId: string) {
  return useQuery({
    queryKey: queryKeys.homeCounts(userId),
    queryFn: async () => {
      const [{ announcements, blog }, unreadMessages, notifCount] = await Promise.all([
        getSectionUnreadCounts(userId),
        getUnreadMessageCount(),
        getUnreadNotificationCount(),
      ]);
      return { unreadMessages, announcementCount: announcements, blogCount: blog, notifCount };
    },
  });
}

export function useFeedbackCount(userId: string, familyId: string) {
  return useQuery({
    queryKey: ['feedback-count', userId, familyId],
    queryFn: () => getNewFeedbackCount(userId, familyId),
    enabled: !!familyId,
  });
}
