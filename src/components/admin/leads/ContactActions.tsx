import { MessageSquare } from 'lucide-react';
import { reminderSmsHref, telHref } from '../../../lib/contactLinks';
import { pacificTodayISO } from '../../../lib/pacificTime';
import type { EnrollmentLead } from '../../../lib/types';
import { getAppointmentOccurrences } from './leadViews';
import { CallButton } from './ui';
import { CONTACT_LINK_CLASS } from './contactLinkClass';

// Phone tools that use the staff member's own device. Texting opens their
// messaging app with a reminder ready to send; the portal sends nothing and
// records nothing, so staff still mark the visit confirmed themselves.
export function ContactActions({ lead }: { lead: EnrollmentLead }) {
  if (!lead.phone || !telHref(lead.phone)) return null;

  const todayKey = pacificTodayISO();
  const next = getAppointmentOccurrences([lead]).find(
    (o) => o.dateKey >= todayKey,
  );
  const text = next
    ? reminderSmsHref({
        phone: lead.phone,
        parentName: lead.parent_name,
        childNames: (next.booking
          ? lead.children.filter(
              (c) => c.program_type === next.booking!.program_type,
            )
          : lead.children
        ).map((c) => c.name),
        dateKey: next.dateKey,
        time: next.time,
      })
    : null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <CallButton name={lead.parent_name} phone={lead.phone} />
      {text && (
        <a href={text} className={CONTACT_LINK_CLASS}>
          <MessageSquare className="w-4 h-4" aria-hidden />
          Text a reminder
        </a>
      )}
    </div>
  );
}
