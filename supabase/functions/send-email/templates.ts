// supabase/functions/send-email/templates.ts

import type { EnrollmentLead, AppointmentInfo } from './types.ts';
import {
  RECEIPT_COPY,
  SCHOOL_ADDRESS,
  SCHOOL_STREET,
  joinNames,
  fillTemplate,
  firstName,
  formatVisitDateNoYear,
  programLabel,
  timeArticle,
} from './copy.ts';
import type { Language, ReceiptCopy } from './copy.ts';

function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// English program names, used by the admin alert (always English) and the
// invite/approval emails (not language-parameterized). The localized copy
// lives in copy.ts; this is that copy's English half.
export const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: programLabel('little_dragons', 'en'),
  youth: programLabel('youth', 'en'),
};

const PHONE_DISPLAY = '(408) 620-0252';
const PHONE_HREF = 'tel:+14086200252';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${SCHOOL_ADDRESS.replace(/ /g, '+')}`;

const STRIPE = `<div style="height:4px;background:#A01F23;"></div>`;

// Dark mode is a decision, not an accident: the color-scheme meta tags below
// stop a client inventing its own inversion, and these rules give it a
// palette instead. Every element carrying one of the light colours also
// carries the matching class, so nothing is left mid-inversion. Inline styles
// win over a stylesheet, hence !important.
const DARK_MODE_CSS = `
      @media (prefers-color-scheme: dark) {
        .lb-page { background:#121212 !important; }
        .lb-card { background:#1e1e1e !important; border-color:#3a3a3a !important; color:#e8e4e0 !important; }
        .lb-header { border-bottom-color:#3a3a3a !important; }
        .lb-panel { background:#262626 !important; border-color:#3a3a3a !important; }
        .lb-heading { color:#ffffff !important; }
        .lb-text { color:#e8e4e0 !important; }
        .lb-muted { color:#c9c4bf !important; }
        .lb-accent { color:#E4797D !important; }
      }`;

// The receipt's own dark rules, emitted only for a full-bleed shell. The
// ticket is printed ink, not a surface: it holds its red and its two text
// colours so a client's auto-inversion cannot repaint the one element the
// whole message is built around. The two hairlines have to follow the
// surfaces they sit on, which the shared palette has no class for.
const RECEIPT_DARK_MODE_CSS = `
      @media (prefers-color-scheme: dark) {
        .lb-ticket { background:#A01F23 !important; }
        .lb-ticket-date, .lb-ticket-link { color:#FFFDFC !important; }
        .lb-ticket-sub { color:#F6D9D6 !important; }
        .lb-ticket-rule { border-top-color:#BB5D60 !important; }
        .lb-ticket-gap { border-top-color:#1e1e1e !important; }
        .lb-rule { border-top-color:#3a3a3a !important; }
      }`;

// The website's own typefaces. Gmail strips the stylesheet link below, so
// the fallback is what most families actually read: Roboto on Android,
// Helvetica on iOS, Arial on a desktop. Arial Narrow is deliberately not in
// this stack. It exists on desktops, where the card is wide enough that
// plain Arial already fits, and on no phone, where the width is wanted, so
// all it would buy is a desktop that looks unlike every phone.
const DISPLAY_FONT = `'Barlow Condensed',Arial,Helvetica,sans-serif`;
const BODY_FONT = `Nunito,Arial,Helvetica,sans-serif`;

const RECEIPT_HEAD = `<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&amp;family=Nunito:wght@400;700&amp;display=swap" rel="stylesheet" />
<!--[if mso]>
<style>
  /* Word resolves an unknown first family to Times New Roman instead of
     reading on down the stack, so Outlook desktop is told outright. */
  body, table, td, div, p, a { font-family:Arial,Helvetica,sans-serif !important; }
</style>
<![endif]-->
`;

function makeHeader(logoUrl?: string, subtitle?: string): string {
  const subtitleHtml = subtitle
    ? `<div class="lb-muted" style="font-size:14px;color:#595959;margin-top:2px;">${subtitle}</div>`
    : '';
  const nameBlock = `<div class="lb-heading" style="font-size:17px;font-weight:700;color:#1a1a1a;line-height:1.2;">Los Banos Martial Arts Academy</div>${subtitleHtml}`;
  if (logoUrl) {
    // The logo is decorative: the wordmark beside it says the same thing, and
    // an alt text here would be the first words of the inbox snippet. The
    // white backing keeps a transparent logo visible if a client inverts.
    return `
  <div class="lb-header" style="padding:16px 28px;border-bottom:1px solid #e2dbd5;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:48px;padding:0;vertical-align:middle;">
          <img src="${logoUrl}" alt="" width="48" height="48" style="width:48px;height:48px;border-radius:4px;display:block;background:#ffffff;" />
        </td>
        <td style="padding:0 0 0 14px;vertical-align:middle;">${nameBlock}</td>
      </tr>
    </table>
  </div>`;
  }
  return `
  <div class="lb-header" style="padding:16px 28px;border-bottom:1px solid #e2dbd5;">${nameBlock}</div>`;
}

// The shared footer, English only: every email that uses it is English. The
// receipt is bilingual and writes its own (see receiptFooter).
function footer(): string {
  return `
  <p class="lb-muted" style="margin:0;font-size:14px;color:#595959;line-height:1.6;text-align:center;">
    Questions? <a href="mailto:LosBanosMartialArts@gmail.com" class="lb-accent" style="color:#A01F23;text-decoration:underline;">LosBanosMartialArts@gmail.com</a>
    or <a href="${PHONE_HREF}" class="lb-accent" style="color:#A01F23;text-decoration:underline;">${PHONE_DISPLAY}</a><br />${SCHOOL_ADDRESS}
  </p>
`;
}

interface Shell {
  // The document <title>: this message's own headline.
  title: string;
  logoUrl?: string;
  subtitle?: string;
  language?: Language;
  // Hidden first line of the body, which is what a mail client shows as the
  // inbox snippet. Only the receipt has one.
  preheader?: string;
  // The message lays its own sections edge to edge inside the card: it
  // supplies its own horizontal padding and its own footer, so the shell
  // adds neither and a band can run the full width of the card without the
  // negative margins Gmail refuses to apply. Such a message also brings its
  // own <head> additions (display web fonts, and dark rules for the colours
  // only it uses), which leaves every other email's markup byte for byte
  // where it was. Only the booking receipt sets this.
  bleed?: boolean;
}

// The hidden inbox snippet. It has to be the first node in the body, ahead of
// the logo and the wordmark, or the client builds the snippet out of those
// instead. The trailing run of zero-width characters fills the rest of the
// snippet so the body copy does not trail the preheader into it.
function preheaderBlock(text: string): string {
  const filler = '&#847;&zwnj;&nbsp;'.repeat(40);
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f2ef;opacity:0;">${escHtml(text)}${filler}</div>`;
}

function wrap(inner: string, shell: Shell): string {
  const {
    title,
    logoUrl,
    subtitle,
    language = 'en',
    preheader,
    bleed = false,
  } = shell;
  const body = bleed
    ? inner
    : `<div style="padding:24px 28px;">
          ${inner}
          ${footer()}
        </div>`;
  return `<!DOCTYPE html>
<html lang="${language}" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escHtml(title)}</title>
${bleed ? RECEIPT_HEAD : ''}<style>${DARK_MODE_CSS}${bleed ? RECEIPT_DARK_MODE_CSS : ''}
</style>
</head>
<body class="lb-page" style="margin:0;padding:0;background:#f5f2ef;">
${preheader ? preheaderBlock(preheader) : ''}
<table role="presentation" class="lb-page" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#f5f2ef;">
  <tr>
    <td align="center" style="padding:0;">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" align="center"><tr><td><![endif]-->
      <div class="lb-card" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3d3d3d;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e2dbd5;border-radius:6px;overflow:hidden;text-align:left;">
        ${STRIPE}
        ${makeHeader(logoUrl, subtitle)}
        ${body}
      </div>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-bottom:20px;">
    <a href="${href}" style="display:inline-block;background:#A01F23;color:#fff;font-weight:700;padding:13px 36px;border-radius:4px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">${label}</a>
  </div>`;
}

export interface AdminVisitInfo {
  programLabel: string;
  childNames: string;
  date: string;
  time: string;
}

export function enrollmentNotificationHtml(
  lead: EnrollmentLead,
  adminUrl: string,
  logoUrl?: string,
  subtitle = 'Admin Portal',
  visits?: AdminVisitInfo[],
): string {
  const hasVisits = (visits?.length ?? 0) > 0;

  const rows = [
    `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Parent</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.parent_name)}</td></tr>`,
    lead.parent_email
      ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;">Email</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.parent_email)}</td></tr>`
      : '',
    lead.phone
      ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;">Phone</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.phone)}</td></tr>`
      : '',
    lead.children && lead.children.length > 0
      ? lead.children
          .map(
            (c) =>
              `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;">Child</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(c.name)}, age ${c.age} (${PROGRAM_LABELS[c.program_type] ?? c.program_type})</td></tr>`,
          )
          .join('')
      : lead.student_name
        ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;">Student</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.student_name)}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>`
        : '',
    lead.message
      ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;">Message</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.message)}</td></tr>`
      : '',
    hasVisits
      ? visits!
          .map(
            (v) =>
              `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;">Visit</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(v.programLabel)}${v.childNames ? ` · ${escHtml(v.childNames)}` : ''} · ${escHtml(v.date)}, ${escHtml(v.time)}</td></tr>`,
          )
          .join('')
      : '',
    lead.preferred_language === 'es'
      ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;">Language</td><td class="lb-text" style="padding:4px 0;color:#555;">Spanish</td></tr>`
      : '',
  ].join('');

  const heading = hasVisits ? 'New trial booking' : 'New enrollment inquiry';
  const intro = hasVisits
    ? 'A family booked a trial visit through the website.'
    : 'A family submitted an enrollment inquiry through the website.';

  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${heading}</p>
    <p class="lb-text" style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">${intro}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
    ${ctaButton(adminUrl, 'View in Admin Dashboard')}
  `,
    { title: heading, logoUrl, subtitle },
  );
}

export function messagingNotificationHtml(
  senderName: string,
  portalUrl: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">You have a new message</p>
    <p class="lb-text" style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${escHtml(senderName)}</strong> sent you a message in the LBMAA portal.
    </p>
    ${ctaButton(portalUrl, 'Read Message')}
    <p class="lb-muted" style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">Reply directly in the portal. Please do not reply to this email.</p>
  `,
    { title: 'You have a new message', logoUrl, subtitle },
  );
}

export function multiProgramApprovalEmailHtml(
  parentName: string,
  programs: Array<{
    programLabel: string;
    childNames: string;
    bookingUrl: string;
  }>,
  logoUrl?: string,
  subtitle?: string,
): string {
  const sections = programs
    .map(
      (p) => `
    <div style="margin-bottom:20px;">
      <p class="lb-heading" style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a1a2e;">${escHtml(p.programLabel)}${p.childNames ? ` for ${escHtml(p.childNames)}` : ''}</p>
      ${ctaButton(p.bookingUrl, `Book ${escHtml(p.programLabel)} Intro`)}
    </div>
  `,
    )
    .join('');

  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">We'd love to have you in for a visit. Pick a day and time that works for your family.</p>
    <p class="lb-text" style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(parentName)}! We'd love to welcome your family to Los Banos Martial Arts Academy.
      Use the buttons below to choose an appointment date for each program.
    </p>
    ${sections}
    <p class="lb-muted" style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">
      Each booking link is unique to your inquiry. Do not share them.
    </p>
  `,
    { title: 'Pick a time for your visit', logoUrl, subtitle },
  );
}

export function rescheduleEmailHtml(
  parentName: string,
  programs: Array<{
    programLabel: string;
    childNames: string;
    bookingUrl: string;
  }>,
  logoUrl?: string,
  subtitle?: string,
): string {
  const sections =
    programs.length === 1
      ? ctaButton(programs[0].bookingUrl, 'Pick a New Time')
      : programs
          .map(
            (p) => `
    <div style="margin-bottom:20px;">
      <p class="lb-heading" style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a1a2e;">${escHtml(p.programLabel)}${p.childNames ? ` for ${escHtml(p.childNames)}` : ''}</p>
      ${ctaButton(p.bookingUrl, `Rebook ${escHtml(p.programLabel)} Intro`)}
    </div>
  `,
          )
          .join('');

  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">We're sorry we missed you!</p>
    <p class="lb-text" style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(parentName)}, we're sorry we missed you at your scheduled visit.
      We'd still love to welcome your family to Los Banos Martial Arts Academy.
      Use the ${programs.length > 1 ? 'buttons' : 'button'} below to pick a new time that works for you.
    </p>
    ${sections}
    <p class="lb-muted" style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">
      ${programs.length > 1 ? 'Each booking link is unique to your inquiry. Do not share them.' : 'This booking link is unique to your inquiry. Do not share it.'}
    </p>
  `,
    { title: "Let's reschedule your visit", logoUrl, subtitle },
  );
}

export function approvalEmailHtml(
  lead: EnrollmentLead,
  bookingUrl: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">We'd love to have you in for a visit. Pick a day and time that works for your family.</p>
    <p class="lb-text" style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(lead.parent_name)}! We'd love to welcome your family to Los Banos Martial Arts Academy.
      Use the button below to choose an appointment date that works for you.
    </p>
    ${ctaButton(bookingUrl, 'Book Your Appointment')}
    <p class="lb-muted" style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">
      This booking link is unique to your inquiry. Do not share it.
    </p>
  `,
    { title: 'Pick a time for your visit', logoUrl, subtitle },
  );
}

export function denialEmailHtml(
  lead: EnrollmentLead,
  logoUrl?: string,
  subtitle?: string,
): string {
  const message =
    lead.denial_message ??
    'Thank you for your interest in LBMAA. Unfortunately, we are unable to accommodate your enrollment request at this time.';
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment inquiry</p>
    <p class="lb-text" style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">Hi ${escHtml(lead.parent_name)},</p>
    <p class="lb-text" style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">${escHtml(message)}</p>
  `,
    { title: 'Your enrollment inquiry', logoUrl, subtitle },
  );
}

// The Spanish time format ("5:20 p.m.") already ends in a period, so the
// "arrive" sentence template would otherwise end in "..". Collapse that back
// to a single period rather than hand-editing the copy string.
function receiptArrive(
  c: ReceiptCopy,
  time: string,
  language: Language,
): string {
  return fillTemplate(c.arrive, {
    at: timeArticle(time, language),
    time,
  }).replace(/\.\.$/, '.');
}

// The reminder's visit panel: a quiet card carrying the program, the
// children and the date, with the caller supplying whatever belongs under
// the date and keeping its own href-building and escaping. The receipt used
// to share this and now prints its visits as full-bleed tickets instead.
function visitCard(a: AppointmentInfo, inner: string): string {
  return `
    <div class="lb-panel" style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 18px;margin:0 0 12px;">
      <div class="lb-accent" style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#A01F23;margin-bottom:6px;">
        ${escHtml(a.programLabel)}${a.childNames ? ` · ${escHtml(a.childNames)}` : ''}
      </div>
      <div class="lb-heading" style="font-size:18px;font-weight:700;color:#1a1a2e;line-height:1.3;">${escHtml(a.date)}</div>
      ${inner}
    </div>
  `;
}

// The intro line names every child once, across all booked visits, even
// when they're spread across different programs (and therefore different
// AppointmentInfo entries).
function receiptChildren(
  appointments: AppointmentInfo[],
  language: Language,
): string {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const a of appointments) {
    if (a.childNames && !seen.has(a.childNames)) {
      seen.add(a.childNames);
      groups.push(a.childNames);
    }
  }
  return joinNames(groups, language) || RECEIPT_COPY[language].familyFallback;
}

// The ticket's headline date, with the day and month bound together. In
// Helvetica or Arial the longest dates ("Wednesday, September 30",
// "Miércoles, 30 de septiembre") cannot fit one line at phone width at any
// size worth calling a headline, so the question is only where they break.
// Binding everything after the weekday means the break always lands at the
// comma, giving a deliberate two-line date instead of a stranded "30".
function ticketDate(a: AppointmentInfo, language: Language): string {
  const date = escHtml(formatVisitDateNoYear(a.appointmentDate, language));
  const afterWeekday = date.indexOf(', ') + 2;
  if (afterWeekday === 1) return date;
  return (
    date.slice(0, afterWeekday) +
    date.slice(afterWeekday).replace(/ /g, '&nbsp;')
  );
}

// One visit, printed as a full-bleed red band: the eyebrow says who it is
// for, the date is the headline, the arrival line is deliberately quieter,
// and the change link sits under a hairline so it reads as an action rather
// than another detail. A second and later ticket gets a 2px card-coloured
// rule on top so the stack reads as separate tickets; a border does that in
// every client, where a spacer element would need a font-size smaller than
// the receipt's floor.
function visitTicket(
  a: AppointmentInfo,
  c: ReceiptCopy,
  language: Language,
  stacked: boolean,
): string {
  // A visit with no booking token has no working reschedule link; omit it,
  // and the rule that introduces it, rather than pointing a labeled link at
  // a fallback URL. The hairline is the band's 28%-white tint flattened to
  // an opaque hex, because Outlook drops an rgba border colour outright.
  const change = a.bookingToken
    ? `
              <div class="lb-ticket-rule" style="margin-top:14px;border-top:1px solid #BB5D60;"></div>
              <a href="${escHtml(a.rebookingUrl)}" class="lb-ticket-link" style="display:inline-block;margin-top:2px;padding:12px 0 0;font-family:${BODY_FONT};font-size:15px;color:#FFFDFC;text-decoration:underline;">${escHtml(c.change)}</a>`
    : '';
  const gap = stacked ? 'border-top:2px solid #ffffff;' : '';
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
          <tr>
            <td bgcolor="#A01F23" class="lb-ticket${stacked ? ' lb-ticket-gap' : ''}" style="${gap}padding:24px 28px;background:#A01F23;">
              <div class="lb-ticket-sub" style="font-family:${BODY_FONT};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#F6D9D6;">${escHtml(a.programLabel)}${a.childNames ? ` · ${escHtml(a.childNames)}` : ''}</div>
              <div class="lb-ticket-date" style="margin-top:8px;font-family:${DISPLAY_FONT};font-size:24px;font-weight:800;color:#FFFDFC;line-height:1.15;">${ticketDate(a, language)}</div>
              <div class="lb-ticket-sub" style="margin-top:6px;font-family:${BODY_FONT};font-size:17px;font-weight:400;color:#F6D9D6;line-height:1.4;">${escHtml(receiptArrive(c, a.time, language))}</div>${change}
            </td>
          </tr>
        </table>`;
}

// A section label in the receipt's lower half. Small, set in capitals and
// quiet, so it marks a section without competing with the copy under it the
// way a bold body-size heading did.
function receiptLabel(text: string): string {
  return `<p class="lb-muted" style="margin:0 0 6px;font-family:${BODY_FONT};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#6B5F5C;">${escHtml(text)}</p>`;
}

// The receipt's own sign-off. The shared footer is centred under left-
// aligned copy and repeats the address and phone the body has just given;
// this one only says who wrote. No email address and no second number:
// replying reaches the school, and the number is directly above.
function receiptFooter(): string {
  return `
        <div class="lb-rule" style="margin:0 28px;border-top:1px solid #E8E0DA;padding:20px 0 28px;">
          <p class="lb-muted" style="margin:0;font-family:${BODY_FONT};font-size:14px;color:#6B5F5C;line-height:1.6;">Los Banos Martial Arts Academy<br />${SCHOOL_ADDRESS}</p>
        </div>`;
}

export function bookingConfirmationHtml(
  parentName: string,
  appointments: AppointmentInfo[],
  language: Language,
  logoUrl?: string,
): string {
  const c = RECEIPT_COPY[language];
  const heading = appointments.length > 1 ? c.headingMany : c.heading;
  const intro = fillTemplate(c.intro, {
    name: firstName(parentName),
    children: receiptChildren(appointments, language),
  });

  const tickets = appointments
    .map((a, i) => visitTicket(a, c, language, i > 0))
    .join('');

  return wrap(
    `
        <div style="padding:28px 28px 20px;">
          <p class="lb-heading" style="margin:0 0 10px;font-family:${DISPLAY_FONT};font-size:30px;font-weight:800;color:#231A19;line-height:1.1;">${escHtml(heading)}</p>
          <p class="lb-text" style="margin:0;font-family:${BODY_FONT};font-size:16px;color:#4A3F3D;line-height:1.6;">${escHtml(intro)}</p>
        </div>${tickets}
        <div style="padding:28px 28px 8px;">
          ${receiptLabel(c.whereHeading)}
          <p class="lb-heading" style="margin:0;font-family:${BODY_FONT};font-size:16px;color:#231A19;line-height:1.6;">${SCHOOL_ADDRESS}</p>
          <p style="margin:0 0 18px;"><a href="${escHtml(MAPS_URL)}" class="lb-accent" style="display:inline-block;padding:10px 0;font-family:${BODY_FONT};font-size:16px;color:#A01F23;text-decoration:underline;">${escHtml(c.openMaps)}</a></p>
          ${receiptLabel(c.expectHeading)}
          <p class="lb-text" style="margin:0 0 28px;font-family:${BODY_FONT};font-size:16px;color:#4A3F3D;line-height:1.6;">${escHtml(c.expectBody)}</p>
          <p class="lb-text" style="margin:0;font-family:${BODY_FONT};font-size:16px;color:#4A3F3D;line-height:1.6;">${escHtml(c.closing)}</p>
          <p style="margin:0;"><a href="${PHONE_HREF}" class="lb-accent" style="display:inline-block;padding:10px 0;font-family:${DISPLAY_FONT};font-size:20px;font-weight:800;color:#A01F23;text-decoration:underline;">${PHONE_DISPLAY}</a></p>
        </div>${receiptFooter()}`,
    {
      title: heading,
      logoUrl,
      language,
      bleed: true,
      // The earliest visit only: it is the one a family acts on next. The
      // subject already carries the date, so the preheader spends its room
      // on the arrival time and street instead of repeating it.
      preheader: fillTemplate(c.preheader, {
        at: timeArticle(appointments[0].time, language),
        time: appointments[0].time,
        street: SCHOOL_STREET,
      }),
    },
  );
}

export function bookingConfirmationText(
  parentName: string,
  appointments: AppointmentInfo[],
  language: Language,
): string {
  const c = RECEIPT_COPY[language];
  const heading = appointments.length > 1 ? c.headingMany : c.heading;
  const intro = fillTemplate(c.intro, {
    name: firstName(parentName),
    children: receiptChildren(appointments, language),
  });

  const lines: string[] = [heading, '', intro, ''];

  for (const a of appointments) {
    lines.push(`${a.programLabel}${a.childNames ? ` - ${a.childNames}` : ''}`);
    lines.push(a.date);
    lines.push(receiptArrive(c, a.time, language));
    // See bookingConfirmationHtml: no booking token means no working
    // reschedule link, so the line is omitted. Every URL gets a line to
    // itself so no client wraps one mid-link.
    if (a.bookingToken) {
      lines.push(`${c.change}:`);
      lines.push(a.rebookingUrl);
    }
    lines.push('');
  }

  lines.push(c.whereHeading);
  lines.push(SCHOOL_ADDRESS);
  lines.push(`${c.openMaps}:`);
  lines.push(MAPS_URL);
  lines.push('');
  lines.push(c.expectHeading);
  lines.push(c.expectBody);
  lines.push('');
  lines.push(c.closing);
  lines.push(PHONE_DISPLAY);

  return lines.join('\n');
}

export function reminderEmailHtml(
  parentName: string,
  appointments: AppointmentInfo[],
  confirmUrl: string,
  whenPhrase: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  const cards = appointments
    .map((a) => {
      const inner = `<div class="lb-text" style="font-size:13px;color:#555;margin-top:4px;">${escHtml(a.time)}</div>
      <p class="lb-muted" style="margin:10px 0 0;font-size:12px;color:#595959;">
        Need to reschedule? <a href="${escHtml(a.rebookingUrl)}" class="lb-accent" style="color:#A01F23;text-decoration:none;">Click here</a>
      </p>`;
      return visitCard(a, inner);
    })
    .join('');

  const heading =
    appointments.length > 1
      ? `Reminder: your LBMAA appointments are ${whenPhrase}`
      : `Reminder: your LBMAA appointment is ${whenPhrase}`;
  const intro =
    appointments.length > 1
      ? 'just a reminder that your intro appointments are coming up:'
      : 'just a reminder that your intro appointment is coming up:';

  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${heading}</p>
    <p class="lb-text" style="margin:0 0 16px;color:#555;font-size:13px;">Hi ${escHtml(parentName)}, ${intro}</p>
    ${cards}
    ${ctaButton(confirmUrl, 'Confirm My Attendance')}
  `,
    { title: heading, logoUrl, subtitle },
  );
}

export function submissionConfirmationHtml(
  lead: EnrollmentLead,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Thank you for your interest in LBMAA!</p>
    <p class="lb-text" style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(lead.parent_name)}, we received your enrollment inquiry and will review it shortly.
      You can expect to hear back from us within 1-2 business days.
    </p>
    <div class="lb-panel" style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
      <div class="lb-muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#595959;margin-bottom:8px;">Your inquiry details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${lead.phone ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Phone</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.phone)}</td></tr>` : ''}
        ${
          lead.children && lead.children.length > 0
            ? lead.children
                .map(
                  (c) =>
                    `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Child</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(c.name)}, age ${c.age} (${PROGRAM_LABELS[c.program_type] ?? c.program_type})</td></tr>`,
                )
                .join('')
            : lead.student_name
              ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Student</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.student_name)}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>`
              : ''
        }
        ${lead.message ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;width:110px;">Message</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.message)}</td></tr>` : ''}
        ${lead.parent_email ? `<tr><td class="lb-heading" style="padding:4px 0;font-weight:700;color:#1a1a2e;">Contact</td><td class="lb-text" style="padding:4px 0;color:#555;">${escHtml(lead.parent_email)}</td></tr>` : ''}
      </table>
    </div>
    <p class="lb-text" style="margin:0 0 18px;font-size:13px;color:#555;line-height:1.65;">
      We look forward to meeting your family. In the meantime, feel free to reach us at
      <a href="mailto:LosBanosMartialArts@gmail.com" class="lb-accent" style="color:#A01F23;text-decoration:none;">LosBanosMartialArts@gmail.com</a>.
    </p>
    <p class="lb-text" style="margin:0;font-size:13px;color:#555;">The LBMAA Team</p>
  `,
    { title: 'Thank you for your interest in LBMAA', logoUrl, subtitle },
  );
}

export function announcementNotificationHtml(
  title: string,
  body: string,
  url: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New announcement from LBMAA</p>
    <div class="lb-panel" style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
      <p class="lb-heading" style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0;">${escHtml(title)}</p>
      <p class="lb-text" style="font-size:13px;color:#555;margin:0;line-height:1.5;">${escHtml(body.substring(0, 200))}${body.length > 200 ? '…' : ''}</p>
    </div>
    ${ctaButton(url, 'Read Announcement')}
  `,
    { title: 'New announcement from LBMAA', logoUrl, subtitle },
  );
}

export function blogPostNotificationHtml(
  title: string,
  authorName: string,
  url: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New post in the Parent Blog</p>
    <p class="lb-text" style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${escHtml(authorName)}</strong> published a new post:
    </p>
    <div class="lb-panel" style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
      <p class="lb-heading" style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0;">${escHtml(title)}</p>
    </div>
    ${ctaButton(url, 'Read Post')}
  `,
    { title: 'New post in the Parent Blog', logoUrl, subtitle },
  );
}

export function commentReplyHtml(
  replierName: string,
  originalSnippet: string,
  url: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${escHtml(replierName)} replied to your comment</p>
    <p class="lb-text" style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.65;">Your comment:</p>
    <div class="lb-panel" style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
      <p class="lb-muted" style="font-size:13px;color:#595959;margin:0;font-style:italic;">"${escHtml(originalSnippet)}${originalSnippet.length >= 100 ? '…' : ''}"</p>
    </div>
    ${ctaButton(url, 'View Reply')}
  `,
    { title: 'New reply to your comment', logoUrl, subtitle },
  );
}

export function postCommentHtml(
  commenterName: string,
  postTitle: string,
  url: string,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New comment on your post</p>
    <p class="lb-text" style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${escHtml(commenterName)}</strong> commented on:
    </p>
    <div class="lb-panel" style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
      <p class="lb-heading" style="font-size:15px;font-weight:600;color:#1a1a2e;margin:0;">${escHtml(postTitle)}</p>
    </div>
    ${ctaButton(url, 'View Comment')}
  `,
    { title: 'New comment on your post', logoUrl, subtitle },
  );
}
