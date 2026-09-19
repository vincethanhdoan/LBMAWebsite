import type { EnrollmentLead } from '../../../lib/types';

// A lead is a possible duplicate when its email matches an earlier-created
// lead in the same list; the first occurrence of each email is never flagged.
// Leads without an email are not matched against anything.
export function findDuplicateLeadIds(leads: EnrollmentLead[]): Set<string> {
  const earliestByEmail = new Map<string, string>();
  for (const l of leads) {
    const email = l.parent_email?.trim().toLowerCase();
    if (!email) continue;
    const earliest = earliestByEmail.get(email);
    if (!earliest || l.created_at < earliest)
      earliestByEmail.set(email, l.created_at);
  }
  const ids = new Set<string>();
  for (const l of leads) {
    const email = l.parent_email?.trim().toLowerCase();
    if (!email) continue;
    if (l.created_at > earliestByEmail.get(email)!) ids.add(l.lead_id);
  }
  return ids;
}
