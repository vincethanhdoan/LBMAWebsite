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

function joinNames(names: string[]): string {
  if (names.length === 0) return 'your family';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
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
}): string | null {
  const e164 = toE164(input.phone);
  if (!e164) return null;

  const firstName = input.parentName.trim().split(/\s+/)[0];
  const day = new Date(input.dateKey + 'T12:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'short', day: 'numeric' },
  );
  const at = input.time
    ? ` at ${new Date('1970-01-01T' + input.time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : '';

  const body =
    `Hi ${firstName}, this is Los Banos Martial Arts. We're looking forward to seeing ` +
    `${joinNames(input.childNames)} on ${day}${at}. Please reply to let us know ` +
    `you're still coming, or call us at ${SCHOOL_PHONE_DISPLAY} if you need a different day.`;

  return `sms:${e164}?&body=${encodeURIComponent(body)}`;
}
