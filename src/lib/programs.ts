// Canonical program display labels, shared by the public booking pages and the
// admin portal.
export const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
};

type Program = 'little_dragons' | 'youth';

// Which program a child of this age belongs to, or null if they're outside
// the ages we enroll (4-17).
export function programForAge(age: number): Program | null {
  if (age >= 4 && age <= 7) return 'little_dragons';
  if (age >= 8 && age <= 17) return 'youth';
  return null;
}

// The exact age format the server accepts (a 1 or 2 digit whole number, no
// sign, no decimal point, no exponent). Kept in one place so the client
// never shows a program grouping the server would then reject at submit.
const AGE_PATTERN = /^\d{1,2}$/;

function parseAge(ageText: string): number | null {
  const trimmed = ageText.trim();
  if (!AGE_PATTERN.test(trimmed)) return null;
  return Number(trimmed);
}

// Same as programForAge, but takes the raw string a form field holds and
// applies the server's age format before converting to a number.
export function programForAgeText(ageText: string): Program | null {
  const age = parseAge(ageText);
  if (age === null) return null;
  return programForAge(age);
}

// Groups a form's child rows by program, in a fixed little_dragons-then-youth
// order. Rows with a blank, non-integer, or out-of-range age are ignored. A
// row with a valid age but no name still makes its program appear, with no
// name listed.
export function programsForChildren(
  children: Array<{ name: string; age: string }>,
): Array<{ program: Program; childNames: string[] }> {
  const childNamesByProgram: Record<Program, string[]> = {
    little_dragons: [],
    youth: [],
  };
  const presentPrograms = new Set<Program>();

  for (const child of children) {
    const program = programForAgeText(child.age);
    if (!program) continue;

    presentPrograms.add(program);
    const name = child.name.trim();
    if (name) childNamesByProgram[program].push(name);
  }

  const order: Program[] = ['little_dragons', 'youth'];
  return order
    .filter((program) => presentPrograms.has(program))
    .map((program) => ({
      program,
      childNames: childNamesByProgram[program],
    }));
}
