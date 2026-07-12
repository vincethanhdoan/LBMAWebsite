// supabase/functions/send-email/templates.ts

import type { EnrollmentLead, AppointmentInfo } from './types.ts';

function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
};

const STRIPE = `<div style="height:4px;background:#A01F23;"></div>`;

function makeHeader(logoUrl?: string, subtitle?: string): string {
  const subtitleHtml = subtitle
    ? `<div style="font-size:11px;color:#595959;margin-top:2px;">${subtitle}</div>`
    : '';
  const nameBlock = `<div style="font-size:17px;font-weight:700;color:#1a1a1a;line-height:1.2;">Los Banos Martial Arts Academy</div>${subtitleHtml}`;
  if (logoUrl) {
    return `
  <div style="padding:16px 28px;border-bottom:1px solid #e2dbd5;">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:48px;padding:0;vertical-align:middle;">
          <img src="${logoUrl}" alt="Los Banos Martial Arts Academy" style="width:48px;height:48px;border-radius:4px;display:block;" />
        </td>
        <td style="padding:0 0 0 14px;vertical-align:middle;">${nameBlock}</td>
      </tr>
    </table>
  </div>`;
  }
  return `
  <div style="padding:16px 28px;border-bottom:1px solid #e2dbd5;">${nameBlock}</div>`;
}

const FOOTER = `
  <p style="margin:0;font-size:12px;color:#595959;line-height:1.6;text-align:center;">
    Questions? <a href="mailto:westcoastlosbanos@gmail.com" style="color:#A01F23;text-decoration:underline;">westcoastlosbanos@gmail.com</a>
    or <a href="tel:+14086200252" style="color:#A01F23;text-decoration:underline;">(408) 620-0252</a><br />1209 South 6th St Suite E, Los Banos, CA
  </p>
`;

