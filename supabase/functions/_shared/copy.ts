// supabase/functions/_shared/copy.ts
// Parent-facing copy shared between send-email and visit-calendar: the
// school's street address and the child-name joiner. Both functions need the
// exact same text, so it lives here once rather than drifting between two
// copies.

export type Language = 'en' | 'es';

export const SCHOOL_ADDRESS = '1209 South 6th St Suite E, Los Banos, CA';

// Joins a list of names into a natural-language list: "Mia", "Emma and
// Lily", "Emma, Lily, and Jake" ("y" instead of "and" in Spanish).
export function joinNames(names: string[], language: Language): string {
  const filtered = names.filter(Boolean);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];
  const and = language === 'es' ? 'y' : 'and';
  if (filtered.length === 2) return `${filtered[0]} ${and} ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(', ')}, ${and} ${filtered[filtered.length - 1]}`;
}
