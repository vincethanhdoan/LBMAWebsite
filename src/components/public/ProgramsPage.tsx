import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { CheckCircle2 } from 'lucide-react';
import { BASE, V3 } from './design';
import { useLanguage } from './lang';

const PROGRAM_VISUAL = [
  {
    photo: '/photos/29-IMG_5072.jpg',
    photoAlt: 'Little Dragons class at LBMAA',
    photoRight: false,
    dark: false,
  },
  {
    photo: '/photos/youth-class.jpg',
    photoAlt: 'Youth martial arts class at LBMAA',
    photoRight: true,
    dark: false,
  },
  {
    photo: '/photos/ep-team-dojo.jpg',
    photoAlt: 'Extreme Performance team at LBMAA',
    photoRight: false,
    dark: true,
  },
];

const BELT_VISUAL = [
  { color: '#f9f8f5', border: '#c9c4bc' },
  { color: '#fef08a', border: '#ca8a04' },
  { color: '#fed7aa', border: '#ea580c' },
  { color: '#bbf7d0', border: '#16a34a' },
  { color: '#bfdbfe', border: '#2563eb' },
  { color: '#e9d5ff', border: '#9333ea' },
  { color: '#fecaca', border: '#dc2626' },
  { color: '#fecaca', border: '#1f2937' },
  { color: '#d6b899', border: '#92400e' },
  { color: '#d6b899', border: '#1f2937' },
  { color: '#1f2937', border: '#1f2937' },
  { color: '#1f2937', border: '#A01F23' },
];

