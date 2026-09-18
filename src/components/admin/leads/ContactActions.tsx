import { MessageSquare, Phone } from 'lucide-react';
import { formatPhone } from '../../../lib/format';
import { reminderSmsHref, telHref } from '../../../lib/contactLinks';
import type { EnrollmentLead } from '../../../lib/types';
import { toLocalDateKey } from './leadDisplay';
import { getAppointmentOccurrences } from './leadViews';

const LINK =
  'inline-flex items-center justify-center gap-1.5 min-h-12 px-3 rounded-md border border-border text-[13px] font-medium hover:bg-muted transition-colors';

// Phone tools that use the staff member's own device. Texting opens their
// messaging app with a reminder ready to send; the portal sends nothing and
// records nothing, so staff still mark the visit confirmed themselves.
export function ContactActions({ lead }: { lead: EnrollmentLead }) {
  if (!lead.phone) return null;
  const call = telHref(lead.phone);
  if (!call) return null;

  const todayKey = toLocalDateKey(new Date());
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
      <a
        href={call}
        aria-label={`Call ${lead.parent_name} at ${formatPhone(lead.phone)}`}
        className={LINK}
      >
        <Phone className="w-4 h-4" aria-hidden />
        Call
      </a>
      {text && (
        <a href={text} className={LINK}>
          <MessageSquare className="w-4 h-4" aria-hidden />
          Text a reminder
        </a>
      )}
    </div>
  );
}
