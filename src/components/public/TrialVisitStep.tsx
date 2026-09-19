import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './lang';
import { V3 } from './design';
import { fillTemplate } from './fillTemplate';
import { joinNames } from '../../lib/contactLinks';
import { programsForChildren, PROGRAM_LABELS } from '../../lib/programs';
import type { Program } from '../../lib/programs';
import { getAppointmentSlots } from '../../lib/supabase/queries';
import { visitPickerCopy } from '../shared/visitPickerCopy';
import type { VisitChoice } from '../shared/VisitPicker';
import type { AppointmentSlot } from '../../lib/types';

const VisitPicker = lazy(() =>
  import('../shared/VisitPicker').then((m) => ({ default: m.VisitPicker })),
);

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

interface ProgramGroupProps {
  program: Program;
  childNames: string[];
  value: VisitChoice | null;
  onPick: (program: Program, choice: VisitChoice | null) => void;
  language: 'en' | 'es';
  refreshKey: number;
  error: string | undefined;
  disabled: boolean;
  slotsState: SlotsState;
  visitFor: string;
  visitNone: string;
}

function ProgramGroup({
  program,
  childNames,
  value,
  onPick,
  language,
  refreshKey,
  error,
  disabled,
  slotsState,
  visitFor,
  visitNone,
}: ProgramGroupProps) {
  const copy = visitPickerCopy[language];
  const label = PROGRAM_LABELS[program];
  const legend =
    childNames.length === 0
      ? label
      : fillTemplate(visitFor, {
          program: label,
          children: joinNames(childNames, language),
        });
  const errorId = `visit-error-${program}`;

  return (
    <fieldset
      id={`visit-group-${program}`}
      tabIndex={-1}
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-3 rounded-xl p-5"
      style={{ backgroundColor: V3.surface, border: `1px solid ${V3.border}` }}
    >
      <legend className="text-sm font-semibold px-1" style={{ color: V3.text }}>
        {legend}
      </legend>

      {slotsState.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive text-center py-4">
          {copy.loadError}
        </p>
      ) : slotsState.status === 'loading' ? (
        <LoadingSpinner label={copy.loading} />
      ) : (
        <Suspense fallback={<LoadingSpinner label={copy.loading} />}>
          <VisitPicker
            slots={slotsState.slots}
            value={value}
            onChange={(choice) => onPick(program, choice)}
            language={language}
            refreshKey={refreshKey}
            emptyMessage={visitNone}
          />
        </Suspense>
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
  const fetchedRef = useRef<Set<Program>>(new Set());

  useEffect(() => {
    const presentPrograms = parseProgramsKey(programsKey);
    const toFetch = presentPrograms.filter((p) => !fetchedRef.current.has(p));
    if (toFetch.length === 0) return;
    toFetch.forEach((p) => fetchedRef.current.add(p));
    toFetch.forEach((program) => {
      getAppointmentSlots(program)
        .then((slots) => {
          setSlotsByProgram((prev) => ({ ...prev, [program]: slots }));
        })
        .catch(() => {
          setErrorPrograms((prev) => new Set(prev).add(program));
        });
    });
  }, [programsKey]);

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

          return (
            <ProgramGroup
              key={program}
              program={program}
              childNames={childNames}
              value={value[program] ?? null}
              onPick={handlePick}
              language={lang}
              refreshKey={refreshKey}
              error={errors[program]}
              disabled={disabled}
              slotsState={slotsState}
              visitFor={ct.visitFor}
              visitNone={ct.visitNone}
            />
          );
        })
      )}
    </section>
  );
}
