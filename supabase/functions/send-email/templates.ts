// supabase/functions/send-email/templates.ts

import type { EnrollmentLead, AppointmentInfo } from './types.ts'

const STRIPE = `<div style="height:4px;background:#A01F23;"></div>`

function makeHeader(logoUrl?: string, subtitle?: string): string {
  const subtitleHtml = subtitle
    ? `<div style="font-size:11px;color:#595959;margin-top:2px;">${subtitle}</div>`
    : ''
  const nameBlock = `
    <div>
      <div style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.3;">Los Banos Martial Arts Academy</div>
      ${subtitleHtml}
    </div>`
  if (logoUrl) {
    return `
  <div style="padding:16px 28px;border-bottom:1px solid #e2dbd5;display:flex;align-items:center;gap:14px;">
    <img src="${logoUrl}" alt="Los Banos Martial Arts Academy" style="width:48px;height:48px;border-radius:4px;display:block;flex-shrink:0;" />
    ${nameBlock}
  </div>`
  }
  return `
  <div style="padding:16px 28px;border-bottom:1px solid #e2dbd5;">
    ${nameBlock}
  </div>`
}

const FOOTER = `
  <hr style="border:none;border-top:1px solid #e2dbd5;margin:0 0 16px;" />
  <p style="margin:0 0 6px;font-size:12px;color:#595959;line-height:1.6;text-align:center;">
    <strong style="color:#3d3d3d;">Need help?</strong> Reach us at
    <a href="mailto:info@lbmaa.com" style="color:#A01F23;text-decoration:underline;">info@lbmaa.com</a>
    or call <a href="tel:+14086200252" style="color:#A01F23;text-decoration:underline;">(408) 620-0252</a>
  </p>
  <p style="margin:0;font-size:12px;color:#595959;line-height:1.6;text-align:center;">1209 South 6th St Suite E, Los Banos, CA</p>
`

function wrap(inner: string, logoUrl?: string, subtitle?: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3d3d3d;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e2dbd5;border-radius:6px;overflow:hidden;">
    ${STRIPE}
    ${makeHeader(logoUrl, subtitle)}
    <div style="padding:24px 28px;">
      ${inner}
      ${FOOTER}
    </div>
  </div>`
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-bottom:20px;">
    <a href="${href}" style="display:inline-block;background:#A01F23;color:#fff;font-weight:700;padding:13px 36px;border-radius:4px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">${label}</a>
  </div>`
}

export function enrollmentNotificationHtml(lead: EnrollmentLead, adminUrl: string, logoUrl?: string): string {
  const rows = [
    `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Parent</td><td style="padding:4px 0;color:#555;">${lead.parent_name}</td></tr>`,
    `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Email</td><td style="padding:4px 0;color:#555;">${lead.parent_email}</td></tr>`,
    lead.phone ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Phone</td><td style="padding:4px 0;color:#555;">${lead.phone}</td></tr>` : '',
    lead.student_name ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Student</td><td style="padding:4px 0;color:#555;">${lead.student_name}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>` : '',
    lead.message ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;">Message</td><td style="padding:4px 0;color:#555;">${lead.message}</td></tr>` : '',
  ].join('')

  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New enrollment inquiry</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">A family submitted an enrollment inquiry through the website.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
    ${ctaButton(adminUrl, 'View in Admin Dashboard')}
  `, logoUrl, 'Admin Portal')
}

export function messagingNotificationHtml(senderName: string, portalUrl: string, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">You have a new message</p>
    <p style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${senderName}</strong> sent you a message in the LBMAA portal.
    </p>
    ${ctaButton(portalUrl, 'Read Message')}
    <p style="margin:0 0 18px;font-size:12px;color:#595959;text-align:center;">Reply directly in the portal — do not reply to this email.</p>
  `, logoUrl)
}

// Multi-program approval email — sent when admin approves a lead with program bookings
export function multiProgramApprovalEmailHtml(
  parentName: string,
  programs: Array<{ programLabel: string; childNames: string; bookingUrl: string }>,
  logoUrl?: string
): string {
  const sections = programs.map(p => `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a1a2e;">${p.programLabel}${p.childNames ? ` — ${p.childNames}` : ''}</p>
      ${ctaButton(p.bookingUrl, `Book ${p.programLabel} Intro`)}
    </div>
  `).join('')

  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment request has been approved!</p>
    <p style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${parentName}! We'd love to welcome your family to Los Banos Martial Arts Academy.
      Use the buttons below to choose an appointment date for each program.
    </p>
    ${sections}
    <p style="margin:0 0 18px;font-size:12px;color:#aaa;text-align:center;">
      Each booking link is unique to your inquiry. Do not share them.
    </p>
  `, logoUrl)
}

// Booking approval email — sent when admin approves a lead
export function approvalEmailHtml(lead: EnrollmentLead, bookingUrl: string, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment request has been approved!</p>
    <p style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${lead.parent_name}! We'd love to welcome your family to Los Banos Martial Arts Academy.
      Use the button below to choose an appointment date that works for you.
    </p>
    ${ctaButton(bookingUrl, 'Book Your Appointment')}
    <p style="margin:0 0 18px;font-size:12px;color:#aaa;text-align:center;">
      This booking link is unique to your inquiry. Do not share it.
    </p>
  `, logoUrl)
}

