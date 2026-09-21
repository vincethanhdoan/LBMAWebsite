// supabase/functions/send-email/copy.ts
// Pure formatting and copy for the receipt (and other) emails: language
// resolution, date/time formatting, and string substitution. No I/O, no
// Deno.env access, so every function here is exact-string testable. The
// school address and the child-name joiner live in ../_shared/copy.ts,
// shared with visit-calendar, and are re-exported here so the rest of this
// directory keeps importing from './copy.ts'.

import { SCHOOL_ADDRESS, joinNames } from '../_shared/copy.ts';
import type { Language } from '../_shared/copy.ts';

export type { Language };
export { SCHOOL_ADDRESS, joinNames };

// The street only, no city or state: what the preheader has room for once
// the subject line already carries the date. Derived from the full address
// so the two can never drift apart. Only the receipt preheader needs this,
// so it stays here rather than in the shared copy visit-calendar also uses.
export const SCHOOL_STREET = SCHOOL_ADDRESS.split(',')[0];

export function toLanguage(value: string | null | undefined): Language {
  return value === 'es' ? 'es' : 'en';
}

const PROGRAM_NAMES: Record<Language, Record<string, string>> = {
  en: { little_dragons: 'Little Dragons', youth: 'Youth Program' },
  es: { little_dragons: 'Pequeños Dragones', youth: 'Programa Juvenil' },
};

// Picks a program's display name in the given language. A program_type
// outside the two known programs falls back to the raw key, same as the
// callers did before this lookup existed.
export function programLabel(programType: string, language: Language): string {
  return PROGRAM_NAMES[language][programType] ?? programType;
}

export const FOOTER_COPY: Record<Language, { questions: string; or: string }> =
  {
    en: { questions: 'Questions?', or: 'or' },
    es: { questions: '¿Preguntas?', or: 'o' },
  };

// Every C0 control character (backslash-x00 through backslash-x1F) and DEL,
// plus ordinary whitespace. The regex \s token already matches every
// ECMAScript line terminator (LF, CR, and the two Unicode line/paragraph
// separator code points), not just space and tab, so nothing else is needed.
const SUBJECT_UNSAFE = /[\x00-\x1F\x7F\s]+/g;

// Makes free-text (a parent's name, etc.) safe to interpolate into an email
// subject line: a raw newline or other control character would otherwise
// reach the provider's JSON subject field verbatim. Collapses every run of
// control/whitespace characters to a single space, trims, and caps length.
// An input that is entirely control characters/whitespace collapses to
// nothing, which would read as an awkward blank subject, so callers must
// supply a fallback to use in that case.
export function sanitizeForSubject(
  text: string,
  fallback: string,
  maxLength = 120,
): string {
  const collapsed = text.replace(SUBJECT_UNSAFE, ' ').trim();
  if (collapsed.length === 0) return fallback;
  return collapsed.length > maxLength
    ? collapsed.slice(0, maxLength)
    : collapsed;
}

// Greets by first name only. A name with no whitespace (including a
// single-word name) is returned as-is.
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

const LOCALES: Record<Language, string> = { en: 'en-US', es: 'es-US' };

// Dates come in as a 'YYYY-MM-DD' key with no time component. Anchoring at
// noon UTC and formatting with timeZone: 'UTC' means the calendar day never
// shifts, regardless of the machine's local timezone.
export function formatVisitDate(dateKey: string, language: Language): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return d.toLocaleDateString(LOCALES[language], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatVisitDateShort(
  dateKey: string,
  language: Language,
): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return d.toLocaleDateString(LOCALES[language], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Times come in as a bare 'HH:MM:SS'. Anchoring on the epoch date with
// timeZone: 'UTC' formats the clock time as written, with no timezone shift.
export function formatVisitTime(time: string, language: Language): string {
  const d = new Date(`1970-01-01T${time}Z`);
  return d.toLocaleTimeString(LOCALES[language], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

// Spanish agrees the article with the hour: "a la 1:20 p.m." but "a las 5:35
// p.m.". Copy that introduces a clock time carries an {at} placeholder so the
// article is chosen from the formatted time instead of being written into the
// string, where it would be wrong for every 1 o'clock slot.
export function timeArticle(time: string, language: Language): string {
  if (language !== 'es') return 'at';
  return time.startsWith('1:') ? 'a la' : 'a las';
}

export interface ReceiptCopy {
  subject: string;
  subjectMany: string;
  // The hidden line a mail client shows as the inbox snippet, so the row in
  // the inbox reads as a standing reminder of when and where to be.
  preheader: string;
  heading: string;
  headingMany: string;
  intro: string;
  arrive: string;
  change: string;
  whereHeading: string;
  openMaps: string;
  expectHeading: string;
  expectBody: string;
  closing: string;
  familyFallback: string;
}

export const RECEIPT_COPY: Record<Language, ReceiptCopy> = {
  en: {
    subject: 'Trial visit booked: {dateShort} at {time}',
    subjectMany: 'Trial visits booked, starting {dateShort}',
    preheader: 'Arrive {at} {time} · {street}',
    heading: "You're booked",
    headingMany: 'Your visits are booked',
    intro:
      "Hi {name}, we're looking forward to meeting {children}. Here are the details of your visit.",
    arrive: 'Please arrive {at} {time}.',
    change: 'Change or cancel this visit',
    whereHeading: 'Where to find us',
    openMaps: 'Open in Google Maps',
    expectHeading: 'What to expect',
    expectBody:
      "Comfortable athletic clothes are all your child needs. We provide everything else for the first class. You're welcome to watch from the side, and we'll answer any questions afterward.",
    closing: 'If anything changes, reply to this email or call us.',
    familyFallback: 'your family',
  },
  es: {
    subject: 'Visita reservada: {dateShort}, {time}',
    subjectMany: 'Visitas reservadas, desde el {dateShort}',
    preheader: 'Llega {at} {time} · {street}',
    heading: 'Tu visita está reservada',
    headingMany: 'Tus visitas están reservadas',
    intro:
      'Hola {name}, tenemos muchas ganas de conocer a {children}. Aquí están los detalles de tu visita.',
    arrive: 'Por favor, llega {at} {time}.',
    change: 'Cambiar o cancelar esta visita',
    whereHeading: 'Dónde encontrarnos',
    openMaps: 'Abrir en Google Maps',
    expectHeading: 'Qué esperar',
    expectBody:
      'Solo hace falta ropa deportiva cómoda. Nosotros proporcionamos todo lo demás para la primera clase. Puedes observar desde un lado y, al terminar, respondemos con gusto cualquier pregunta que tengas.',
    closing: 'Si algo cambia, responde a este correo o llámanos.',
    familyFallback: 'tu familia',
  },
};

// Replaces {key} placeholders from vars; a placeholder with no matching key
// is left as-is rather than silently dropped.
export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}
