import type { EnrollmentLead } from '../../../lib/types';
import { daysUntilInPacific } from '../../../lib/pacificTime';
import { effectiveConfirmationNotification, getLeadPrimaryDate } from './leadDisplay';

export type ActionNeededItem = {
  lead: EnrollmentLead;
  reason: 'unconfirmed_soon' | 'awaiting_decision' | 'email_failed';
};

export function deriveActionNeeded(leads: EnrollmentLead[]): ActionNeededItem[] {
  const items: ActionNeededItem[] = [];
  for (const lead of leads) {
    if (lead.status === 'appointment_scheduled') {
      const dateKey = getLeadPrimaryDate(lead);
      if (dateKey) {
        const days = daysUntilInPacific(new Date(dateKey + 'T12:00:00'));
        if (days >= 0 && days <= 2) {
          items.push({ lead, reason: 'unconfirmed_soon' });
          continue;
        }
      }
    }
    if (lead.status === 'new') {
      items.push({ lead, reason: 'awaiting_decision' });
      continue;
    }
    if (effectiveConfirmationNotification(lead)?.status === 'failed') {
      items.push({ lead, reason: 'email_failed' });
    }
  }
  const order = { unconfirmed_soon: 0, awaiting_decision: 1, email_failed: 2 };
  return items.sort((a, b) => order[a.reason] - order[b.reason]);
}
