import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import './booking-calendar.css';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { getUpcomingBookableDates } from '../../lib/supabase/queries';
import type { AppointmentSlot } from '../../lib/types';

interface DateOption {
  slotId: string;
  startTime: string;
}

interface BookingCalendarProps {
  slots: AppointmentSlot[];
  onConfirm: (slotId: string, date: string) => Promise<void>;
  submitting: boolean;
  confirmLabel?: string;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(timeStr: string): string {
  return new Date('1970-01-01T' + timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BookingCalendar({
  slots,
  onConfirm,
  submitting,
  confirmLabel = 'Confirm Booking',
}: BookingCalendarProps) {
  const [availableMap, setAvailableMap] = useState<Map<string, DateOption[]>>(
    new Map(),
  );
  const [fetching, setFetching] = useState(slots.length === 0 ? false : true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Date | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const slotIds = slots.map((s) => s.slot_id).join(',');

  useEffect(() => {
    if (slots.length === 0) return;
    let cancelled = false;
    Promise.all(
      slots.map((s) =>
        getUpcomingBookableDates(s.slot_id).then((dates) => ({
          slot: s,
          dates,
        })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, DateOption[]>();
        for (const { slot, dates } of results) {
          for (const date of dates) {
            const existing = map.get(date) ?? [];
            existing.push({
              slotId: slot.slot_id,
              startTime: slot.start_time,
            });
            map.set(date, existing);
          }
        }
        // Sort each day's options by start time
        for (const [key, opts] of map) {
          map.set(
            key,
            opts.sort((a, b) => a.startTime.localeCompare(b.startTime)),
          );
        }
        setAvailableMap(map);
      })
      .catch(() => {
        if (!cancelled)
          setFetchError('Failed to load available dates. Please refresh.');
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotIds is a stable string proxy for slot identity; avoids re-fetching on array reference changes
  }, [slotIds]);

  const availableDates = Array.from(availableMap.keys()).map(
    (d) => new Date(d + 'T12:00:00'),
  );
  const selectedKey = selected ? toDateKey(selected) : null;
  const dayOptions = selectedKey ? (availableMap.get(selectedKey) ?? []) : [];
  const selectedOption =
    dayOptions.find((o) => o.slotId === selectedSlotId) ??
    (dayOptions.length === 1 ? dayOptions[0] : null);

  function handleDaySelect(date: Date | undefined) {
    setSelected(date);
    setSelectedSlotId(null);
  }

  async function handleConfirm() {
    if (!selectedKey || !selectedOption) return;
    await onConfirm(selectedOption.slotId, selectedKey);
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <p className="text-sm text-destructive text-center py-4">{fetchError}</p>
    );
  }

  if (availableMap.size === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No available dates in the next 20 weeks. Contact us directly.
      </p>
    );
  }

  return (
    <div className="booking-calendar">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={handleDaySelect}
        disabled={(date) => !availableMap.has(toDateKey(date))}
        modifiers={{ available: availableDates }}
        modifiersClassNames={{ available: 'rdp-day_available' }}
        showOutsideDays={false}
      />

      {selected && dayOptions.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {selected.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            {dayOptions.length > 1 && ' — pick a time'}
          </div>
          {dayOptions.map((option) => {
            const isChosen = selectedOption?.slotId === option.slotId;
            return (
              <button
                key={option.slotId}
                type="button"
                onClick={() => setSelectedSlotId(option.slotId)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  isChosen
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-sm text-foreground">
                    {formatTime(option.startTime)}
                  </div>
                  {isChosen && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs leading-none">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <Button
          onClick={handleConfirm}
          disabled={!selectedOption || submitting}
          className="w-full mt-3"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming…
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      )}
    </div>
  );
}
