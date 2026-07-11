import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Skeleton } from '../../ui/skeleton';
import { toast } from 'sonner';
import { upsertAdminNotificationPreferences } from '../../../lib/supabase/mutations';
import { getAdminNotificationPreferences } from '../../../lib/supabase/queries';

const defaultAdminPrefs = {
  notify_messages: true,
  notify_blog_posts: true,
  notify_comment_replies: true,
  notify_post_comments: true,
};

export function PersonalNotificationSettings() {
  const [adminPrefs, setAdminPrefs] = useState(defaultAdminPrefs);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    getAdminNotificationPreferences()
      .then((prefs) => {
        if (prefs) {
          setAdminPrefs({
            notify_messages: prefs.notify_messages,
            notify_blog_posts: prefs.notify_blog_posts,
            notify_comment_replies: prefs.notify_comment_replies,
            notify_post_comments: prefs.notify_post_comments,
          });
        }
      })
      .catch(console.error)
      .finally(() => setPrefsLoading(false));
  }, []);

  async function handleAdminPrefToggle(
    key: keyof typeof defaultAdminPrefs,
    value: boolean
  ) {
    const updated = { ...adminPrefs, [key]: value };
    setAdminPrefs(updated);
    try {
      await upsertAdminNotificationPreferences({ [key]: value });
      toast.success('Notification preferences saved');
    } catch {
      setAdminPrefs(adminPrefs);
      toast.error('Failed to save preferences');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preferences</CardTitle>
        <CardDescription>Choose when you'd like to receive emails</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {prefsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          ([
            { key: 'notify_messages' as const,        label: 'New Messages',           sub: 'Email me when I receive a message' },
            { key: 'notify_blog_posts' as const,      label: 'New Blog Posts',         sub: 'Email me when anyone publishes a blog post' },
            { key: 'notify_comment_replies' as const, label: 'Replies to My Comments', sub: 'Email me when someone replies to a comment I left' },
            { key: 'notify_post_comments' as const,   label: 'Comments on My Posts',   sub: 'Email me when someone comments on a post or announcement I wrote' },
          ] as const).map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-1">
              <Label htmlFor={key} className="flex flex-col gap-0.5 cursor-pointer flex-1">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground font-normal">{sub}</span>
              </Label>
              <Switch
                id={key}
                checked={adminPrefs[key]}
                onCheckedChange={(checked) => handleAdminPrefToggle(key, checked)}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
