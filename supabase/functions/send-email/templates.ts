// supabase/functions/send-email/templates.ts

import type { EnrollmentLead, AppointmentInfo } from './types.ts';
import {
  RECEIPT_COPY,
  FOOTER_COPY,
  SCHOOL_ADDRESS,
  joinNames,
  fillTemplate,
  firstName,
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

// English by default; the receipt is the only caller that passes a language,
// so every other email keeps its existing English footer unchanged.
function footer(language: Language = 'en'): string {
  const t = FOOTER_COPY[language];
  return `
  <p class="lb-muted" style="margin:0;font-size:14px;color:#595959;line-height:1.6;text-align:center;">
    ${t.questions} <a href="mailto:LosBanosMartialArts@gmail.com" class="lb-accent" style="color:#A01F23;text-decoration:underline;">LosBanosMartialArts@gmail.com</a>
    ${t.or} <a href="${PHONE_HREF}" class="lb-accent" style="color:#A01F23;text-decoration:underline;">${PHONE_DISPLAY}</a><br />${SCHOOL_ADDRESS}
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
  const { title, logoUrl, subtitle, language = 'en', preheader } = shell;
  return `<!DOCTYPE html>
<html lang="${language}" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escHtml(title)}</title>
<style>${DARK_MODE_CSS}
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
        <div style="padding:24px 28px;">
          ${inner}
          ${footer(language)}
        </div>
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

// The outer container and program/children header are identical between the
// receipt and the reminder; only the content below the date (arrive sentence
// + links vs. time + one reschedule link) differs, so each caller supplies
// that inner content and keeps its own href-building and escaping.
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

  const cards = appointments
    .map((a) => {
      const arrive = receiptArrive(c, a.time, language);
      // A visit with no booking token has no working reschedule link; omit
      // it rather than pointing a labeled link at a fallback URL.
      const changeLine = a.bookingToken
        ? `<p style="margin:2px 0 0;font-size:14px;"><a href="${escHtml(a.rebookingUrl)}" class="lb-accent" style="display:inline-block;padding:8px 0;color:#A01F23;text-decoration:underline;">${escHtml(c.change)}</a></p>`
        : '';
      // The arrival time carries the same weight as the date: the slot times
      // are deliberate, and a 4:26 PM reads as a typo when it is whispered.
      const inner = `<p class="lb-heading" style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1a1a2e;line-height:1.3;">${escHtml(arrive)}</p>
      ${changeLine}`;
      return visitCard(a, inner);
    })
    .join('');

  return wrap(
    `
    <p class="lb-heading" style="margin:0 0 10px;font-size:20px;font-weight:700;color:#1a1a2e;line-height:1.3;">${escHtml(heading)}</p>
    <p class="lb-text" style="margin:0 0 18px;color:#555;font-size:16px;line-height:1.55;">${escHtml(intro)}</p>
    ${cards}
    <p class="lb-heading" style="margin:22px 0 4px;font-size:16px;font-weight:700;color:#1a1a2e;">${escHtml(c.whereHeading)}</p>
    <p class="lb-text" style="margin:0;color:#555;font-size:16px;line-height:1.55;">${SCHOOL_ADDRESS}</p>
    <p style="margin:0 0 18px;font-size:14px;"><a href="${escHtml(MAPS_URL)}" class="lb-accent" style="display:inline-block;padding:8px 0;color:#A01F23;text-decoration:underline;">${escHtml(c.openMaps)}</a></p>
    <p class="lb-heading" style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1a1a2e;">${escHtml(c.expectHeading)}</p>
    <p class="lb-text" style="margin:0 0 18px;color:#555;font-size:16px;line-height:1.55;">${escHtml(c.expectBody)}</p>
    <p class="lb-text" style="margin:0;color:#555;font-size:16px;line-height:1.55;">${escHtml(c.closing)}</p>
    <p style="margin:0 0 18px;font-size:16px;"><a href="${PHONE_HREF}" class="lb-accent" style="display:inline-block;padding:12px 0;font-size:16px;font-weight:700;color:#A01F23;text-decoration:underline;">${PHONE_DISPLAY}</a></p>
  `,
    {
      title: heading,
      logoUrl,
      language,
      // The earliest visit only: it is the one a family acts on next, and two
      // visits would not fit the snippet a mail client shows.
      preheader: fillTemplate(c.preheader, {
        date: appointments[0].date,
        at: timeArticle(appointments[0].time, language),
        time: appointments[0].time,
        address: SCHOOL_ADDRESS,
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
