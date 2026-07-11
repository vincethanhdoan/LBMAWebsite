import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Skeleton } from '../../ui/skeleton';
import { toast } from 'sonner';
import { upsertAdminNotificationPreferences } from '../../../lib/supabase/mutations';
import { getAdminNotificationPreferences } from '../../../lib/supabase/queries';
import { supabase } from '../../../lib/supabase/client';
import { NotificationRecipients } from './NotificationRecipients';

type NotificationSettingsProps = {
  userEmail: string;
};

const defaultAdminPrefs = {
  notify_messages: true,
  notify_blog_posts: true,
  notify_comment_replies: true,
  notify_post_comments: true,
};

export function NotificationSettings({ userEmail }: NotificationSettingsProps) {
  const [adminPrefs, setAdminPrefs] = useState(defaultAdminPrefs);
  const [notifyNewLeads, setNotifyNewLeads] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminNotificationPreferences(),
      supabase
        .from('admin_notification_settings')
        .select('notify_new_leads')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle(),
    ])
      .then(([prefs, leadsSetting]) => {
        if (prefs) {
          setAdminPrefs({
            notify_messages: prefs.notify_messages,
            notify_blog_posts: prefs.notify_blog_posts,
            notify_comment_replies: prefs.notify_comment_replies,
            notify_post_comments: prefs.notify_post_comments,
          });
        }
        setNotifyNewLeads(leadsSetting.data?.notify_new_leads ?? false);
      })
      .catch(console.error)
      .finally(() => setPrefsLoading(false));
  }, [userEmail]);

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

  async function handleNewLeadsToggle(value: boolean) {
    setNotifyNewLeads(value);
    try {
      const { error } = await supabase
        .from('admin_notification_settings')
        .upsert(
          { email: userEmail, notify_new_leads: value, is_active: true },
          { onConflict: 'email' }
        );
      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch {
      setNotifyNewLeads(!value);
      toast.error('Failed to save preferences');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
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
          <>
            <div className="flex items-center justify-between gap-4 py-1">
              <Label htmlFor="notify_new_leads" className="flex flex-col gap-0.5 cursor-pointer flex-1">
                <span className="font-medium">New Enrollment Inquiries</span>
                <span className="text-xs text-muted-foreground font-normal">Email me when a family submits a contact form</span>
              </Label>
              <Switch
                id="notify_new_leads"
                checked={notifyNewLeads}
                onCheckedChange={handleNewLeadsToggle}
              />
            </div>
            {([
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
            ))}
          </>
        )}
        <NotificationRecipients />
      </CardContent>
    </Card>
  );
}
