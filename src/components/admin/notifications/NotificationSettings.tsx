import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Skeleton } from '../../ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase/client';

type NotificationSettingsProps = {
  userEmail: string;
};

export function NotificationSettings({ userEmail }: NotificationSettingsProps) {
  const [notifyNewLeads, setNotifyNewLeads] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase
          .from('admin_notification_settings')
          .select('notify_new_leads')
          .eq('email', userEmail)
          .eq('is_active', true)
          .maybeSingle();
        setNotifyNewLeads(data?.notify_new_leads ?? false);
      } catch (err) {
        console.error(err);
      } finally {
        setPrefsLoading(false);
      }
    })();
  }, [userEmail]);

  async function handleNewLeadsToggle(value: boolean) {
    setNotifyNewLeads(value);
    try {
      const { error } = await supabase
        .from('admin_notification_settings')
        .upsert(
          { email: userEmail, notify_new_leads: value, is_active: true },
          { onConflict: 'email' },
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
        <CardDescription>
          Choose when you'd like to receive emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {prefsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 py-1">
            <Label
              htmlFor="notify_new_leads"
              className="flex flex-col gap-0.5 cursor-pointer flex-1"
            >
              <span className="font-medium">New Enrollment Inquiries</span>
              <span className="text-xs text-muted-foreground font-normal">
                Email me when a family submits a contact form
              </span>
            </Label>
            <Switch
              id="notify_new_leads"
              checked={notifyNewLeads}
              onCheckedChange={handleNewLeadsToggle}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
