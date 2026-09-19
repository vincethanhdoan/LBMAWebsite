// supabase/functions/send-email/messages.ts
// Pure assembly of the two enrollment_lead_notifications emails whose
// subject/html/text depend on more than a single template call: the
// family's booking receipt and the admin new-lead alert. No I/O, no
// Deno.env access, so every function here is exact-string testable.
// index.ts loads the lead and its appointments from the DB, then calls
// these to get the exact content to send.

import type { EnrollmentLead, AppointmentInfo } from './types.ts';
import {
  bookingConfirmationHtml,
  bookingConfirmationText,
  enrollmentNotificationHtml,
} from './templates.ts';
import {
  toLanguage,
  fillTemplate,
  sanitizeForSubject,
  RECEIPT_COPY,
} from './copy.ts';

export const LOGO_URL =
  'https://qfyeguikxxwwxpxleqrr.supabase.co/storage/v1/object/public/assets/logo-96.png';

export interface ReceiptMessage {
  subject: string;
  html: string;
  text: string;
}

// The family's booking receipt: subject, html, and plain-text parts, in the
// lead's preferred language. The caller has already loaded the lead's
// upcoming appointments (getLeadAppointments) and confirmed there is at
// least one; this function does not handle the empty case.
export function buildReceiptMessage(
  lead: EnrollmentLead,
  appointments: AppointmentInfo[],
): ReceiptMessage {
  const language = toLanguage(lead.preferred_language);
  const c = RECEIPT_COPY[language];
  const subject =
    appointments.length > 1
      ? c.subjectMany
      : fillTemplate(c.subject, {
          dateShort: appointments[0].dateShort,
          time: appointments[0].time,
        });
  const html = bookingConfirmationHtml(
    lead.parent_name,
    appointments,
    language,
    LOGO_URL,
  );
  const text = bookingConfirmationText(
    lead.parent_name,
    appointments,
    language,
  );
  return { subject, html, text };
}

export interface AdminAlertMessage {
  subject: string;
  html: string;
}

// The admin new-lead alert: always English. The subject names the visit
// when the lead already has one booked (a trial booking), or reads as a
// plain inquiry otherwise (a lead submitted with no visit, or approved
// through the older flow).
export function buildAdminAlertMessage(
  lead: EnrollmentLead,
  visits: AppointmentInfo[],
  adminUrl: string,
  logoUrl: string,
): AdminAlertMessage {
  // A parent name is free text; a stray newline or control character must
  // not reach Resend's JSON subject field verbatim.
  const safeParentName = sanitizeForSubject(lead.parent_name, 'a family');
  const subject =
    visits.length > 0
      ? `New trial booking from ${safeParentName}: ${visits[0].dateShort} at ${visits[0].time}`
      : `New enrollment inquiry from ${safeParentName}`;
  const html = enrollmentNotificationHtml(
    lead,
    adminUrl,
    logoUrl,
    'Admin Portal',
    visits,
  );
  return { subject, html };
}
