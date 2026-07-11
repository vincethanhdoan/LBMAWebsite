import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase/client'
import { getAppointmentSlots } from '../../../lib/supabase/queries'
import { upsertAppointmentSlot } from '../../../lib/supabase/mutations'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../ui/alert-dialog'
import type { AppointmentSlot } from '../../../lib/types'

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
  return new Date('1970-01-01T' + slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function slotFrequencyLabel(slot: AppointmentSlot): string {
  return WEEK_OPTIONS.find(o => o.value === (slot.week_of_month ?? null))?.label ?? 'Every'
}

// Sort order within a day: Every, 1st–4th, Last.
function weekSortIndex(week: number | null): number {
  return week == null ? 0 : week === -1 ? 5 : week
}

export function SlotSettings() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [loading, setLoading] = useState(true)

  const [showSlotForm, setShowSlotForm] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<string | null>(null)
  const [slotDay, setSlotDay] = useState('1')
  const [slotWeekOfMonth, setSlotWeekOfMonth] = useState<number | null>(null)
  const [slotStart, setSlotStart] = useState('')
  const [slotProgramType, setSlotProgramType] = useState<'little_dragons' | 'youth' | 'all'>('all')
  const [slotSaving, setSlotSaving] = useState(false)

  const loadSlots = useCallback(async () => {
    setSlots(await getAppointmentSlots())
  }, [])

  useEffect(() => {
    async function load() {
      await loadSlots()
      setLoading(false)
    }
    load()
  }, [loadSlots])

  function startEditSlot(slot: AppointmentSlot) {
    setEditSlotId(slot.slot_id)
    setSlotDay(String(slot.day_of_week))
    setSlotWeekOfMonth(slot.week_of_month ?? null)
    setSlotStart(slot.start_time.slice(0, 5))
    setSlotProgramType((slot.program_type ?? 'all') as 'little_dragons' | 'youth' | 'all')
    setShowSlotForm(true)
  }

  function resetSlotForm() {
    setEditSlotId(null)
    setSlotDay('1')
    setSlotWeekOfMonth(null)
    setSlotStart('')
    setSlotProgramType('all')
    setShowSlotForm(false)
  }

  async function saveSlot() {
    const freq = WEEK_OPTIONS.find(o => o.value === slotWeekOfMonth)?.label ?? 'Every'
    const autoLabel = `${freq} ${DAY_NAMES[parseInt(slotDay)]}`
    const durationMinutes = editSlotId
      ? slots.find(s => s.slot_id === editSlotId)?.duration_minutes ?? 60
      : 60
    setSlotSaving(true)
    try {
      await upsertAppointmentSlot({
        slotId: editSlotId ?? undefined,
        dayOfWeek: parseInt(slotDay),
        startTime: slotStart,
        durationMinutes,
        label: autoLabel,
        weekOfMonth: slotWeekOfMonth,
        programType: slotProgramType,
      })
      await loadSlots()
      resetSlotForm()
    } catch {
      toast.error('Failed to save slot')
    } finally {
      setSlotSaving(false)
    }
  }

  async function deleteSlot(slotId: string) {
    const { error } = await supabase.rpc('delete_appointment_slot', { p_slot_id: slotId })
    if (error) { toast.error('Failed to delete slot') }
    else { await loadSlots() }
    setDeleteSlotTarget(null)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  const slotsByDay = DAY_NAMES
    .map((name, day) => ({
      day,
      name,
      slots: slots
        .filter(s => s.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time) || weekSortIndex(a.week_of_month) - weekSortIndex(b.week_of_month)),
    }))
    .filter(g => g.slots.length > 0)

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base">Appointment Availability</h3>
        <Button size="sm" variant="outline" onClick={() => { resetSlotForm(); setShowSlotForm(true) }} className="gap-1.5">
          <Plus className="w-4 h-4" />Add Slot
        </Button>
      </div>
      <div className="space-y-4">
        {slotsByDay.map(group => (
          <div key={group.day}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{group.name}</h4>
            <div className="space-y-2">
              {group.slots.map(slot => (
                <div key={slot.slot_id} className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded border">
                  <div>
                    <span className="font-medium text-sm">{slotScheduleLabel(slot)}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {slotFrequencyLabel(slot)} · {slot.program_type === 'all' ? 'All programs' : slot.program_type === 'little_dragons' ? 'Little Dragons' : 'Youth Program'}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditSlot(slot)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteSlotTarget(slot.slot_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {slots.length === 0 && <p className="text-sm text-muted-foreground">No appointment slots configured.</p>}
      </div>

      {showSlotForm && (
        <div className="mt-4 p-4 rounded border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium">{editSlotId ? 'Edit slot' : 'Add slot'}</h4>
          <div>
            <Label>Day of week</Label>
            <select value={slotDay} onChange={e => setSlotDay(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm bg-background">
              {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
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
          <div>
            <Label>Start time</Label>
            <Input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={resetSlotForm}>Cancel</Button>
            <Button size="sm" onClick={saveSlot} disabled={slotSaving || !slotStart}>
              {slotSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteSlotTarget !== null} onOpenChange={open => { if (!open) setDeleteSlotTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Families will no longer be able to book it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteSlotTarget) deleteSlot(deleteSlotTarget) }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
