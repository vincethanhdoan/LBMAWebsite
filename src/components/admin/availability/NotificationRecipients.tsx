import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Loader2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase/client';
import {
  getAdminNotificationSettings,
  getAdminEmails,
} from '../../../lib/supabase/queries';
import { SectionHeader, Surface } from '../leads/ui';
import type { AdminNotificationSetting } from '../../../lib/types';

export function NotificationRecipients() {
  const [notifSettings, setNotifSettings] = useState<
    AdminNotificationSetting[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifSaving, setNotifSaving] = useState(false);
  const [adminUsers, setAdminUsers] = useState<
    {
      user_id: string;
      email: string;
      display_name: string;
      is_active: boolean;
      last_sign_in_at: string | null;
    }[]
  >([]);

  const loadNotifs = useCallback(async () => {
    setNotifSettings(await getAdminNotificationSettings());
  }, []);

  useEffect(() => {
    async function load() {
      setAdminUsers(await getAdminEmails());
      await loadNotifs();
      setLoading(false);
    }
    load();
  }, [loadNotifs]);

  async function addNotifRecipient() {
    setNotifSaving(true);
    try {
      const { error } = await supabase.rpc(
        'upsert_admin_notification_setting',
        {
          p_email: notifEmail,
          p_notify_new_leads: true,
        },
      );
      if (error) {
        toast.error('Failed to add recipient');
        return;
      }
      await loadNotifs();
      setNotifEmail('');
      setShowNotifForm(false);
    } finally {
      setNotifSaving(false);
    }
  }

  async function removeNotifRecipient(settingId: string) {
    const { error } = await supabase.rpc('delete_admin_notification_setting', {
      p_setting_id: settingId,
    });
    if (error) {
      toast.error('Failed to remove recipient');
      return;
    }
    await loadNotifs();
  }

  async function toggleNotifNewLeads(settingId: string, current: boolean) {
    const setting = notifSettings.find((n) => n.setting_id === settingId);
    if (!setting) return;
    const { error } = await supabase.rpc('upsert_admin_notification_setting', {
      p_email: setting.email,
      p_notify_new_leads: !current,
    });
    if (error) {
      toast.error('Failed to update recipient');
      return;
    }
    await loadNotifs();
  }

  return (
    <section>
      <SectionHeader
        title="New-lead emails"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotifForm(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add recipient
          </Button>
        }
      />
      <p className="text-[13px] text-muted-foreground mb-3">
        These addresses get an email when a family submits an inquiry.
      </p>
      <Surface>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifSettings.length === 0 ? (
          <p className="text-[13px] text-muted-foreground px-4 py-3">
            No notification recipients configured.
          </p>
        ) : (
          notifSettings.map((n) => (
            <div
              key={n.setting_id}
              className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0"
            >
              <span className="flex-1 min-w-0 text-[13px] truncate">
                {n.email}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Switch
                  checked={n.notify_new_leads}
                  onCheckedChange={() =>
                    toggleNotifNewLeads(n.setting_id, n.notify_new_leads)
                  }
                  id={`notif-${n.setting_id}`}
                />
                <Label
                  htmlFor={`notif-${n.setting_id}`}
                  className="text-[11px] text-muted-foreground cursor-pointer"
                >
                  New leads
                </Label>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => removeNotifRecipient(n.setting_id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </Surface>
      {showNotifForm && (
        <div className="mt-3 flex gap-2">
          <select
            value={notifEmail}
            onChange={(e) => setNotifEmail(e.target.value)}
            className="flex-1 rounded border px-3 py-2 text-sm bg-background"
          >
            <option value="">Select admin…</option>
            {adminUsers
              .filter(
                (u) =>
                  u.is_active &&
                  u.last_sign_in_at !== null &&
                  !notifSettings.some((n) => n.email === u.email),
              )
              .map((u) => (
                <option key={u.user_id} value={u.email}>
                  {u.display_name} ({u.email})
                </option>
              ))}
          </select>
          <Button
            size="sm"
            onClick={addNotifRecipient}
            disabled={notifSaving || !notifEmail}
          >
            {notifSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNotifForm(false);
              setNotifEmail('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </section>
  );
}
