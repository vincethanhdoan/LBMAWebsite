import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { getAppointmentSlots, getAdminNotificationSettings, getAdminEmails } from '../../lib/supabase/queries'
import type { AppointmentSlot, AppointmentSlotOverride, AdminNotificationSetting } from '../../lib/types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const WEEK_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Every' },
  { value: 1,    label: '1st' },
  { value: 2,    label: '2nd' },
  { value: 3,    label: '3rd' },
  { value: 4,    label: '4th' },
  { value: -1,   label: 'Last' },
]

function slotScheduleLabel(slot: AppointmentSlot): string {
  const day = DAY_NAMES[slot.day_of_week]
  const freq = WEEK_OPTIONS.find(o => o.value === slot.week_of_month)?.label ?? 'Every'
  return `${freq} ${day}  ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`
}

export function AdminAvailabilitySettings() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [overrides, setOverrides] = useState<AppointmentSlotOverride[]>([])
  const [notifSettings, setNotifSettings] = useState<AdminNotificationSetting[]>([])
  const [loading, setLoading] = useState(true)

  // Slot form state
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)
  const [slotDay, setSlotDay] = useState('1')
  const [slotWeekOfMonth, setSlotWeekOfMonth] = useState<number | null>(null)
  const [slotStart, setSlotStart] = useState('')
  const [slotEnd, setSlotEnd] = useState('')
  const [slotLabel, setSlotLabel] = useState('')
  const [slotProgramType, setSlotProgramType] = useState<'little_dragons' | 'youth' | 'all'>('all')
  const [slotSaving, setSlotSaving] = useState(false)

  // Override form state
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideSlotId, setOverrideSlotId] = useState('')
  const [overrideDate, setOverrideDate] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)

  // Notification recipient form
  const [showNotifForm, setShowNotifForm] = useState(false)
  const [notifEmail, setNotifEmail] = useState('')
  const [notifSaving, setNotifSaving] = useState(false)
  const [adminUsers, setAdminUsers] = useState<{ user_id: string; email: string; display_name: string }[]>([])

  useEffect(() => {
    async function load() {
      const [slotsData, notifsData, adminsData] = await Promise.all([
        getAppointmentSlots(),
        getAdminNotificationSettings(),
        getAdminEmails(),
      ])
      setSlots(slotsData)
      setNotifSettings(notifsData)
      setAdminUsers(adminsData)

      // Load overrides
      const { data: ovData } = await supabase
        .from('appointment_slot_overrides')
        .select('*')
        .order('override_date')
      setOverrides(ovData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function startEditSlot(slot: AppointmentSlot) {
    setEditSlotId(slot.slot_id)
    setSlotDay(String(slot.day_of_week))
    setSlotWeekOfMonth(slot.week_of_month ?? null)
    setSlotStart(slot.start_time.slice(0, 5))
    setSlotEnd(slot.end_time.slice(0, 5))
    setSlotLabel(slot.label)
    setSlotProgramType((slot.program_type ?? 'all') as 'little_dragons' | 'youth' | 'all')
    setShowSlotForm(true)
  }

  function resetSlotForm() {
    setEditSlotId(null)
    setSlotDay('1')
    setSlotWeekOfMonth(null)
    setSlotStart('')
    setSlotEnd('')
    setSlotLabel('')
    setSlotProgramType('all')
    setShowSlotForm(false)
  }

  async function saveSlot() {
    setSlotSaving(true)
    try {
      const { data } = await supabase.rpc('upsert_appointment_slot', {
        p_slot_id: editSlotId ?? null,
        p_day_of_week: parseInt(slotDay),
        p_start_time: slotStart,
        p_end_time: slotEnd,
        p_label: slotLabel,
        p_week_of_month: slotWeekOfMonth,
      })
      const savedSlotId = editSlotId ?? (data as string)
      await supabase.from('appointment_slots').update({ program_type: slotProgramType }).eq('slot_id', savedSlotId)
      if (editSlotId) {
        setSlots(prev => prev.map(s => s.slot_id === editSlotId
          ? { ...s, day_of_week: parseInt(slotDay), week_of_month: slotWeekOfMonth, start_time: slotStart, end_time: slotEnd, label: slotLabel, program_type: slotProgramType }
          : s))
      } else {
        const newSlot: AppointmentSlot = {
          slot_id: savedSlotId,
          day_of_week: parseInt(slotDay),
          week_of_month: slotWeekOfMonth,
          start_time: slotStart,
          end_time: slotEnd,
          label: slotLabel,
          program_type: slotProgramType,
          is_active: true,
          created_at: new Date().toISOString(),
        }
        setSlots(prev => [...prev, newSlot])
      }
      resetSlotForm()
    } finally {
      setSlotSaving(false)
    }
  }

  async function deleteSlot(slotId: string) {
    await supabase.rpc('delete_appointment_slot', { p_slot_id: slotId })
    setSlots(prev => prev.filter(s => s.slot_id !== slotId))
  }

  async function addOverride() {
    setOverrideSaving(true)
    try {
      const { data } = await supabase.rpc('add_slot_override', {
        p_slot_id: overrideSlotId || slots[0]?.slot_id,
        p_override_date: overrideDate,
        p_reason: overrideReason || null,
      })
      const newOverride: AppointmentSlotOverride = {
        override_id: data as string,
        slot_id: overrideSlotId || slots[0]?.slot_id,
        override_date: overrideDate,
        reason: overrideReason || null,
        created_at: new Date().toISOString(),
      }
      setOverrides(prev => [...prev, newOverride].sort((a, b) => a.override_date.localeCompare(b.override_date)))
      setOverrideDate('')
      setOverrideReason('')
      setShowOverrideForm(false)
    } finally {
      setOverrideSaving(false)
    }
  }

  async function removeOverride(overrideId: string) {
    await supabase.rpc('remove_slot_override', { p_override_id: overrideId })
    setOverrides(prev => prev.filter(o => o.override_id !== overrideId))
  }

  async function addNotifRecipient() {
    setNotifSaving(true)
    try {
      await supabase.rpc('upsert_admin_notification_setting', {
        p_email: notifEmail,
        p_notify_new_leads: true,
      })
      await getAdminNotificationSettings().then(setNotifSettings)
      setNotifEmail('')
      setShowNotifForm(false)
    } finally {
      setNotifSaving(false)
    }
  }

  async function removeNotifRecipient(settingId: string) {
    await supabase.rpc('delete_admin_notification_setting', { p_setting_id: settingId })
    setNotifSettings(prev => prev.filter(n => n.setting_id !== settingId))
  }

  async function toggleNotifNewLeads(settingId: string, current: boolean) {
    const setting = notifSettings.find(n => n.setting_id === settingId)
    if (!setting) return
    await supabase.rpc('upsert_admin_notification_setting', {
      p_email: setting.email,
      p_notify_new_leads: !current,
    })
    setNotifSettings(prev => prev.map(n => n.setting_id === settingId ? { ...n, notify_new_leads: !current } : n))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      {/* Appointment Slots */}
      <div className="rounded-lg border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Appointment Availability</h3>
          <Button size="sm" variant="outline" onClick={() => { resetSlotForm(); setShowSlotForm(true) }} className="gap-1.5">
            <Plus className="w-4 h-4" />Add Slot
          </Button>
        </div>
        <div className="space-y-2">
          {slots.map(slot => (
            <div key={slot.slot_id} className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded border">
              <div>
                <span className="font-medium text-sm">{slot.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {slotScheduleLabel(slot)} · {slot.program_type === 'all' ? 'All programs' : slot.program_type === 'little_dragons' ? 'Little Dragons' : 'Youth Program'}
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditSlot(slot)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteSlot(slot.slot_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
          {slots.length === 0 && <p className="text-sm text-muted-foreground">No appointment slots configured.</p>}
        </div>

        {showSlotForm && (
          <div className="mt-4 p-4 rounded border bg-muted/30 space-y-3">
            <h4 className="text-sm font-medium">{editSlotId ? 'Edit slot' : 'Add slot'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Day of week</Label>
                <select value={slotDay} onChange={e => setSlotDay(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm bg-background">
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label>Label</Label>
                <Input value={slotLabel} onChange={e => setSlotLabel(e.target.value)} className="mt-1" placeholder="e.g. 1st Monday 4–6pm" />
              </div>
            </div>
            <div>
              <Label>Frequency</Label>
              <div className="mt-1 flex gap-1 flex-wrap">
                {WEEK_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setSlotWeekOfMonth(opt.value)}
                    className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                      slotWeekOfMonth === opt.value
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Program type</Label>
              <select
                value={slotProgramType}
                onChange={e => setSlotProgramType(e.target.value as 'little_dragons' | 'youth' | 'all')}
                className="border border-border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="all">All programs</option>
                <option value="little_dragons">Little Dragons</option>
                <option value="youth">Youth Program</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End time</Label>
                <Input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={resetSlotForm}>Cancel</Button>
              <Button size="sm" onClick={saveSlot} disabled={slotSaving || !slotLabel || !slotStart || !slotEnd}>
                {slotSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Blocked Dates */}
      <div className="rounded-lg border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">Blocked Dates</h3>
          <Button size="sm" variant="outline" onClick={() => setShowOverrideForm(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />Block Date
          </Button>
        </div>
        <div className="space-y-1.5">
          {overrides.map(o => (
            <div key={o.override_id} className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded border text-sm">
              <div>
                <span className="font-medium">{o.override_date}</span>
                {o.reason && <span className="text-muted-foreground ml-2">— {o.reason}</span>}
                <span className="text-xs text-muted-foreground ml-2">({slots.find(s => s.slot_id === o.slot_id)?.label ?? 'Unknown slot'})</span>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeOverride(o.override_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
          {overrides.length === 0 && <p className="text-sm text-muted-foreground">No blocked dates.</p>}
        </div>
        {showOverrideForm && (
          <div className="mt-3 p-4 rounded border bg-muted/30 space-y-3">
            {slots.length > 1 && (
              <div>
                <Label>Slot</Label>
                <select value={overrideSlotId} onChange={e => setOverrideSlotId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm bg-background">
                  {slots.map(s => <option key={s.slot_id} value={s.slot_id}>{s.label}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date to block</Label>
                <Input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="mt-1" placeholder="Holiday, closed, etc." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowOverrideForm(false)}>Cancel</Button>
              <Button size="sm" onClick={addOverride} disabled={overrideSaving || !overrideDate || (slots.length > 1 && !overrideSlotId)}>
                {overrideSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Recipients */}
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
                  .filter(u => !notifSettings.some(n => n.email === u.email))
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
    </div>
  )
}
