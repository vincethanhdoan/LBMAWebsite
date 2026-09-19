import { CheckCircle2 } from 'lucide-react';
import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './lang';
import type { Lang } from './lang';
import { V3 } from './design';
import { fillTemplate } from './fillTemplate';
import { collapseDoublePeriod, joinNames } from '../../lib/contactLinks';
import type { Program } from '../../lib/programs';
import type { TrialBookingReceipt } from '../../lib/supabase/client';

const ADDRESS = '1209 South 6th Street Suite E, Los Banos, CA 93635';
const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=1209+South+6th+St+Suite+E,+Los+Banos,+CA';

interface TrialBookedPanelProps {
  receipt: TrialBookingReceipt;
  childrenByProgram: Partial<Record<Program, string[]>>;
  email: string;
  ref?: Ref<HTMLDivElement>;
}

function formatVisitDate(dateKey: string, lang: Lang): string {
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateKey + 'T12:00:00'));
}

function formatVisitTime(time: string, lang: Lang): string {
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return new Date('1970-01-01T' + time).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const HEADING_ID = 'trial-booked-heading';

export function TrialBookedPanel({
  receipt,
  childrenByProgram,
  email,
  ref,
}: TrialBookedPanelProps) {
  const { t, lang } = useLanguage();
  const ct = t.contact;

  const sortedVisits = [...receipt.visits].sort((a, b) => {
    if (a.appointment_date !== b.appointment_date) {
      return a.appointment_date < b.appointment_date ? -1 : 1;
    }
    return a.appointment_time < b.appointment_time ? -1 : 1;
  });

  const order: Program[] = ['little_dragons', 'youth'];
  const allChildNames = order
    .filter((program) => sortedVisits.some((v) => v.program_type === program))
    .flatMap((program) => childrenByProgram[program] ?? []);

  return (
    // No card chrome of its own: this renders inside the form's white card,
    // which already provides the background, rounding and padding.
    <div ref={ref} role="region" aria-labelledby={HEADING_ID} tabIndex={-1}>
      <div
        className="text-center pb-8"
        style={{ borderBottom: `1px solid ${V3.border}` }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: V3.primaryBg }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: V3.primary }} />
        </div>
        <h2
          id={HEADING_ID}
          className="v3-h font-black mb-2"
          style={{ fontSize: '1.75rem', color: V3.text }}
        >
          {ct.successHeading}
        </h2>
        <p
          className="text-base max-w-sm mx-auto leading-relaxed"
          style={{ color: V3.muted }}
        >
          {fillTemplate(ct.successBody, {
            children: joinNames(allChildNames, lang),
          })}
        </p>
      </div>

      <div className="flex flex-col gap-4 pt-8">
        {sortedVisits.map((visit) => {
          const childNames = childrenByProgram[visit.program_type] ?? [];
          const programLabel =
            visit.program_type === 'little_dragons'
              ? ct.programNameLittle
              : ct.programNameYouth;
          const heading =
            childNames.length > 0
              ? `${programLabel} · ${joinNames(childNames, lang)}`
              : programLabel;

          return (
            <div
              key={visit.booking_token}
              className="rounded-lg p-5"
              style={{ border: `1px solid ${V3.border}` }}
            >
              <p className="text-sm font-semibold" style={{ color: V3.text }}>
                {heading}
              </p>
              <p
                className="text-lg font-semibold mt-1"
                style={{ color: V3.text }}
              >
                {formatVisitDate(visit.appointment_date, lang)}
              </p>
              <p className="text-sm mt-1" style={{ color: V3.muted }}>
                {collapseDoublePeriod(
                  fillTemplate(ct.successArrive, {
                    time: formatVisitTime(visit.appointment_time, lang),
                  }),
                )}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                <Link
                  to={`/book/${encodeURIComponent(visit.booking_token)}`}
                  aria-label={`${ct.successChange}: ${heading}`}
                  className="text-sm font-semibold"
                  style={{
                    color: V3.primary,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  {ct.successChange}
                </Link>
                <a
                  href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visit-calendar?token=${encodeURIComponent(visit.booking_token)}`}
                  aria-label={`${ct.successCalendar}: ${heading}`}
                  className="text-sm font-semibold"
                  style={{
                    color: V3.primary,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  {ct.successCalendar}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="pt-6 mt-6"
        style={{ borderTop: `1px solid ${V3.border}` }}
      >
        <p className="v3-eyebrow mb-2">{ct.successWhere}</p>
        <p className="text-base mb-1" style={{ color: V3.text }}>
          {ADDRESS}
        </p>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold"
          style={{
            color: V3.primary,
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {ct.successMaps}
        </a>
      </div>

      <div
        className="pt-6 mt-6"
        style={{ borderTop: `1px solid ${V3.border}` }}
      >
        <p className="v3-eyebrow mb-2">{ct.successExpectHeading}</p>
        <p className="text-sm" style={{ color: V3.muted }}>
          {ct.successExpectBody}
        </p>
      </div>

      <p className="text-sm mt-6" style={{ color: V3.muted }}>
        {fillTemplate(ct.successEmailNote, { email })}
      </p>
      <a
        href="tel:+14086200252"
        className="text-sm font-semibold block mt-2"
        style={{ color: V3.primary }}
      >
        {ct.successCall}
      </a>
    </div>
  );
}