export function ProgramsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const goToTrial = () => navigate(`${BASE}/contact`);

  const p = t.programs;
  const c = t.common;

  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section
        className="py-16"
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <p className="v3-eyebrow mb-4">{p.eyebrow}</p>
            <h1
              className="v3-h font-black leading-[1.0] mb-6"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
            >
              {p.heading}
            </h1>
            <p
              className="text-base leading-relaxed"
              style={{ color: V3.muted, maxWidth: '52ch' }}
            >
              {p.subheading}
            </p>
          </div>
        </div>
      </section>

      {/* ── PHOTO STRIP ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr 0.9fr 1.2fr',
          height: '260px',
          gap: '3px',
          backgroundColor: V3.border,
        }}
      >
        {[
          { src: '/photos/42-IMG_5020.jpg', alt: 'Kids martial arts class' },
          { src: '/photos/20-IMG_5092.jpg', alt: 'Martial arts training' },
          { src: '/photos/50-IMG_4978.jpg', alt: 'Adult training class' },
          { src: '/photos/59-_MG_4959.jpg', alt: 'Training floor' },
        ].map(({ src, alt }) => (
          <div
            key={src}
            style={{ overflow: 'hidden', backgroundColor: V3.border }}
          >
            <ImageWithFallback
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* ── PROGRAM DETAILS ── */}
      {p.programs.map((prog, idx) => {
        const vis = PROGRAM_VISUAL[idx];
        const sectionBg = vis.dark ? V3.dark : idx === 0 ? V3.surface : 'white';
        const borderCol = vis.dark ? V3.borderDark : V3.border;
        const headingCol = vis.dark ? V3.onDark : V3.text;
        const bodyCol = vis.dark ? V3.mutedOnDark : V3.muted;
        const photoBgCol = vis.dark ? 'oklch(30% 0.014 30)' : V3.border;
        const ageBadgeBg = vis.dark ? 'oklch(30% 0.016 28)' : V3.primaryBg;
        const ageBadgeCol = vis.dark ? V3.onDark : V3.primary;

        return (
          <section
            key={prog.name}
            className="py-20"
            style={{
              backgroundColor: sectionBg,
              borderBottom: `1px solid ${borderCol}`,
            }}
          >
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div
                className={`grid md:grid-cols-2 gap-14 items-center max-w-5xl mx-auto ${
                  vis.photoRight ? '' : 'md:[&>*:first-child]:order-last'
                }`}
              >
                <div
                  className="rounded-xl overflow-hidden aspect-[4/3]"
                  style={{ backgroundColor: photoBgCol }}
                >
                  <ImageWithFallback
                    src={vis.photo}
                    alt={vis.photoAlt}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <span
                    className="inline-block text-[0.65rem] font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-5"
                    style={{ backgroundColor: ageBadgeBg, color: ageBadgeCol }}
                  >
                    {prog.ages}
                  </span>
                  <h2
                    className="v3-h font-black leading-[1.0] mb-4"
                    style={{
                      fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                      color: headingCol,
                    }}
                  >
                    {prog.name}
                  </h2>
                  <p
                    className="text-[0.95rem] leading-relaxed mb-7"
                    style={{ color: bodyCol }}
                  >
                    {prog.summary}
                  </p>
                  <ul className="flex flex-col gap-3 mb-8">
                    {prog.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-3">
                        <CheckCircle2
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: V3.primary }}
                        />
                        <span
                          className="text-sm leading-relaxed"
                          style={{ color: bodyCol }}
                        >
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {idx !== 2 && (
                    <button className="v3-btn-primary" onClick={goToTrial}>
                      {c.bookTrial}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── COMING SOON ── */}
      <section
        className="py-16"
        style={{
          backgroundColor: V3.surface,
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <p className="v3-eyebrow mb-3">{p.expandingEyebrow}</p>
            <h2
              className="v3-h font-black mb-8"
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                color: V3.text,
                lineHeight: 1.0,
              }}
            >
              {p.expandingHeading}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {p.comingSoon.map((cs) => (
                <div
                  key={cs.name}
                  style={{
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    border: `1px solid ${V3.border}`,
                    padding: '28px 32px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        color: 'oklch(42% 0.12 55)',
                        backgroundColor: 'oklch(92% 0.06 65)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {c.comingSoon}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        color: V3.muted,
                        backgroundColor: V3.surface,
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {cs.ages}
                    </span>
                  </div>
                  <h3
                    className="v3-h font-black mb-2"
                    style={{
                      fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)',
                      color: V3.muted,
                      lineHeight: 1.05,
                    }}
                  >
                    {cs.name}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: '0.85rem',
                      lineHeight: 1.55,
                      color: 'oklch(65% 0.008 35)',
                    }}
                  >
                    {cs.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BELT SYSTEM ── */}
      <section
        className="py-16"
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-4xl">
            <p className="v3-eyebrow mb-4">{p.beltEyebrow}</p>
            <h2
              className="v3-h font-black leading-[1.0] mb-4"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                color: V3.text,
              }}
            >
              {p.beltHeading}
            </h2>
            <p
              className="text-sm leading-relaxed mb-8 max-w-lg"
              style={{ color: V3.muted }}
            >
              {p.beltBody}
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {BELT_VISUAL.map(({ color, border }, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 text-center"
                  style={{
                    backgroundColor: V3.surface,
                    border: `1px solid ${V3.border}`,
                  }}
                >
                  <div
                    className="w-8 h-2 rounded-full mx-auto mb-2.5"
                    style={{
                      backgroundColor: color,
                      border: `2px solid ${border}`,
                    }}
                  />
                  <p
                    className="text-xs font-semibold leading-tight"
                    style={{ color: V3.muted }}
                  >
                    {p.beltRanks[idx]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ backgroundColor: V3.primary }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div
            style={{ maxWidth: '44ch', margin: '0 auto', textAlign: 'center' }}
          >
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'oklch(84% 0.058 22)',
                marginBottom: '20px',
              }}
            >
              {c.getStarted}
            </p>
            <h2
              className="v3-h font-black mb-5"
              style={{
                fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)',
                color: 'white',
                lineHeight: 1.0,
                letterSpacing: '-0.015em',
              }}
            >
              {c.trialOffer}
            </h2>
            <p
              className="leading-relaxed mb-8"
              style={{ color: 'oklch(88% 0.032 22)', fontSize: '0.95rem' }}
            >
              {c.trialBody}
            </p>
            <button onClick={goToTrial} className="v3-btn-white">
              {c.bookTrial}
            </button>
            <p
              style={{
                marginTop: '20px',
                fontSize: '0.72rem',
                color: 'oklch(76% 0.032 22)',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {c.guideYou}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
