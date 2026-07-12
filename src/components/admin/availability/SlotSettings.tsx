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

type ProgramType = 'little_dragons' | 'youth' | 'all';

interface SlotDraft {
  day: number;
  startTime: string;
  programType: ProgramType;
  weekOfMonth: number | null;
}

const ADD_DEFAULTS: SlotDraft = {
  day: 1,
  startTime: '',
  programType: 'all',
  weekOfMonth: null,
};

const FIELD_CLASS =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';

function slotToDraft(slot: AppointmentSlot): SlotDraft {
  return {
    day: slot.day_of_week,
    startTime: slot.start_time.slice(0, 5),
    programType: (slot.program_type ?? 'all') as ProgramType,
    weekOfMonth: slot.week_of_month ?? null,
  };
}

function SlotForm({
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: SlotDraft;
  saving: boolean;
  error: string | null;
  onSave: (draft: SlotDraft) => void;
  onCancel: () => void;
}) {
  const [day, setDay] = useState(initial.day);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [programType, setProgramType] = useState<ProgramType>(
    initial.programType,
  );
  const [weekOfMonth, setWeekOfMonth] = useState<number | null>(
    initial.weekOfMonth,
  );
  const [repeatsOpen, setRepeatsOpen] = useState(initial.weekOfMonth != null);

  return (
    <div className="bg-muted/30 px-4 py-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label>Day</Label>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className={FIELD_CLASS}
          >
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Start time</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Program</Label>
          <select
            value={programType}
            onChange={(e) => setProgramType(e.target.value as ProgramType)}
            className={FIELD_CLASS}
          >
            <option value="all">All programs</option>
            <option value="little_dragons">Little Dragons</option>
            <option value="youth">Youth Program</option>
          </select>
        </div>
      </div>
      <Collapsible open={repeatsOpen} onOpenChange={setRepeatsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronRight
            className={`w-4 h-4 transition-transform ${repeatsOpen ? 'rotate-90' : ''}`}
          />
          {weekOfMonth == null
            ? 'Repeats every week'
            : `Repeats on the ${
                WEEK_OPTIONS.find((o) => o.value === weekOfMonth)?.label
              } week`}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="flex gap-1 flex-wrap">
            {WEEK_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setWeekOfMonth(opt.value)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  weekOfMonth === opt.value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            “Every” means weekly. Pick a week to repeat only on that week of the
            month.
          </p>
        </CollapsibleContent>
      </Collapsible>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave({ day, startTime, programType, weekOfMonth })}
          disabled={saving || !startTime}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export function SlotSettings() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editSlotId, setEditSlotId] = useState<string | null>(null);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<string | null>(null);
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

  function closeForm() {
    setMode(null);
    setEditSlotId(null);
    setSlotError(null);
  }

  function openAddForm() {
    setEditSlotId(null);
    setSlotError(null);
    setMode('add');
  }

  function startEditSlot(slot: AppointmentSlot) {
    setEditSlotId(slot.slot_id);
    setSlotError(null);
    setMode('edit');
  }

  async function saveSlot(draft: SlotDraft) {
    setSlotError(null);
    const startNorm = draft.startTime.slice(0, 5);
    const duplicate = slots.some(
      (s) =>
        s.slot_id !== editSlotId &&
        s.is_active &&
        s.day_of_week === draft.day &&
        s.start_time.slice(0, 5) === startNorm &&
        (s.week_of_month ?? null) === draft.weekOfMonth &&
        (s.program_type === 'all' ||
          draft.programType === 'all' ||
          s.program_type === draft.programType),
    );
    if (duplicate) {
      setSlotError('A slot with this day, time, and program already exists.');
      return;
    }
    const freq =
      WEEK_OPTIONS.find((o) => o.value === draft.weekOfMonth)?.label ?? 'Every';
    const autoLabel = `${freq} ${DAY_NAMES[draft.day]}`;
    setSlotSaving(true);
    try {
      await upsertAppointmentSlot({
        slotId: editSlotId ?? undefined,
        dayOfWeek: draft.day,
        startTime: draft.startTime,
        label: autoLabel,
        weekOfMonth: draft.weekOfMonth,
        programType: draft.programType,
      });
      await loadSlots();
      closeForm();
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

  return (
    <section>
      <SectionHeader
        title="Weekly slots"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={openAddForm}
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
        ) : (
          <>
            {mode === 'add' && (
              <SlotForm
                key="add-form"
                initial={ADD_DEFAULTS}
                saving={slotSaving}
                error={slotError}
                onSave={saveSlot}
                onCancel={closeForm}
              />
            )}
            {slots.length === 0 ? (
              mode !== 'add' && (
                <p className="text-[13px] text-muted-foreground px-4 py-3">
                  No appointment slots configured.
                </p>
              )
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
                    {group.slots.map((slot) =>
                      mode === 'edit' && editSlotId === slot.slot_id ? (
                        <SlotForm
                          key={slot.slot_id}
                          initial={slotToDraft(slot)}
                          saving={slotSaving}
                          error={slotError}
                          onSave={saveSlot}
                          onCancel={closeForm}
                        />
                      ) : (
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
                      ),
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Surface>

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
