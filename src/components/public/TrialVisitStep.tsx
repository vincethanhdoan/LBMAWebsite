import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { reportError } from '../../lib/monitoring/sentry';
import { useLanguage } from './lang';
import { V3 } from './design';
import {
  FIELD_ERROR_COLOR,
  FIELD_HELP_CLASS,
  FIELD_LABEL_CLASS,
  SECTION_HEADING_CLASS,
  SECTION_HEADING_STYLE,
} from './formStyles';
import { fillTemplate } from './fillTemplate';
import { joinNames } from '../../lib/contactLinks';
import { programsForChildren } from '../../lib/programs';
import type { Program } from '../../lib/programs';
import { getAppointmentSlots } from '../../lib/supabase/bookingQueries';
import { visitPickerCopy } from '../shared/visitPickerCopy';
import { VisitLoadFailure } from '../shared/VisitLoadFailure';
import type { VisitChoice, VisitPickerProps } from '../shared/VisitPicker';
import type { AppointmentSlot } from '../../lib/types';

type VisitPickerComponent = ComponentType<VisitPickerProps>;

// Module scope, so a chunk that has already arrived is shared by every mount
// and never suspends twice. A failed dynamic import is cached in the module
// map forever, so there is no way to retry this from here; the ErrorBoundary
// fallback below tells the visitor to call instead.
const VisitPickerChunk: VisitPickerComponent = lazy(() =>
  import('../shared/VisitPicker').then((m) => ({ default: m.VisitPicker })),
);

// The 21 days `submit_trial_booking` accepts from the public form. Asking for
// more would show a signed-in staff member days their own submit would
// refuse, since the server clamps this horizon for every non-admin caller
// (anonymous and signed-in family alike) -- only admins are unclamped.
const PUBLIC_HORIZON_WEEKS = 3;

// How long a child's age has to stay on one program before the section
// appears. The age field is a number input, so a parent typing 42 passes
// through 4 on the way: revealing on the keystroke would flash a Little
// Dragons calendar, fetch its slots, and then take it away again.
const REVEAL_IDLE_MS = 400;

export type VisitSelections = Partial<Record<Program, VisitChoice>>;

type ChildRow = { name: string; age: string };

interface TrialVisitStepProps {
  children: ChildRow[];
  value: VisitSelections;
  onChange: (next: VisitSelections) => void;
  errors: Partial<Record<Program, string>>;
  refreshKey: number;
  disabled: boolean;
  /**
   * Whether the visit section is on screen. The parent owns it, because it
   * shows its own line under the child rows until the section arrives; this
   * component owns when it happens and says so through `onReveal`.
   */
  revealed: boolean;
  /** Called once, when the first child's age has settled on a program. */
  onReveal: () => void;
  /**
   * Whether the parent has finished with the age field they last touched
   * (it lost focus and has not been typed in since). A settled age reveals
   * the section straight away instead of waiting out the idle delay.
   */
  agesSettled: boolean;
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
      className="flex flex-col gap-3 py-2 sm:rounded-xl sm:border sm:border-[var(--v3-border)] sm:bg-[var(--v3-surface)] sm:p-5"
    >
      <legend className={FIELD_LABEL_CLASS} style={{ color: V3.text }}>
        {legend}
      </legend>

      {slotsState.status === 'error' ? (
        <VisitLoadFailure
          message={copy.loadError}
          retryLabel={copy.retry}
          onRetry={() => onRetrySlots(program)}
        />
      ) : slotsState.status === 'loading' ? (
        <LoadingSpinner label={copy.loading} />
      ) : (
        // Without this boundary a failed chunk request (a stale hash after a
        // deploy, a dropped connection) would reach the app root and replace
        // the whole page with its generic English error. There is no retry:
        // a failed dynamic import is cached by the browser and never
        // refetches, so the fallback sends the visitor to call instead.
        <ErrorBoundary
          onError={reportError}
          fallback={() => <VisitLoadFailure message={copy.chunkLoadError} />}
        >
          <Suspense fallback={<LoadingSpinner label={copy.loading} />}>
            <VisitPickerChunk
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
        <p
          id={errorId}
          className={FIELD_HELP_CLASS}
          style={{ color: FIELD_ERROR_COLOR }}
        >
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
  revealed,
  onReveal,
  agesSettled,
}: TrialVisitStepProps) {
  const { t, lang } = useLanguage();
  const ct = t.contact;

  const groups = programsForChildren(children);
  const programsKey = groups.map((g) => g.program).join(',');

  const [slotsByProgram, setSlotsByProgram] = useState<
    Partial<Record<Program, AppointmentSlot[]>>
  >({});
  const [errorPrograms, setErrorPrograms] = useState<Set<Program>>(new Set());
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

  // Reveal once a program has held still, and never take the section away
  // again: a parent editing an age should not have a calendar they may
  // already be reading pulled out from under them.
  useEffect(() => {
    if (revealed || programsKey === '') return;
    const timer = setTimeout(onReveal, agesSettled ? 0 : REVEAL_IDLE_MS);
    return () => clearTimeout(timer);
  }, [revealed, programsKey, agesSettled, onReveal]);

  useEffect(() => {
    if (!revealed) return;
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
  }, [revealed, programsKey, refreshKey, slotRetryCount]);

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

  if (!revealed) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className={SECTION_HEADING_CLASS} style={SECTION_HEADING_STYLE}>
          {ct.visitHeading}
        </h2>
        <p className={FIELD_HELP_CLASS} style={{ color: V3.muted }}>
          {ct.visitSub}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className={FIELD_HELP_CLASS} style={{ color: V3.muted }}>
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
              visitFor={ct.visitFor}
              visitNone={ct.visitNone}
            />
          );
        })
      )}
    </section>
  );
}