function wrap(inner: string, logoUrl?: string, subtitle?: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3d3d3d;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e2dbd5;border-radius:6px;overflow:hidden;">
    ${STRIPE}
    ${makeHeader(logoUrl, subtitle)}
    <div style="padding:24px 28px;">
      ${inner}
      ${FOOTER}
    </div>
  </div>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-bottom:20px;">
    <a href="${href}" style="display:inline-block;background:#A01F23;color:#fff;font-weight:700;padding:13px 36px;border-radius:4px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">${label}</a>
  </div>`;
}

export function enrollmentNotificationHtml(
  lead: EnrollmentLead,
  adminUrl: string,
  logoUrl?: string,
  subtitle = 'Admin Portal',
): string {
  const rows = [
    `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Parent</td><td style="padding:4px 0;color:#555;">${escHtml(lead.parent_name)}</td></tr>`,
    `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Email</td><td style="padding:4px 0;color:#555;">${escHtml(lead.parent_email)}</td></tr>`,
    lead.phone
      ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Phone</td><td style="padding:4px 0;color:#555;">${escHtml(lead.phone)}</td></tr>`
      : '',
    lead.children && lead.children.length > 0
      ? lead.children
          .map(
            (c) =>
              `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Child</td><td style="padding:4px 0;color:#555;">${escHtml(c.name)}, age ${c.age} — ${PROGRAM_LABELS[c.program_type] ?? c.program_type}</td></tr>`,
          )
          .join('')
      : lead.student_name
        ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Student</td><td style="padding:4px 0;color:#555;">${escHtml(lead.student_name)}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>`
        : '',
    lead.message
      ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;">Message</td><td style="padding:4px 0;color:#555;">${escHtml(lead.message)}</td></tr>`
      : '',
  ].join('');

  return wrap(
    `
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New enrollment inquiry</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">A family submitted an enrollment inquiry through the website.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
    ${ctaButton(adminUrl, 'View in Admin Dashboard')}
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">You have a new message</p>
    <p style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${escHtml(senderName)}</strong> sent you a message in the LBMAA portal.
    </p>
    ${ctaButton(portalUrl, 'Read Message')}
    <p style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">Reply directly in the portal — do not reply to this email.</p>
  `,
    logoUrl,
    subtitle,
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
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a1a2e;">${escHtml(p.programLabel)}${p.childNames ? ` — ${escHtml(p.childNames)}` : ''}</p>
      ${ctaButton(p.bookingUrl, `Book ${escHtml(p.programLabel)} Intro`)}
    </div>
  `,
    )
    .join('');

  return wrap(
    `
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment request has been approved!</p>
    <p style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(parentName)}! We'd love to welcome your family to Los Banos Martial Arts Academy.
      Use the buttons below to choose an appointment date for each program.
    </p>
    ${sections}
    <p style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">
      Each booking link is unique to your inquiry. Do not share them.
    </p>
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment request has been approved!</p>
    <p style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(lead.parent_name)}! We'd love to welcome your family to Los Banos Martial Arts Academy.
      Use the button below to choose an appointment date that works for you.
    </p>
    ${ctaButton(bookingUrl, 'Book Your Appointment')}
    <p style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">
      This booking link is unique to your inquiry. Do not share it.
    </p>
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment inquiry — LBMAA</p>
    <p style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">Hi ${escHtml(lead.parent_name)},</p>
    <p style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">${escHtml(message)}</p>
  `,
    logoUrl,
    subtitle,
  );
}

export function bookingConfirmationHtml(
  parentName: string,
  appointments: AppointmentInfo[],
  logoUrl?: string,
  subtitle?: string,
): string {
  const cards = appointments
    .map(
      (a) => `
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 18px;margin:0 0 12px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#A01F23;margin-bottom:6px;">
        ${escHtml(a.programLabel)}${a.childNames ? ` — ${escHtml(a.childNames)}` : ''}
      </div>
      <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${escHtml(a.date)}</div>
      <div style="font-size:13px;color:#555;margin-top:4px;">${escHtml(a.time)}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#595959;">
        Need to reschedule? <a href="${a.rebookingUrl}" style="color:#A01F23;text-decoration:none;">Click here</a>
      </p>
    </div>
  `,
    )
    .join('');

  const heading =
    appointments.length > 1
      ? 'Appointments confirmed!'
      : 'Appointment confirmed!';
  const intro =
    appointments.length > 1
      ? 'your enrollment appointments are set:'
      : 'your enrollment appointment is set:';

  return wrap(
    `
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${heading}</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;">Hi ${escHtml(parentName)}, ${intro}</p>
    ${cards}
  `,
    logoUrl,
    subtitle,
  );
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
    .map(
      (a) => `
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 18px;margin:0 0 12px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#A01F23;margin-bottom:6px;">
        ${escHtml(a.programLabel)}${a.childNames ? ` — ${escHtml(a.childNames)}` : ''}
      </div>
      <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${escHtml(a.date)}</div>
      <div style="font-size:13px;color:#555;margin-top:4px;">${escHtml(a.time)}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#595959;">
        Need to reschedule? <a href="${a.rebookingUrl}" style="color:#A01F23;text-decoration:none;">Click here</a>
      </p>
    </div>
  `,
    )
    .join('');

  const heading =
    appointments.length > 1
      ? `Reminder: your LBMAA appointments are ${whenPhrase}`
      : `Reminder: your LBMAA appointment is ${whenPhrase}`;
  const intro =
    appointments.length > 1
      ? 'just a reminder — your intro appointments are coming up:'
      : 'just a reminder — your intro appointment is coming up:';

  return wrap(
    `
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${heading}</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;">Hi ${escHtml(parentName)}, ${intro}</p>
    ${cards}
    ${ctaButton(confirmUrl, 'Confirm My Attendance')}
  `,
    logoUrl,
    subtitle,
  );
}

export function submissionConfirmationHtml(
  lead: EnrollmentLead,
  logoUrl?: string,
  subtitle?: string,
): string {
  return wrap(
    `
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Thank you for your interest in LBMAA!</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${escHtml(lead.parent_name)}, we received your enrollment inquiry and will review it shortly.
      You can expect to hear back from us within 1–2 business days.
    </p>
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#595959;margin-bottom:8px;">Your inquiry details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${lead.phone ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Phone</td><td style="padding:4px 0;color:#555;">${escHtml(lead.phone)}</td></tr>` : ''}
        ${
          lead.children && lead.children.length > 0
            ? lead.children
                .map(
                  (c) =>
                    `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Child</td><td style="padding:4px 0;color:#555;">${escHtml(c.name)}, age ${c.age} — ${PROGRAM_LABELS[c.program_type] ?? c.program_type}</td></tr>`,
                )
                .join('')
            : lead.student_name
              ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Student</td><td style="padding:4px 0;color:#555;">${escHtml(lead.student_name)}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>`
              : ''
        }
        ${lead.message ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;width:110px;">Message</td><td style="padding:4px 0;color:#555;">${escHtml(lead.message)}</td></tr>` : ''}
        <tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Contact</td><td style="padding:4px 0;color:#555;">${escHtml(lead.parent_email)}</td></tr>
      </table>
    </div>
    <p style="margin:0 0 18px;font-size:13px;color:#555;line-height:1.65;">
      We look forward to meeting your family. In the meantime, feel free to reach us at
      <a href="mailto:westcoastlosbanos@gmail.com" style="color:#A01F23;text-decoration:none;">westcoastlosbanos@gmail.com</a>.
    </p>
    <p style="margin:0;font-size:13px;color:#555;">— The LBMAA Team</p>
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New announcement from LBMAA</p>
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
      <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0;">${escHtml(title)}</p>
      <p style="font-size:13px;color:#555;margin:0;line-height:1.5;">${escHtml(body.substring(0, 200))}${body.length > 200 ? '…' : ''}</p>
    </div>
    ${ctaButton(url, 'Read Announcement')}
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New post in the Parent Blog</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${escHtml(authorName)}</strong> published a new post:
    </p>
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
      <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0;">${escHtml(title)}</p>
    </div>
    ${ctaButton(url, 'Read Post')}
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${escHtml(replierName)} replied to your comment</p>
    <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.65;">Your comment:</p>
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
      <p style="font-size:13px;color:#595959;margin:0;font-style:italic;">"${escHtml(originalSnippet)}${originalSnippet.length >= 100 ? '…' : ''}"</p>
    </div>
    ${ctaButton(url, 'View Reply')}
  `,
    logoUrl,
    subtitle,
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
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New comment on your post</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${escHtml(commenterName)}</strong> commented on:
    </p>
    <div style="background:#f5f2ef;border:1px solid #e2dbd5;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
      <p style="font-size:15px;font-weight:600;color:#1a1a2e;margin:0;">${escHtml(postTitle)}</p>
    </div>
    ${ctaButton(url, 'View Comment')}
  `,
    logoUrl,
    subtitle,
  );
}
