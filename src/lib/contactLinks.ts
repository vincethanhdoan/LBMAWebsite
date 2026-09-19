import { isValidUsPhone } from './validation';

export const SCHOOL_PHONE_DISPLAY = '(408) 620-0252';

function toE164(phone: string): string | null {
  if (!isValidUsPhone(phone)) return null;
  const digits = phone.replace(/\D/g, '');
  return '+1' + digits.slice(-10);
}

export function telHref(phone: string): string | null {
  const e164 = toE164(phone);
  return e164 ? `tel:${e164}` : null;
}

export function joinNames(names: string[], language: 'en' | 'es'): string {
  if (names.length === 0)
    return language === 'es' ? 'tu familia' : 'your family';
  if (names.length === 1) return names[0];
  const and = language === 'es' ? 'y' : 'and';
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

// es-US already renders "a.m."/"p.m." with a trailing period, so composing a
// formatted time into a sentence that ends (or continues) with its own
// period doubles it up. Collapses any ".." left over from that composition
// into a single ".", wherever it lands in the string.
export function collapseDoublePeriod(text: string): string {
  return text.replace(/\.\./g, '.');
}

// Opens the staff member's own messaging app with a reminder ready to send.
// Nothing is sent or recorded by the portal. The "?&body=" form is the one
// both iOS and Android accept.
export function reminderSmsHref(input: {
  phone: string;
  parentName: string;
  childNames: string[];
  dateKey: string;
  time: string | null;
  language: 'en' | 'es';
}): string | null {
  const e164 = toE164(input.phone);
  if (!e164) return null;

  const firstName = input.parentName.trim().split(/\s+/)[0];
  const locale = input.language === 'es' ? 'es-US' : 'en-US';
  const day = new Date(input.dateKey + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const time = input.time
    ? new Date('1970-01-01T' + input.time).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  const children = joinNames(input.childNames, input.language);

  let body: string;
  if (input.language === 'es') {
    const visit = `el ${day}${time ? `, a las ${time}` : ''}.`;
    body = collapseDoublePeriod(
      `Hola ${firstName}, te escribimos de Los Banos Martial Arts. Tenemos muchas ganas de ver a ` +
        `${children} ${visit} Por favor responde para confirmar que vienen, ` +
        `o llámanos al ${SCHOOL_PHONE_DISPLAY} si necesitan otro día.`,
    );
  } else {
    const at = time ? ` at ${time}` : '';
    body =
      `Hi ${firstName}, this is Los Banos Martial Arts. We're looking forward to seeing ` +
      `${children} on ${day}${at}. Please reply to let us know ` +
      `you're still coming, or call us at ${SCHOOL_PHONE_DISPLAY} if you need a different day.`;
  }

  return `sms:${e164}?&body=${encodeURIComponent(body)}`;
}
