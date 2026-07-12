import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { BASE, V3 } from './design';
import { useLanguage } from './lang';

const PROGRAM_PHOTOS = [
  '/photos/29-IMG_5072.jpg',
  '/photos/1-_MG_5182.jpg',
  '/photos/ep-team-dojo.jpg',
];

const STUDENT_PHOTOS = [
  '/photos/IMG_1361.jpg',
  '/photos/IMG_1366.jpg',
  '/photos/IMG_1368.jpg',
  '/photos/IMG_1374.jpg',
  '/photos/IMG_1378.jpg',
  '/photos/IMG_1380.jpg',
  '/photos/IMG_1387.jpg',
  '/photos/IMG_1389.jpg',
  '/photos/IMG_1393.jpg',
  '/photos/IMG_1395.jpg',
  '/photos/IMG_1399.jpg',
  '/photos/IMG_1403.jpg',
];

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const h = t.home;
  const c = t.common;

  return (
    <div>
      {/* ── HERO ── */}
      <section
        className="relative flex flex-col"
        style={{ minHeight: 'max(calc(100svh - 72px), 520px)' }}
      >
        <ImageWithFallback
          src="/photos/class-synchronized.jpg"
          alt="Los Banos Martial Arts Academy"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 70%' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(110deg, oklch(11% 0.018 30 / 0.95) 0%, oklch(11% 0.018 30 / 0.78) 48%, oklch(11% 0.018 30 / 0.18) 100%)',
          }}
        />

        <div className="relative flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-20 w-full">
            <div style={{ maxWidth: '580px' }}>
              <div
                style={{
                  width: '36px',
                  height: '3px',
                  backgroundColor: V3.primary,
                  marginBottom: '20px',
                }}
              />

              <h1
                className="v3-h font-black mb-6"
                style={{
                  fontSize: 'clamp(3.25rem, 7.5vw, 5.75rem)',
                  color: 'oklch(97% 0.004 30)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.02em',
                }}
              >
                {h.heroHeading1}
                <br />
                {h.heroHeading2}
                <br />
                <span style={{ color: V3.primary }}>{h.heroHeading3}</span>
              </h1>

              <p
                className="leading-relaxed mb-8"
                style={{
                  color: 'oklch(82% 0.007 30)',
                  maxWidth: '42ch',
                  fontSize: '1rem',
                }}
              >
                {h.heroSub}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  className="v3-btn-primary"
                  onClick={() => navigate(`${BASE}/contact`)}
                >
                  {c.bookTrial}
                </button>
                <button
                  className="v3-btn-ghost"
                  onClick={() => navigate(`${BASE}/programs`)}
                >
                  {h.explorePrograms}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div
            className="grid md:grid-cols-2 gap-12 items-center"
            style={{ maxWidth: '1040px', margin: '0 auto' }}
          >
            <div>
              <p className="v3-eyebrow mb-5">{h.aboutEyebrow}</p>
              <h2
                className="v3-h font-black mb-6"
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  color: V3.text,
                  lineHeight: 1.0,
                  letterSpacing: '-0.015em',
                }}
              >
                {h.aboutHeading1}
                <br />
                {h.aboutHeading2}
                <br />
                <span style={{ color: V3.primary }}>{h.aboutHeading3}</span>
              </h2>
              <p
                className="leading-relaxed mb-4"
                style={{
                  color: V3.muted,
                  fontSize: '0.95rem',
                  maxWidth: '50ch',
                }}
              >
                {h.aboutP1}
              </p>
              <p
                className="leading-relaxed mb-8"
                style={{
                  color: V3.muted,
                  fontSize: '0.95rem',
                  maxWidth: '50ch',
                }}
              >
                {h.aboutP2}
              </p>
              <button
                onClick={() => navigate(`${BASE}/about`)}
                className="v3-h font-bold uppercase tracking-wide text-sm"
                style={{ color: V3.primary, letterSpacing: '0.08em' }}
              >
                {h.aboutLink}
              </button>
            </div>

            <div
              className="rounded-xl overflow-hidden bg-gray-100 order-first md:order-last"
              style={{ aspectRatio: '4/5' }}
            >
              <ImageWithFallback
                src="/photos/kjn-guerra-portrait.jpg"
                alt="LBMAA instructor with students"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FIRST VISIT ── */}
      <section className="py-20" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <div
              style={{
                width: '36px',
                height: '3px',
                backgroundColor: V3.primary,
                marginBottom: '20px',
              }}
            />
            <p className="v3-eyebrow mb-5">{h.firstVisitEyebrow}</p>
            <h2
              className="v3-h font-black mb-16"
              style={{
                fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)',
                color: V3.text,
                lineHeight: 1.0,
                letterSpacing: '-0.015em',
              }}
            >
              {h.firstVisitHeading}
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '48px',
              }}
            >
              {[
                { n: '01', title: h.step01Title, body: h.step01Body },
                { n: '02', title: h.step02Title, body: h.step02Body },
                { n: '03', title: h.step03Title, body: h.step03Body },
              ].map((step) => (
                <div key={step.n} style={{ position: 'relative' }}>
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: '-0.2em',
                      left: '-0.05em',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 900,
                      fontSize: 'clamp(5rem, 9vw, 7rem)',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                      color: V3.primary,
                      opacity: 0.07,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    {step.n}
                  </span>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        letterSpacing: '0.2em',
                        color: V3.primary,
                        marginBottom: '12px',
                      }}
                    >
                      {step.n}
                    </span>
                    <h3
                      className="v3-h font-black mb-3"
                      style={{
                        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                        color: V3.text,
                        lineHeight: 1.0,
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: '1rem',
                        lineHeight: 1.65,
                        color: V3.muted,
                        maxWidth: '36ch',
                      }}
                    >
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STUDENT CAROUSEL ── */}
      <div
        className="v3-student-carousel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'oklch(10% 0.012 28)',
          height: '220px',
        }}
      >
        <div className="v3-student-track">
          {[...STUDENT_PHOTOS, ...STUDENT_PHOTOS].map((src, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: '165px',
                height: '220px',
                marginRight: '6px',
                overflow: 'hidden',
              }}
            >
              <ImageWithFallback
                src={src}
                alt="LBMAA student"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 12%',
                }}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(to right, oklch(10% 0.012 28) 0%, transparent 8%, transparent 92%, oklch(10% 0.012 28) 100%)',
          }}
        />
      </div>

      {/* ── PROGRAMS ── */}
      <section
        style={{
          backgroundColor: 'white',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div
            className="flex items-end justify-between mb-8"
            style={{ maxWidth: '1040px', margin: '0 auto 32px' }}
          >
            <div>
              <p className="v3-eyebrow mb-3">{h.programsEyebrow}</p>
              <h2
                className="v3-h font-black"
                style={{
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)',
                  color: V3.text,
                  lineHeight: 1.0,
                }}
              >
                {h.programsHeading}
              </h2>
            </div>
            <button
              onClick={() => navigate(`${BASE}/programs`)}
              className="v3-h font-bold uppercase tracking-wide hidden md:block flex-shrink-0 ml-8 text-sm"
              style={{ color: V3.primary, letterSpacing: '0.08em' }}
            >
              {c.viewAll}
            </button>
          </div>

          {/* Photo panels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              height: '460px',
              maxWidth: '1040px',
              margin: '0 auto',
            }}
          >
            {h.programs.map((p, idx) => (
              <div
                key={p.name}
                className="relative overflow-hidden"
                style={{ borderRadius: '10px' }}
              >
                <ImageWithFallback
                  src={PROGRAM_PHOTOS[idx]}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, oklch(10% 0.016 28 / 0.93) 0%, oklch(10% 0.016 28 / 0.45) 45%, transparent 70%)',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: V3.primary,
                      backgroundColor: 'oklch(97% 0.011 20)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      marginBottom: '8px',
                    }}
                  >
                    {p.ages}
                  </span>
                  <h3
                    className="v3-h font-black mb-2"
                    style={{
                      fontSize: 'clamp(1.3rem, 2vw, 1.65rem)',
                      color: 'oklch(97% 0.004 30)',
                      lineHeight: 1.05,
                    }}
                  >
                    {p.name}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: '0.8rem',
                      lineHeight: 1.55,
                      color: 'oklch(78% 0.007 30)',
                    }}
                  >
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon strips */}
          <div
            style={{
              maxWidth: '1040px',
              margin: '6px auto 0',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
            }}
          >
            {h.comingSoon.map((p) => (
              <div
                key={p.name}
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'oklch(22% 0.014 30)',
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
                      color: 'oklch(74% 0.11 54)',
                      backgroundColor: 'oklch(74% 0.11 54 / 0.14)',
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
                      color: 'oklch(52% 0.007 30)',
                      backgroundColor: 'oklch(29% 0.012 30)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {p.ages}
                  </span>
                </div>
                <h3
                  className="v3-h font-black mb-2"
                  style={{
                    fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)',
                    color: 'oklch(72% 0.005 30)',
                    lineHeight: 1.05,
                  }}
                >
                  {p.name}
                </h3>
                <p
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: '0.78rem',
                    lineHeight: 1.55,
                    color: 'oklch(46% 0.007 30)',
                  }}
                >
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-6 md:hidden"
            style={{ maxWidth: '1040px', margin: '24px auto 0' }}
          >
            <button
              onClick={() => navigate(`${BASE}/programs`)}
              className="v3-h font-bold uppercase tracking-wide text-sm"
              style={{ color: V3.primary, letterSpacing: '0.08em' }}
            >
              {c.viewAllPrograms}
            </button>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section style={{ backgroundColor: V3.surface, padding: '72px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <div style={{ marginBottom: '36px' }}>
              <p className="v3-eyebrow mb-3">{h.valuesEyebrow}</p>
              <h2
                className="v3-h font-black"
                style={{
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)',
                  color: V3.text,
                  lineHeight: 1.0,
                  letterSpacing: '-0.015em',
                }}
              >
                {h.valuesHeading}
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
              }}
            >
              {h.values.map((v, i) => (
                <div
                  key={v.label}
                  onMouseEnter={() => setHoveredValue(i)}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '10px',
                    backgroundColor: [
                      'oklch(20% 0.014 30)',
                      'oklch(23% 0.015 30)',
                      'oklch(18% 0.013 28)',
                      'oklch(25% 0.014 32)',
                    ][i],
                    padding: '36px 28px 32px',
                    cursor: 'default',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    transition: 'transform 0.2s ease',
                    transform: hoveredValue === i ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: '-0.15em',
                      right: '-0.05em',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 900,
                      fontSize: '10rem',
                      lineHeight: 1,
                      letterSpacing: '-0.06em',
                      color: hoveredValue === i ? V3.primary : 'white',
                      opacity: hoveredValue === i ? 0.12 : 0.06,
                      userSelect: 'none',
                      pointerEvents: 'none',
                      transition: 'color 0.2s ease, opacity 0.2s ease',
                    }}
                  >
                    {v.label[0]}
                  </span>

                  <span
                    style={{
                      display: 'block',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.6rem',
                      letterSpacing: '0.2em',
                      color: V3.primary,
                      marginBottom: '10px',
                    }}
                  >
                    0{i + 1}
                  </span>

                  <p
                    className="v3-h font-black"
                    style={{
                      fontSize: 'clamp(1.9rem, 3vw, 2.6rem)',
                      color: 'oklch(94% 0.005 30)',
                      lineHeight: 1.0,
                      letterSpacing: '-0.025em',
                      marginBottom: '12px',
                    }}
                  >
                    {v.label}
                  </p>

                  <div
                    style={{
                      overflow: 'hidden',
                      maxHeight: hoveredValue === i ? '60px' : '0px',
                      opacity: hoveredValue === i ? 1 : 0,
                      transition: 'max-height 0.3s ease, opacity 0.25s ease',
                    }}
                  >
                    <div
                      style={{
                        height: '2px',
                        width: '24px',
                        backgroundColor: V3.primary,
                        marginBottom: '8px',
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: '0.78rem',
                        lineHeight: 1.55,
                        color: 'oklch(60% 0.008 30)',
                      }}
                    >
                      {v.desc}
                    </p>
                  </div>
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
            <button
              onClick={() => navigate(`${BASE}/contact`)}
              className="v3-btn-white"
            >
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
