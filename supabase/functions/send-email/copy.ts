// supabase/functions/send-email/copy.ts
// Pure formatting and copy for the receipt (and other) emails: language
// resolution, date/time formatting, string substitution, and the two
// calendar-link builders. No I/O, no Deno.env access, so every function
// here is exact-string testable.

export type Language = 'en' | 'es';

export function toLanguage(value: string | null | undefined): Language {
  return value === 'es' ? 'es' : 'en';
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

export interface ReceiptCopy {
  subject: string;
  subjectMany: string;
  heading: string;
  headingMany: string;
  intro: string;
  arrive: string;
  addGoogle: string;
  addIcs: string;
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
    subjectMany: 'Your trial visits are booked',
    heading: "You're booked",
    headingMany: 'Your visits are booked',
    intro:
      "Hi {name}, we're looking forward to meeting {children}. Here are the details of your visit.",
    arrive: 'Please arrive at {time}.',
    addGoogle: 'Add to Google Calendar',
    addIcs: 'Add to Apple or Outlook calendar',
    change: 'Change or cancel this visit',
    whereHeading: 'Where to find us',
    openMaps: 'Open in Maps',
    expectHeading: 'What to expect',
    expectBody:
      "Comfortable athletic clothes are all your child needs. We provide everything else for the first class. You're welcome to watch from the side, and we'll answer any questions afterward.",
    closing: 'If anything changes, reply to this email or call us at {phone}.',
    familyFallback: 'your family',
  },
  es: {
    subject: 'Visita de prueba reservada: {dateShort}, {time}',
    subjectMany: 'Tus visitas de prueba están reservadas',
    heading: 'Tu visita está reservada',
    headingMany: 'Tus visitas están reservadas',
    intro:
      'Hola {name}, tenemos muchas ganas de conocer a {children}. Aquí están los detalles de tu visita.',
    arrive: 'Por favor llega a las {time}.',
    addGoogle: 'Agregar a Google Calendar',
    addIcs: 'Agregar al calendario de Apple u Outlook',
    change: 'Cambiar o cancelar esta visita',
    whereHeading: 'Dónde encontrarnos',
    openMaps: 'Abrir en Mapas',
    expectHeading: 'Qué esperar',
    expectBody:
      'Tu hijo solo necesita ropa deportiva cómoda. Nosotros proporcionamos todo lo demás para la primera clase. Puedes observar desde un lado, y después responderemos cualquier pregunta que tengas.',
    closing: 'Si algo cambia, responde a este correo o llámanos al {phone}.',
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Formats a 'YYYY-MM-DD' + 'HH:MM:SS' wall-clock pair as 'YYYYMMDDTHHMMSS'.
// Uses Date.UTC purely as an arithmetic scratchpad (never converts to an
// actual timezone), so adding minutes/hours rolls the date over correctly
// near midnight instead of being computed by string-splicing.
function formatWallClock(
  dateKey: string,
  time: string,
  addMinutes: number,
): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const instant = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) + addMinutes * 60_000,
  );
  return (
    `${instant.getUTCFullYear()}${pad2(instant.getUTCMonth() + 1)}${pad2(instant.getUTCDate())}` +
    `T${pad2(instant.getUTCHours())}${pad2(instant.getUTCMinutes())}${pad2(instant.getUTCSeconds())}`
  );
}

export interface GoogleCalendarLinkInput {
  dateKey: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM:SS'
  title: string;
  address: string;
  details: string;
}

// One hour long, in local wall-clock time, interpreted by Google via ctz
// rather than converted to UTC ourselves.
export function buildGoogleCalendarUrl(input: GoogleCalendarLinkInput): string {
  const start = formatWallClock(input.dateKey, input.time, 0);
  const end = formatWallClock(input.dateKey, input.time, 60);
  const qs = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${start}/${end}`,
    ctz: 'America/Los_Angeles',
    location: input.address,
    details: input.details,
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

export function buildIcsUrl(supabaseUrl: string, bookingToken: string): string {
  return `${supabaseUrl}/functions/v1/visit-calendar?token=${bookingToken}`;
}
