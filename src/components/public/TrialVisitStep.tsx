import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { reportError } from '../../lib/monitoring/sentry';
import { useLanguage } from './lang';
import { V3 } from './design';
import { fillTemplate } from './fillTemplate';
import { joinNames } from '../../lib/contactLinks';
import { programsForChildren } from '../../lib/programs';
import type { Program } from '../../lib/programs';
import { getAppointmentSlots } from '../../lib/supabase/bookingQueries';
import { visitPickerCopy } from '../shared/visitPickerCopy';
import type { VisitChoice, VisitPickerProps } from '../shared/VisitPicker';
import type { AppointmentSlot } from '../../lib/types';

function importVisitPicker() {
  return import('../shared/VisitPicker').then((m) => ({
    default: m.VisitPicker,
  }));
}

type VisitPickerComponent = ComponentType<VisitPickerProps>;

// Module scope, so a chunk that has already arrived is shared by every mount
// and never suspends twice. A retry swaps in a fresh lazy instead of reusing
// this one, because React.lazy remembers a rejected import forever.
const VisitPickerChunk: VisitPickerComponent = lazy(importVisitPicker);

// The 21 days `submit_trial_booking` accepts from the public form. Asking for
// more would show a signed-in staff member days their own submit would refuse,
// since the server only clamps the horizon for anonymous callers.
const PUBLIC_HORIZON_WEEKS = 3;

export type VisitSelections = Partial<Record<Program, VisitChoice>>;

type ChildRow = { name: string; age: string };

interface TrialVisitStepProps {
  children: ChildRow[];
  value: VisitSelections;
  onChange: (next: VisitSelections) => void;
  errors: Partial<Record<Program, string>>;
  refreshKey: number;
  disabled: boolean;
}

// `programsKey` is the present programs, comma-joined in the fixed
// little_dragons-then-youth order `programsForChildren` returns. Parsed back
// into an array inside effect bodies (not memoized as an outer value) so
// each effect's own dependency stays the plain, provably-stable string.
function parseProgramsKey(programsKey: string): Program[] {
  return programsKey === '' ? [] : (programsKey.split(',') as Program[]);
}

type SlotsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; slots: AppointmentSlot[] };

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-8" role="status" aria-label={label}>
      <Loader2
        className="w-5 h-5 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

function LoadFailure({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-4">
      <p role="alert" className="text-sm text-destructive">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-[44px] px-4 rounded-lg border-2 text-sm font-semibold transition-colors hover:bg-black/5"
        style={{ borderColor: V3.border, color: V3.text }}
      >
        {retryLabel}
      </button>
    </div>
  );
}

interface ProgramGroupProps {
  program: Program;
  label: string;
  childNames: string[];
  value: VisitChoice | null;
  onPick: (program: Program, choice: VisitChoice | null) => void;
  language: 'en' | 'es';
  refreshKey: number;
  error: string | undefined;
  disabled: boolean;
  slotsState: SlotsState;
  onRetrySlots: (program: Program) => void;
  VisitPicker: VisitPickerComponent;
  onRetryPickerLoad: () => void;
  visitFor: string;
  visitNone: string;
}

