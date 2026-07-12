import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import { Loader2, Pencil, Trash2, Plus, ChevronRight } from 'lucide-react';
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
import {
  DAY_NAMES,
  WEEK_OPTIONS,
  slotStartLabel,
  programLabel,
  programBadgeClass,
  frequencyBadgeLabel,
  groupSlotsByDay,
} from './slotDisplay';
import type { AppointmentSlot } from '../../../lib/types';

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
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotSaving, setSlotSaving] = useState(false);
  const [repeatsOpen, setRepeatsOpen] = useState(false);

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

  function resetSlotForm() {
    setEditSlotId(null);
    setSlotDay('1');
    setSlotWeekOfMonth(null);
    setSlotStart('');
    setSlotProgramType('all');
    setSlotError(null);
    setRepeatsOpen(false);
    setShowSlotForm(false);
  }

  function openAddForm(day?: number) {
    resetSlotForm();
    if (day !== undefined) setSlotDay(String(day));
    setShowSlotForm(true);
  }

  function startEditSlot(slot: AppointmentSlot) {
    setEditSlotId(slot.slot_id);
    setSlotDay(String(slot.day_of_week));
    setSlotWeekOfMonth(slot.week_of_month ?? null);
    setSlotStart(slot.start_time.slice(0, 5));
    setSlotProgramType(
      (slot.program_type ?? 'all') as 'little_dragons' | 'youth' | 'all',
    );
    setSlotError(null);
    setRepeatsOpen(slot.week_of_month != null);
    setShowSlotForm(true);
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
        label: autoLabel,
        weekOfMonth: slotWeekOfMonth,
        programType: slotProgramType,
      });
      await loadSlots();
      resetSlotForm();
      toast.success('Slot saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/program_type/.test(message)) {
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

  const grouped = groupSlotsByDay(slots);
  const usedDays = new Set(grouped.map((g) => g.day));
  const emptyDays = DAY_NAMES.map((_, i) => i).filter((d) => !usedDays.has(d));

  return (
    <section>
      <SectionHeader
        title="Weekly slots"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAddForm()}
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
        ) : slots.length === 0 ? (
          <p className="text-[13px] text-muted-foreground px-4 py-3">
            No appointment slots configured.
          </p>
        ) : (
          <>
            {grouped.map((group) => (
              <div
                key={group.day}
                className="border-t border-border first:border-t-0"
              >
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <h4 className="text-[13px] font-semibold">
                    {DAY_NAMES[group.day]}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {group.slots.length}{' '}
                    {group.slots.length === 1 ? 'time' : 'times'}
                  </span>
                </div>
                {group.slots.map((slot) => (
                  <div
                    key={slot.slot_id}
                    className="flex items-center gap-2.5 px-4 py-2"
                  >
                    <span className="text-[13px] font-medium w-[4.5rem] flex-shrink-0 tabular-nums">
                      {slotStartLabel(slot)}
                    </span>
                    <span
                      className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${programBadgeClass(slot.program_type)}`}
                    >
                      {programLabel(slot.program_type)}
                    </span>
                    {frequencyBadgeLabel(slot) && (
                      <span className="text-[11px] font-medium rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                        {frequencyBadgeLabel(slot)}
                      </span>
                    )}
                    <div className="flex-1" />
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
                ))}
                <button
                  type="button"
                  onClick={() => openAddForm(group.day)}
                  className="flex items-center gap-1 px-4 pb-3 pt-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add time
                </button>
              </div>
            ))}
            {emptyDays.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  Add another day:
                </span>
                {emptyDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => openAddForm(d)}
                    className="text-[12px] rounded-full border border-dashed border-border px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + {DAY_NAMES[d].slice(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </>
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
            <Label>Start time</Label>
            <Input
              type="time"
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Program</Label>
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
          <Collapsible open={repeatsOpen} onOpenChange={setRepeatsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight
                className={`w-4 h-4 transition-transform ${repeatsOpen ? 'rotate-90' : ''}`}
              />
              {slotWeekOfMonth == null
                ? 'Repeats every week'
                : `Repeats on the ${
                    WEEK_OPTIONS.find((o) => o.value === slotWeekOfMonth)?.label
                  } week`}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="flex gap-1 flex-wrap">
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
              <p className="text-[11px] text-muted-foreground mt-1.5">
                “Every” means weekly. Pick a week to repeat only on that week of
                the month.
              </p>
            </CollapsibleContent>
          </Collapsible>
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