// Denial email — sent when admin denies a lead
export function denialEmailHtml(lead: EnrollmentLead, logoUrl?: string): string {
  const message = lead.denial_message ?? 'Thank you for your interest in LBMAA. Unfortunately, we are unable to accommodate your enrollment request at this time.'
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Your enrollment inquiry — LBMAA</p>
    <p style="margin:0 0 18px;color:#555;font-size:13px;line-height:1.65;">Hi ${lead.parent_name},</p>
    <p style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">${message}</p>
  `, logoUrl)
}

// Booking confirmation email — sent after an appointment is booked
export function bookingConfirmationHtml(parentName: string, appointments: AppointmentInfo[], logoUrl?: string): string {
  const cards = appointments.map(a => `
    <div style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:6px;padding:14px 18px;margin:0 0 12px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#A01F23;margin-bottom:6px;">
        ${a.programLabel}${a.childNames ? ` — ${a.childNames}` : ''}
      </div>
      <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${a.date}</div>
      <div style="font-size:13px;color:#555;margin-top:4px;">${a.time}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#888;">
        Need to reschedule? <a href="${a.rebookingUrl}" style="color:#A01F23;text-decoration:none;">Click here</a>
      </p>
    </div>
  `).join('')

  const heading = appointments.length > 1 ? 'Appointments confirmed!' : 'Appointment confirmed!'
  const intro = appointments.length > 1 ? 'your enrollment appointments are set:' : 'your enrollment appointment is set:'

  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${heading}</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;">Hi ${parentName}, ${intro}</p>
    ${cards}
  `, logoUrl)
}

// Reminder email — sent 2 days before appointment
export function reminderEmailHtml(parentName: string, appointments: AppointmentInfo[], confirmUrl: string, logoUrl?: string): string {
  const cards = appointments.map(a => `
    <div style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:6px;padding:14px 18px;margin:0 0 12px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#A01F23;margin-bottom:6px;">
        ${a.programLabel}${a.childNames ? ` — ${a.childNames}` : ''}
      </div>
      <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${a.date}</div>
      <div style="font-size:13px;color:#555;margin-top:4px;">${a.time}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#888;">
        Need to reschedule? <a href="${a.rebookingUrl}" style="color:#A01F23;text-decoration:none;">Click here</a>
      </p>
    </div>
  `).join('')

  const heading = appointments.length > 1
    ? 'Reminder: your LBMAA appointments are in 2 days'
    : 'Reminder: your LBMAA appointment is in 2 days'
  const intro = appointments.length > 1
    ? 'just a reminder — your intro appointments are coming up:'
    : 'just a reminder — your intro appointment is coming up:'

  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${heading}</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;">Hi ${parentName}, ${intro}</p>
    ${cards}
    ${ctaButton(confirmUrl, 'Confirm My Attendance')}
  `, logoUrl)
}

export function submissionConfirmationHtml(lead: EnrollmentLead, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">Thank you for your interest in LBMAA!</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      Hi ${lead.parent_name}, we received your enrollment inquiry and will review it shortly.
      You can expect to hear back from us within 1–2 business days.
    </p>
    <div style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Your inquiry details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${lead.student_name ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Student</td><td style="padding:4px 0;color:#555;">${lead.student_name}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>` : ''}
        <tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Contact</td><td style="padding:4px 0;color:#555;">${lead.parent_email}</td></tr>
      </table>
    </div>
    <p style="margin:0 0 18px;font-size:13px;color:#555;line-height:1.65;">
      We look forward to meeting your family. In the meantime, feel free to reach us at
      <a href="mailto:info@lbmaa.com" style="color:#A01F23;text-decoration:none;">info@lbmaa.com</a>.
    </p>
    <p style="margin:0;font-size:13px;color:#555;">— The LBMAA Team</p>
  `, logoUrl)
}

export function announcementNotificationHtml(title: string, body: string, url: string, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New announcement from LBMAA</p>
    <div style="background:#fdf5f5;border:1px solid #e8d0d0;border-radius:4px;padding:14px 16px;margin-bottom:20px;">
      <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0;">${title}</p>
      <p style="font-size:13px;color:#555;margin:0;line-height:1.5;">${body.substring(0, 200)}${body.length > 200 ? '…' : ''}</p>
    </div>
    ${ctaButton(url, 'Read Announcement')}
  `, logoUrl)
}

export function blogPostNotificationHtml(title: string, authorName: string, url: string, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New post in the Parent Blog</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${authorName}</strong> published a new post:
    </p>
    <div style="background:#fdf5f5;border:1px solid #e8d0d0;border-radius:4px;padding:14px 16px;margin-bottom:20px;">
      <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0;">${title}</p>
    </div>
    ${ctaButton(url, 'Read Post')}
  `, logoUrl)
}

export function commentReplyHtml(replierName: string, originalSnippet: string, url: string, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${replierName} replied to your comment</p>
    <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.65;">Your comment:</p>
    <div style="background:#f8f9fa;border:1px solid #e2e8f0;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
      <p style="font-size:13px;color:#666;margin:0;font-style:italic;">"${originalSnippet}${originalSnippet.length >= 100 ? '…' : ''}"</p>
    </div>
    ${ctaButton(url, 'View Reply')}
  `, logoUrl)
}

export function postCommentHtml(commenterName: string, postTitle: string, url: string, logoUrl?: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New comment on your post</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${commenterName}</strong> commented on:
    </p>
    <div style="background:#fdf5f5;border:1px solid #e8d0d0;border-radius:4px;padding:14px 16px;margin-bottom:20px;">
      <p style="font-size:15px;font-weight:600;color:#1a1a2e;margin:0;">${postTitle}</p>
    </div>
    ${ctaButton(url, 'View Comment')}
  `, logoUrl)
}