function ProgramGroup({
  program,
  label,
  childNames,
  value,
  onPick,
  language,
  refreshKey,
  error,
  disabled,
  slotsState,
  onRetrySlots,
  VisitPicker,
  onRetryPickerLoad,
  visitFor,
  visitNone,
}: ProgramGroupProps) {
  const copy = visitPickerCopy[language];
  const legend =
    childNames.length === 0
      ? label
      : fillTemplate(visitFor, {
          program: label,
          children: joinNames(childNames, language),
        });
  const errorId = `visit-error-${program}`;

  // The group is plain and edge to edge on phones: the calendar inside needs
  // every pixel of the card it sits in. The tinted, bordered box comes back
  // from `sm` up, where there is room for it.
  return (
    <fieldset
      id={`visit-group-${program}`}
      tabIndex={-1}
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-3 rounded-xl py-2 sm:border sm:border-[var(--v3-border)] sm:bg-[var(--v3-surface)] sm:p-5"
    >
      <legend className="text-sm font-semibold px-1" style={{ color: V3.text }}>
        {legend}
      </legend>

      {slotsState.status === 'error' ? (
        <LoadFailure
          message={copy.loadError}
          retryLabel={copy.retry}
          onRetry={() => onRetrySlots(program)}
        />
      ) : slotsState.status === 'loading' ? (
        <LoadingSpinner label={copy.loading} />
      ) : (
        // Without this boundary a failed chunk request (a stale hash after a
        // deploy, a dropped connection) would reach the app root and replace
        // the whole page with its generic English error.
        <ErrorBoundary
          onError={reportError}
          fallback={(reset) => (
            <LoadFailure
              message={copy.loadError}
              retryLabel={copy.retry}
              onRetry={() => {
                onRetryPickerLoad();
                reset();
              }}
            />
          )}
        >
          <Suspense fallback={<LoadingSpinner label={copy.loading} />}>
            <VisitPicker
              slots={slotsState.slots}
              value={value}
              onChange={(choice) => onPick(program, choice)}
              language={language}
              horizonWeeks={PUBLIC_HORIZON_WEEKS}
              refreshKey={refreshKey}
              emptyMessage={visitNone}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {error && (
        <p id={errorId} className="text-sm" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function TrialVisitStep({
  children,
  value,
  onChange,
  errors,
  refreshKey,
  disabled,
}: TrialVisitStepProps) {
  const { t, lang } = useLanguage();
  const ct = t.contact;

  const groups = programsForChildren(children);
  const programsKey = groups.map((g) => g.program).join(',');

  const [slotsByProgram, setSlotsByProgram] = useState<
    Partial<Record<Program, AppointmentSlot[]>>
  >({});
  const [errorPrograms, setErrorPrograms] = useState<Set<Program>>(new Set());
  // Set only once a chunk load has failed and the visitor asks to try again.
  // One replacement for every group: the module is the same, so a load that
  // failed for one group failed for both.
  const [reloadedPicker, setReloadedPicker] =
    useState<VisitPickerComponent | null>(null);
  const VisitPicker = reloadedPicker ?? VisitPickerChunk;
  // Bumped by a slot retry, to run the fetch effect below again once that
  // program's recorded status has been cleared.
  const [slotRetryCount, setSlotRetryCount] = useState(0);
  // Per-program fetch status, tracked outside React state so deciding
  // whether to (re)fetch never itself triggers a render. A success is
  // permanent -- it's never refetched. An error is retried when its program
  // drops out of the present set and reappears, when `refreshKey` changes
  // (both compared against the previous effect run below), or when the
  // visitor presses "try again", which clears the status outright.
  const statusRef = useRef<
    Partial<Record<Program, 'pending' | 'success' | 'error'>>
  >({});
  const attemptRef = useRef<Partial<Record<Program, number>>>({});
  const prevPresentRef = useRef<Set<Program>>(new Set());
  const prevRefreshKeyRef = useRef(refreshKey);

  function retrySlots(program: Program) {
    delete statusRef.current[program];
    setSlotRetryCount((n) => n + 1);
  }

  function retryPickerLoad() {
    setReloadedPicker(() => lazy(importVisitPicker));
  }

  useEffect(() => {
    const present = new Set(parseProgramsKey(programsKey));
    const refreshKeyChanged = prevRefreshKeyRef.current !== refreshKey;
    prevRefreshKeyRef.current = refreshKey;

    present.forEach((program) => {
      const status = statusRef.current[program];
      const justArrived = !prevPresentRef.current.has(program);
      const shouldFetch =
        status === undefined ||
        (status === 'error' && (justArrived || refreshKeyChanged));
      if (!shouldFetch) return;

      statusRef.current[program] = 'pending';
      const attempt = (attemptRef.current[program] ?? 0) + 1;
      attemptRef.current[program] = attempt;
      setErrorPrograms((prev) => {
        if (!prev.has(program)) return prev;
        const next = new Set(prev);
        next.delete(program);
        return next;
      });

      getAppointmentSlots(program)
        .then((slots) => {
          if (attemptRef.current[program] !== attempt) return;
          statusRef.current[program] = 'success';
          setSlotsByProgram((prev) => ({ ...prev, [program]: slots }));
        })
        .catch(() => {
          if (attemptRef.current[program] !== attempt) return;
          statusRef.current[program] = 'error';
          setErrorPrograms((prev) => new Set(prev).add(program));
        });
    });

    prevPresentRef.current = present;
  }, [programsKey, refreshKey, slotRetryCount]);

  // Prune selections for programs that dropped out of the present set
  // (an age edited out of range, or a child removed). Only calls `onChange`
  // when something was actually removed, so this never loops.
  useEffect(() => {
    const present = new Set(parseProgramsKey(programsKey));
    const stale = (Object.keys(value) as Program[]).filter(
      (p) => !present.has(p),
    );
    if (stale.length === 0) return;
    const next = { ...value };
    stale.forEach((p) => delete next[p]);
    onChange(next);
  }, [programsKey, value, onChange]);

  function handlePick(program: Program, choice: VisitChoice | null) {
    const next = { ...value };
    if (choice) {
      next[program] = choice;
    } else {
      delete next[program];
    }
    onChange(next);
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2
          className="v3-h font-black mb-1"
          style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.75rem)', color: V3.text }}
        >
          {ct.visitHeading}
        </h2>
        <p className="text-base" style={{ color: V3.muted }}>
          {ct.visitSub}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm" style={{ color: V3.muted }}>
          {ct.visitNeedsAge}
        </p>
      ) : (
        groups.map(({ program, childNames }) => {
          const slots = slotsByProgram[program];
          const slotsState: SlotsState = errorPrograms.has(program)
            ? { status: 'error' }
            : slots
              ? { status: 'ready', slots }
              : { status: 'loading' };
          const label =
            program === 'little_dragons'
              ? ct.programNameLittle
              : ct.programNameYouth;

          return (
            <ProgramGroup
              key={program}
              program={program}
              label={label}
              childNames={childNames}
              value={value[program] ?? null}
              onPick={handlePick}
              language={lang}
              refreshKey={refreshKey}
              error={errors[program]}
              disabled={disabled}
              slotsState={slotsState}
              onRetrySlots={retrySlots}
              VisitPicker={VisitPicker}
              onRetryPickerLoad={retryPickerLoad}
              visitFor={ct.visitFor}
              visitNone={ct.visitNone}
            />
          );
        })
      )}
    </section>
  );
}
