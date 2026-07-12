import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase/client';
import { getAppointmentSlots } from '../../../lib/supabase/queries';
import { upsertAppointmentSlot } from '../../../lib/supabase/mutations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { SectionHeader, Surface } from '../leads/ui';
import { PROGRAM_LABELS } from '../leads/leadDisplay';
import type { AppointmentSlot } from '../../../lib/types';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEK_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Every' },
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
];

const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

function durationLabel(minutes: number): string {
  return minutes % 60 === 0
    ? `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`
    : `${minutes} min`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function slotScheduleLabel(slot: AppointmentSlot): string {
  const start = new Date('1970-01-01T' + slot.start_time);
  const end = new Date(start.getTime() + slot.duration_minutes * 60000);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function slotFrequencyLabel(slot: AppointmentSlot): string {
  return (
    WEEK_OPTIONS.find((o) => o.value === (slot.week_of_month ?? null))?.label ??
    'Every'
  );
}

// Sort order within a day: Every, 1st–4th, Last.
function weekSortIndex(week: number | null): number {
  return week == null ? 0 : week === -1 ? 5 : week;
}

export function SlotSettings() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editSlotId, setEditSlotId] = useState<string | null>(null);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<string | null>(null);
  const [slotDay, setSlotDay] = useState('1');
  const [slotWeekOfMonth, setSlotWeekOfMonth] = useState<number | null>(null);
  const [slotStart, setSlotStart] = useState('');
  const [slotProgramType, setSlotProgramType] = useState<
    'little_dragons' | 'youth' | 'all'
  >('all');
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotSaving, setSlotSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    setSlots(await getAppointmentSlots());
  }, []);

  useEffect(() => {
    async function load() {
      await loadSlots();
      setLoading(false);
    }
    load();
  }, [loadSlots]);

  function startEditSlot(slot: AppointmentSlot) {
    setEditSlotId(slot.slot_id);
    setSlotDay(String(slot.day_of_week));
    setSlotWeekOfMonth(slot.week_of_month ?? null);
    setSlotStart(slot.start_time.slice(0, 5));
    setSlotProgramType(
      (slot.program_type ?? 'all') as 'little_dragons' | 'youth' | 'all',
    );
    setSlotDuration(slot.duration_minutes);
    setSlotError(null);
    setShowSlotForm(true);
  }

  function resetSlotForm() {
    setEditSlotId(null);
    setSlotDay('1');
    setSlotWeekOfMonth(null);
    setSlotStart('');
    setSlotProgramType('all');
    setSlotDuration(60);
    setSlotError(null);
    setShowSlotForm(false);
  }

  async function saveSlot() {
    setSlotError(null);
    const dayOfWeek = parseInt(slotDay);
    const startNorm = slotStart.slice(0, 5);
    const duplicate = slots.some(
      (s) =>
        s.slot_id !== editSlotId &&
        s.is_active &&
        s.day_of_week === dayOfWeek &&
        s.start_time.slice(0, 5) === startNorm &&
        (s.week_of_month ?? null) === slotWeekOfMonth &&
        (s.program_type === 'all' ||
          slotProgramType === 'all' ||
          s.program_type === slotProgramType),
    );
    if (duplicate) {
      setSlotError('A slot with this day, time, and program already exists.');
      return;
    }
    const freq =
      WEEK_OPTIONS.find((o) => o.value === slotWeekOfMonth)?.label ?? 'Every';
    const autoLabel = `${freq} ${DAY_NAMES[dayOfWeek]}`;
    setSlotSaving(true);
    try {
      await upsertAppointmentSlot({
        slotId: editSlotId ?? undefined,
        dayOfWeek,
        startTime: slotStart,
        durationMinutes: slotDuration,
        label: autoLabel,
        weekOfMonth: slotWeekOfMonth,
        programType: slotProgramType,
      });
      await loadSlots();
      resetSlotForm();
      toast.success('Slot saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/midnight|duration_minutes|program_type/.test(message)) {
        toast.error(message);
      } else {
        toast.error('Failed to save slot');
      }
    } finally {
      setSlotSaving(false);
    }
  }

  async function deleteSlot(slotId: string) {
    const { error } = await supabase.rpc('delete_appointment_slot', {
      p_slot_id: slotId,
    });
    if (error) {
      toast.error('Failed to delete slot');
    } else {
      await loadSlots();
      toast.success('Slot removed');
    }
    setDeleteSlotTarget(null);
  }

  const sortedSlots = [...slots].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week ||
      a.start_time.localeCompare(b.start_time) ||
      weekSortIndex(a.week_of_month) - weekSortIndex(b.week_of_month),
  );

  return (
    <section>
      <SectionHeader
        title="Weekly slots"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetSlotForm();
              setShowSlotForm(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add slot
          </Button>
        }
      />
      <p className="text-[13px] text-muted-foreground mb-3">
        Families pick from these times when they book.
      </p>
      <Surface>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedSlots.length === 0 ? (
          <p className="text-[13px] text-muted-foreground px-4 py-3">
            No appointment slots configured.
          </p>
        ) : (
          sortedSlots.map((slot) => (
            <div
              key={slot.slot_id}
              className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0"
            >
              <span className="text-[13px] font-semibold w-24 flex-shrink-0">
                {slotFrequencyLabel(slot)}{' '}
                {DAY_NAMES[slot.day_of_week].slice(0, 3)}
              </span>
              <span className="flex-1 min-w-0 text-[13px] truncate">
                {slotScheduleLabel(slot)} ·{' '}
                {durationLabel(slot.duration_minutes)} ·{' '}
                {slot.program_type === 'all'
                  ? 'Both programs'
                  : PROGRAM_LABELS[slot.program_type]}
              </span>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => startEditSlot(slot)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteSlotTarget(slot.slot_id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </Surface>

      {showSlotForm && (
        <div className="mt-4 p-4 rounded border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium">
            {editSlotId ? 'Edit slot' : 'Add slot'}
          </h4>
          <div>
            <Label>Day of week</Label>
            <select
              value={slotDay}
              onChange={(e) => setSlotDay(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-background"
            >
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Frequency</Label>
            <div className="mt-1 flex gap-1 flex-wrap">
              {WEEK_OPTIONS.map((opt) => (
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
              onChange={(e) =>
                setSlotProgramType(
                  e.target.value as 'little_dragons' | 'youth' | 'all',
                )
              }
              className="border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="all">All programs</option>
              <option value="little_dragons">Little Dragons</option>
              <option value="youth">Youth Program</option>
            </select>
          </div>
          <div>
            <Label>Start time</Label>
            <Input
              type="time"
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Length</Label>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(parseInt(e.target.value))}
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-background"
            >
              {DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {durationLabel(m)}
                </option>
              ))}
            </select>
          </div>
          {slotError && <p className="text-sm text-destructive">{slotError}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={resetSlotForm}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveSlot}
              disabled={slotSaving || !slotStart}
            >
              {slotSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteSlotTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSlotTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Families can no longer book this slot. Existing appointments are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteSlotTarget) deleteSlot(deleteSlotTarget);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
