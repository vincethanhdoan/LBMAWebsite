import { useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import type { Locale } from 'react-day-picker';
import { enUS, es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import './booking-calendar.css';
import { Loader2 } from 'lucide-react';
import { getUpcomingBookableDates } from '../../lib/supabase/queries';
import { visitPickerCopy } from './visitPickerCopy';
import type { VisitPickerLanguage } from './visitPickerCopy';
import type { AppointmentSlot } from '../../lib/types';

// Kept here (not in visitPickerCopy.ts) so the calendar's locale data only
// loads with this already-lazy-loaded component, not wherever the plain
// strings in visitPickerCopy are needed.
const dateLocales: Record<VisitPickerLanguage, Locale> = { en: enUS, es };

export type VisitChoice = {
  slotId: string;
  date: string;
  startTime: string;
};

interface DateOption {
  slotId: string;
  startTime: string;
}

interface VisitPickerProps {
  slots: AppointmentSlot[];
  value: VisitChoice | null;
  onChange: (choice: VisitChoice | null) => void;
  onDaySelect?: (dateKey: string | null) => void;
  language: VisitPickerLanguage;
  allowToday?: boolean;
  refreshKey?: string | number;
  emptyMessage: string;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(timeStr: string, localeCode: string): string {
  return new Date('1970-01-01T' + timeStr).toLocaleTimeString(localeCode, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sameChoice(a: VisitChoice | null, b: VisitChoice | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.slotId === b.slotId && a.date === b.date && a.startTime === b.startTime
  );
}

export function VisitPicker({
  slots,
  value,
  onChange,
  onDaySelect,
  language,
  allowToday = false,
  refreshKey,
  emptyMessage,
}: VisitPickerProps) {
  const copy = visitPickerCopy[language];
  const localeCode = language === 'es' ? 'es-US' : 'en-US';
  const slotIds = useMemo(() => slots.map((s) => s.slot_id).join(','), [slots]);

  const [availableMap, setAvailableMap] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [fetching, setFetching] = useState(slotIds === '' ? false : true);
  const [fetchFailed, setFetchFailed] = useState(false);
  // A day the visitor picked that has more than one arrival time and no
  // time chosen yet. Whenever `value` is set, it (not this) is the source
  // of truth for which day is selected — see `selectedKey` below.
  const [pendingDayKey, setPendingDayKey] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState(value);

  // Derive rather than mirror: if a caller changes `value` to a different
  // choice, or clears it, a stale local pendingDayKey must not keep the old
  // day highlighted. This runs during render (not an effect) so it resolves
  // before this render commits. Our own handlers below keep `prevValue` in
  // step with the `value` they expect to produce, so this only ever fires
  // for a change this component didn't itself just request.
  if (!sameChoice(value, prevValue)) {
    setPrevValue(value);
    setPendingDayKey(null);
  }

  // A pending day that a refetch dropped from the map is stale: derive it
  // out of `selectedKey` rather than reaching for an effect to clear it.
  const selectedKey = value
    ? value.date
    : pendingDayKey && availableMap.has(pendingDayKey)
      ? pendingDayKey
      : null;

  useEffect(() => {
    onDaySelect?.(selectedKey);
  }, [selectedKey, onDaySelect]);

  useEffect(() => {
    if (slotIds === '') return;
    const ids = slotIds.split(',');
    let cancelled = false;
    Promise.all(
      ids.map((id) =>
        getUpcomingBookableDates(id, 20, allowToday).then((dates) => ({
          id,
          dates,
        })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, string[]>();
        for (const { id, dates } of results) {
          for (const date of dates) {
            const existing = map.get(date) ?? [];
            existing.push(id);
            map.set(date, existing);
          }
        }
        setAvailableMap(map);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slotIds, allowToday, refreshKey]);

  // Once a refetch lands, drop a chosen value that is no longer bookable.
  // (A stale pending day needs no such effect — `selectedKey` above already
  // stops reading it once it drops out of `availableMap`.)
  useEffect(() => {
    if (fetching || !value) return;
    const dayIds = availableMap.get(value.date) ?? [];
    if (!dayIds.includes(value.slotId)) {
      onChange(null);
    }
  }, [fetching, availableMap, value, onChange]);

  function getDayOptions(dateKey: string): DateOption[] {
    const ids = availableMap.get(dateKey) ?? [];
    return ids
      .map((id) => slots.find((s) => s.slot_id === id))
      .filter((s): s is AppointmentSlot => s !== undefined)
      .map((s) => ({ slotId: s.slot_id, startTime: s.start_time }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function handleDaySelect(date: Date | undefined) {
    if (!date) {
      setPendingDayKey(null);
      onChange(null);
      return;
    }
    const dateKey = toDateKey(date);
    const options = getDayOptions(dateKey);
    // Set the pending day for both branches, not just the multi-time one:
    // it's the fallback `selectedKey` uses whenever a caller doesn't (yet)
    // hand the new value back as a prop, so the day/time stay visible even
    // one render ahead of the parent's own state updating.
    setPendingDayKey(dateKey);
    if (options.length === 1) {
      onChange({
        slotId: options[0].slotId,
        date: dateKey,
        startTime: options[0].startTime,
      });
    } else {
      // We're nulling `value` ourselves as part of picking this new day.
      // Pre-empt the render-time check above with the `value` this is
      // expected to produce, so it doesn't mistake our own action for an
      // external reset and immediately clear the pending day we just set.
      setPrevValue(null);
      onChange(null);
    }
  }

  function handleTimeSelect(option: DateOption) {
    if (!selectedKey) return;
    onChange({
      slotId: option.slotId,
      date: selectedKey,
      startTime: option.startTime,
    });
  }

  if (fetching) {
    return (
      <div
        className="flex justify-center py-8"
        role="status"
        aria-label={copy.loading}
      >
        <Loader2
          className="w-5 h-5 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (fetchFailed) {
    return (
      <p role="alert" className="text-sm text-destructive text-center py-4">
        {copy.loadError}
      </p>
    );
  }

  if (availableMap.size === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  const availableDates = Array.from(availableMap.keys()).map(
    (d) => new Date(d + 'T12:00:00'),
  );
  const firstAvailableKey = Array.from(availableMap.keys()).sort()[0];
  const defaultMonth = new Date(firstAvailableKey + 'T12:00:00');
  const selectedDayDate = selectedKey
    ? new Date(selectedKey + 'T12:00:00')
    : undefined;
  const dayOptions = selectedKey ? getDayOptions(selectedKey) : [];
  const selectedDayAnnouncement = selectedDayDate
    ? copy.selectedDay(
        selectedDayDate.toLocaleDateString(localeCode, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
      )
    : '';

  return (
    <div className="booking-calendar">
      <DayPicker
        mode="single"
        selected={selectedDayDate}
        onSelect={handleDaySelect}
        disabled={(date) => !availableMap.has(toDateKey(date))}
        modifiers={{ available: availableDates }}
        modifiersClassNames={{ available: 'rdp-day_available' }}
        showOutsideDays={false}
        locale={dateLocales[language]}
        defaultMonth={defaultMonth}
      />

      {selectedDayDate && dayOptions.length > 0 && (
        <div
          role="group"
          aria-label={copy.chooseTime}
          className="mt-3 space-y-2"
        >
          {dayOptions.map((option) => {
            const isChosen = value?.slotId === option.slotId;
            return (
              <button
                key={option.slotId}
                type="button"
                aria-pressed={isChosen}
                onClick={() => handleTimeSelect(option)}
                className={`w-full min-h-[44px] text-left p-3 rounded-lg border-2 transition-colors ${
                  isChosen
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-sm text-foreground">
                    {copy.arriveAt(formatTime(option.startTime, localeCode))}
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

      <p aria-live="polite" className="sr-only">
        {selectedDayAnnouncement}
      </p>
    </div>
  );
}
