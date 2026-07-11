import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Skeleton } from './ui/skeleton';
import { markSectionSeen, markNotificationsRead, markNotificationRead } from '../lib/supabase/mutations';
import { getCommentPostRef } from '../lib/supabase/queries';
import { invalidateNotificationCaches, useNotificationSummary } from '../lib/hooks/notifications';
import { notificationTitle, isLeadNotification } from '../lib/notificationDisplay';
import type { UserNotification } from '../lib/types';

type NotificationBellProps = {
  userId: string;
  onNavigate: (tab: string) => void;
  viewAllTab?: string;
  onOpenLead?: (leadId: string) => void;
  onOpenPost?: (tab: 'announcements' | 'blog', postId: string) => void;
};

export function NotificationBell({ userId, onNavigate, viewAllTab, onOpenLead, onOpenPost }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: summary, isLoading: loading, refetch: loadSummary } = useNotificationSummary(userId);

  const totalUnread = summary
    ? summary.unreadMessages +
      summary.announcements.count +
      summary.blog.count +
      summary.unreadNotificationCount
    : 0;

  async function handleMarkAllRead() {
    await Promise.all([
      markSectionSeen('announcements'),
      markSectionSeen('blog'),
      markNotificationsRead(),
    ]);
    invalidateNotificationCaches(queryClient, userId);
  }

  async function handleNavigate(tab: string, section?: 'announcements' | 'blog') {
    if (section) {
      await markSectionSeen(section).catch(console.error);
      await loadSummary();
    }
    onNavigate(tab);
    setOpen(false);
  }

  async function handleNotificationClick(notif: UserNotification) {
    await markNotificationRead(notif.notification_id).catch(console.error);
    invalidateNotificationCaches(queryClient, userId);
    if (isLeadNotification(notif)) {
      if (onOpenLead) {
        onOpenLead(notif.reference_id);
      } else {
        onNavigate('leads');
      }
    } else {
      const referenceType = notif.reference_type === 'announcement_comment' ? 'announcement_comment' : 'blog_comment';
      const tab = referenceType === 'announcement_comment' ? 'announcements' : 'blog';
      if (onOpenPost) {
        const ref = await getCommentPostRef(referenceType, notif.reference_id).catch(() => null);
        if (ref) {
          onOpenPost(ref.tab, ref.postId);
        } else {
          onNavigate(tab);
        }
      } else {
        onNavigate(tab);
      }
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(val) => { setOpen(val); if (val) loadSummary(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          aria-label={totalUnread > 0 ? `${totalUnread} unread notifications` : 'Notifications'}
        >
          <Bell className="h-4 w-4" />
          {totalUnread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-medium text-sidebar-primary-foreground"
              aria-hidden="true"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-72 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : totalUnread === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CheckCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              You're all caught up!
            </div>
          ) : (
            <div className="py-1">
              {summary!.unreadMessages > 0 && (
                <button
                  onClick={() => handleNavigate('messages')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm">
                    <strong>{summary!.unreadMessages}</strong>{' '}
                    unread {summary!.unreadMessages === 1 ? 'message' : 'messages'}
                  </span>
                </button>
              )}
              {summary!.announcements.count > 0 && (
                <button
                  onClick={() => handleNavigate('announcements', 'announcements')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm line-clamp-2">
                    {summary!.announcements.latestTitle
                      ? <>New announcement: <strong>{summary!.announcements.latestTitle}</strong></>
                      : <><strong>{summary!.announcements.count}</strong> new announcements</>}
                  </span>
                </button>
              )}
              {summary!.blog.count > 0 && (
                <button
                  onClick={() => handleNavigate('blog', 'blog')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm line-clamp-2">
                    {summary!.blog.latestTitle
                      ? <>New blog post: <strong>{summary!.blog.latestTitle}</strong></>
                      : <><strong>{summary!.blog.count}</strong> new blog posts</>}
                  </span>
                </button>
              )}
              {summary!.notifications.map((notif) => (
                <button
                  key={notif.notification_id}
                  onClick={() => handleNotificationClick(notif)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {notificationTitle(notif)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {viewAllTab && (
          <div className="border-t">
            <button
              onClick={() => handleNavigate(viewAllTab)}
              className="w-full px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              View all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
