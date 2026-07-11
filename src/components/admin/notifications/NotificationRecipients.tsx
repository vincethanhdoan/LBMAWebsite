import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase/client'
import { getAdminNotificationSettings, getAdminEmails } from '../../../lib/supabase/queries'
import type { AdminNotificationSetting } from '../../../lib/types'

export function NotificationRecipients() {
  const [notifSettings, setNotifSettings] = useState<AdminNotificationSetting[]>([])
  const [loading, setLoading] = useState(true)

  const [showNotifForm, setShowNotifForm] = useState(false)
  const [notifEmail, setNotifEmail] = useState('')
  const [notifSaving, setNotifSaving] = useState(false)
  const [adminUsers, setAdminUsers] = useState<{ user_id: string; email: string; display_name: string; is_active: boolean; last_sign_in_at: string | null }[]>([])

  const loadNotifs = useCallback(async () => {
    setNotifSettings(await getAdminNotificationSettings())
  }, [])

  useEffect(() => {
    async function load() {
      setAdminUsers(await getAdminEmails())
      await loadNotifs()
      setLoading(false)
    }
    load()
  }, [loadNotifs])

  async function addNotifRecipient() {
    setNotifSaving(true)
    try {
      const { error } = await supabase.rpc('upsert_admin_notification_setting', {
        p_email: notifEmail,
        p_notify_new_leads: true,
      })
      if (error) { toast.error('Failed to add recipient'); return }
      await loadNotifs()
      setNotifEmail('')
      setShowNotifForm(false)
    } finally {
      setNotifSaving(false)
    }
  }

  async function removeNotifRecipient(settingId: string) {
    const { error } = await supabase.rpc('delete_admin_notification_setting', { p_setting_id: settingId })
    if (error) { toast.error('Failed to remove recipient'); return }
    await loadNotifs()
  }

  async function toggleNotifNewLeads(settingId: string, current: boolean) {
    const setting = notifSettings.find(n => n.setting_id === settingId)
    if (!setting) return
    const { error } = await supabase.rpc('upsert_admin_notification_setting', {
      p_email: setting.email,
      p_notify_new_leads: !current,
    })
    if (error) { toast.error('Failed to update recipient'); return }
    await loadNotifs()
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base">Email Notification Recipients</h3>
        <Button size="sm" variant="outline" onClick={() => setShowNotifForm(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />Add Recipient
        </Button>
      </div>
      <div className="space-y-2">
        {notifSettings.length === 0 && !showNotifForm && (
          <p className="text-sm text-muted-foreground">No notification recipients configured.</p>
        )}
        {notifSettings.map(n => (
          <div key={n.setting_id} className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded border">
            <div className="flex items-center gap-3">
              <span className="text-sm">{n.email}</span>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={n.notify_new_leads}
                  onCheckedChange={() => toggleNotifNewLeads(n.setting_id, n.notify_new_leads)}
                  id={`notif-${n.setting_id}`}
                />
                <Label htmlFor={`notif-${n.setting_id}`} className="text-xs text-muted-foreground cursor-pointer">New leads</Label>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeNotifRecipient(n.setting_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
        {showNotifForm && (
          <div className="flex gap-2 mt-2">
            <select
              value={notifEmail}
              onChange={e => setNotifEmail(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm bg-background"
            >
              <option value="">Select admin…</option>
              {adminUsers
                .filter(u => u.is_active && u.last_sign_in_at !== null && !notifSettings.some(n => n.email === u.email))
                .map(u => (
                  <option key={u.user_id} value={u.email}>
                    {u.display_name} ({u.email})
                  </option>
                ))}
            </select>
            <Button size="sm" onClick={addNotifRecipient} disabled={notifSaving || !notifEmail}>
              {notifSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNotifForm(false); setNotifEmail('') }}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  )
}
