import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCheck, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useNotificationFeed, useSidebarCounts } from '../../lib/hooks/notifications';
import type { NotificationFeedFilter } from '../../lib/hooks/notifications';
import { markNotificationRead, markNotificationsRead, markSectionSeen } from '../../lib/supabase/mutations';
import { getCommentPostRef } from '../../lib/supabase/queries';
import { notificationTitle, isLeadNotification } from '../../lib/notificationDisplay';
import { queryKeys } from '../../lib/queryKeys';
import { formatShortDate } from '../../lib/format';
import type { UserNotification } from '../../lib/types';

type AdminNotificationsTabProps = {
  userId: string;
};

const FILTERS: { id: NotificationFeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'leads', label: 'Leads' },
  { id: 'comments', label: 'Comments' },
];

const EMPTY_STATE: Record<NotificationFeedFilter, string> = {
  all: 'No notifications yet.',
  leads: 'No lead activity yet.',
  comments: 'No comment activity yet.',
};

function formatTimestamp(dateString: string): string {
  const time = new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatShortDate(dateString)} · ${time}`;
}

export function AdminNotificationsTab({ userId }: AdminNotificationsTabProps) {
  const [, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFeedFilter>('all');

  const { data: counts } = useSidebarCounts(userId);
  const unreadMessages = counts?.unreadMessages ?? 0;
  const unreadNotifications = counts?.unreadNotifications ?? 0;

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotificationFeed(filter);

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];

  async function handleNotificationClick(notif: UserNotification) {
    if (!notif.is_read) {
      await markNotificationRead(notif.notification_id).catch(console.error);
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    }
    if (isLeadNotification(notif)) {
      setSearchParams({ tab: 'leads', lead: notif.reference_id }, { replace: true });
    } else {
      const referenceType = notif.reference_type === 'announcement_comment' ? 'announcement_comment' : 'blog_comment';
      const tab = referenceType === 'announcement_comment' ? 'announcements' : 'blog';
      const ref = await getCommentPostRef(referenceType, notif.reference_id).catch(() => null);
      if (ref) {
        setSearchParams({ tab: ref.tab, post: ref.postId }, { replace: true });
      } else {
        setSearchParams({ tab }, { replace: true });
      }
    }
  }

  async function handleMarkAllRead() {
    await Promise.all([
      markNotificationsRead(),
      markSectionSeen('announcements'),
      markSectionSeen('blog'),
    ]).catch(console.error);
    queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
    queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    toast.success('All caught up');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">Everything that happened, newest first.</p>
        </div>
        {unreadNotifications > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="shrink-0">
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {unreadMessages > 0 && (
        <button
          onClick={() => setSearchParams({ tab: 'messages' }, { replace: true })}
          className="flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
        >
          <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-sm font-medium text-foreground">
            You have {unreadMessages} unread {unreadMessages === 1 ? 'message' : 'messages'}
          </span>
        </button>
      )}

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              filter === f.id
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {EMPTY_STATE[filter]}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <button
              key={notif.notification_id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent ${
                notif.is_read ? 'border-border bg-transparent' : 'border-primary/30 bg-primary/5'
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  notif.is_read ? 'bg-transparent' : 'bg-primary'
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm ${
                    notif.is_read ? 'text-muted-foreground' : 'font-medium text-foreground'
                  }`}
                >
                  {notificationTitle(notif)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatTimestamp(notif.created_at)}
                </span>
              </span>
            </button>
          ))}

          {hasNextPage && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
