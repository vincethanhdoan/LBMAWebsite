import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { CheckCircle2 } from 'lucide-react';
import { BASE, V3 } from '../design';

const PILLARS = [
  {
    num: '01',
    label: 'Physical',
    desc: 'Strength, coordination, and conditioning through structured training.',
  },
  {
    num: '02',
    label: 'Mental',
    desc: 'Focus, discipline, and confidence to set goals and achieve them.',
  },
  {
    num: '03',
    label: 'Spiritual',
    desc: 'Character, integrity, and the inner strength to do what is right.',
  },
  {
    num: '04',
    label: 'Good Character',
    desc: 'Honor, loyalty, family, and bravery in everything we do.',
  },
];

const PROGRAMS = [
  {
    name: 'Little Dragons',
    ages: 'Ages 4–6',
    desc: 'Fun, movement-based classes that build listening, coordination, and early discipline in our youngest students.',
  },
  {
    name: 'Kids Martial Arts',
    ages: 'Ages 7–12',
    desc: 'Structured belt progression and real martial arts skills. Students develop focus, self-discipline, and confidence.',
  },
  {
    name: 'Teens & Adults',
    ages: 'Ages 13+',
    desc: 'Advanced training, leadership, and genuine self-defense. A positive environment during the years it matters most.',
  },
];

const STEPS = [
  {
    step: '01',
    heading: 'Arrive and meet the team',
    body: "You and your child will be greeted by an instructor. We'll answer any questions before class starts.",
  },
  {
    step: '02',
    heading: 'Your child joins the class',
    body: "We pair your child with students at their level. You're welcome to watch from the side — most parents do.",
  },
  {
    step: '03',
    heading: 'Talk to us afterward',
    body: "We'll share what we observed and which program fits best. No pressure to sign up that day.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      'My son has completely changed since joining. He listens better, focuses in school, and actually looks forward to going to class.',
    name: 'Maria G.',
    detail: 'Parent of a 9-year-old',
  },
  {
    quote:
      'The instructors are patient and genuinely care. My daughter went from shy to confident in just a few months.',
    name: 'James T.',
    detail: 'Parent of a 7-year-old',
  },
  {
    quote:
      'We tried another school first. LBMAA is different — it feels like a real community. Best decision we made for our kids.',
    name: 'Priya S.',
    detail: 'Parent of two students',
  },
];

const FILMSTRIP = [
  '/photos/1-_MG_5182.jpg',
  '/photos/5-IMG_5156.jpg',
  '/photos/10-IMG_5137.jpg',
  '/photos/16-IMG_5107.jpg',
  '/photos/17-IMG_5102.jpg',
  '/photos/18-IMG_5097.jpg',
];

export function HomePageV3() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: 'max(60svh, 420px)' }}
      >
        <ImageWithFallback
          src="/photos/33-_MG_5061.jpg"
          alt="Los Banos Martial Arts Academy dojo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(108deg, oklch(14% 0.018 30 / 0.9) 0%, oklch(14% 0.018 30 / 0.65) 55%, oklch(14% 0.018 30 / 0.2) 100%)',
          }}
        />

        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 w-full">
            <div style={{ maxWidth: '520px' }}>
              {/* Heading */}
              <h1
                className="v3-h font-extrabold leading-[0.95] mb-5"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
                  color: 'oklch(96% 0.005 30)',
                  letterSpacing: '-0.01em',
                }}
              >
                Develop Your Child
                <br />
                Physically, Mentally
                <br />
                <span style={{ color: V3.primary }}>&amp; Spiritually.</span>
              </h1>

              {/* Body */}
              <p
                className="text-[0.95rem] leading-relaxed mb-7"
                style={{ color: 'oklch(82% 0.006 30)', maxWidth: '400px' }}
              >
                Safe, structured martial arts for children of all ages in Los
                Banos. Family-run. No pressure. First class is free.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  className="v3-btn-ghost"
                  onClick={() => navigate(`${BASE}/programs`)}
                >
                  See Our Programs
                </button>
              </div>

              {/* Trust note */}
              <p
                style={{
                  color: 'oklch(60% 0.006 30)',
                  fontSize: '0.75rem',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                No commitment · No uniform needed · We'll guide you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLARS BAND ── */}
      <section style={{ backgroundColor: V3.primary }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 md:divide-x"
            style={
              {
                '--tw-divide-opacity': '1',
                borderColor: 'oklch(50% 0.110 20)',
              } as React.CSSProperties
            }
          >
            {PILLARS.map(({ num, label, desc }, i) => (
              <div
                key={num}
                className="md:px-7"
                style={{
                  paddingLeft: i === 0 ? 0 : undefined,
                  paddingRight: i === PILLARS.length - 1 ? 0 : undefined,
                }}
              >
                <div
                  className="v3-h text-2xl font-black mb-1"
                  style={{ color: 'oklch(88% 0.040 20)' }}
                >
                  {num}
                </div>
                <div
                  className="v3-h text-sm font-bold uppercase tracking-wide mb-1.5"
                  style={{ color: 'white' }}
                >
                  {label}
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'oklch(82% 0.035 20)', maxWidth: '170px' }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION SPLIT ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100 order-last md:order-first">
              <ImageWithFallback
                src="/photos/12-IMG_5132.jpg"
                alt="LBMAA instructor with students"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="v3-eyebrow mb-4">Our Mission</p>
              <h2
                className="v3-h font-black leading-[1.0] mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: V3.text }}
              >
                Impact and Empower Through Martial Arts
              </h2>
              <p
                className="leading-relaxed mb-5 text-[0.95rem]"
                style={{ color: V3.muted }}
              >
                LBMAA is part of the World Chun Woo Martial Arts system — a
                comprehensive mixed martial arts curriculum incorporating
                Taekwondo, boxing, kickboxing, grappling, and Filipino stick
                fighting.
              </p>
              <p
                className="leading-relaxed mb-8 text-[0.95rem]"
                style={{ color: V3.muted }}
              >
                Our goal is simple: develop Black Belts in life. Students who
                carry discipline, character, and confidence into everything they
                do — on and off the mat.
              </p>
              <button
                onClick={() => navigate(`${BASE}/about`)}
                className="v3-h font-bold text-sm uppercase tracking-wide transition-colors"
                style={{ color: V3.primary, letterSpacing: '0.08em' }}
              >
                Our story →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROGRAMS — Editorial rows ── */}
      <section className="py-24" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-start max-w-5xl mx-auto">
            {/* Left: heading */}
            <div className="md:col-span-2">
              <p className="v3-eyebrow mb-4">Our Programs</p>
              <h2
                className="v3-h font-black leading-[1.0] mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: V3.text }}
              >
                Training for Every Stage of Life
              </h2>
              <p
                className="text-[0.9rem] leading-relaxed mb-8"
                style={{ color: V3.muted }}
              >
                Every program is age-appropriate and taught by ERWCMAA-certified
                instructors who know every student by name.
              </p>
              <button
                onClick={() => navigate(`${BASE}/programs`)}
                className="v3-h font-bold text-sm uppercase tracking-wide"
                style={{ color: V3.primary, letterSpacing: '0.08em' }}
              >
                View all programs →
              </button>
            </div>

            {/* Right: editorial program rows */}
            <div className="md:col-span-3">
              {PROGRAMS.map((p, i) => (
                <div
                  key={p.name}
                  className="py-6"
                  style={{
                    borderTop: `1px solid ${V3.border}`,
                    ...(i === PROGRAMS.length - 1
                      ? { borderBottom: `1px solid ${V3.border}` }
                      : {}),
                  }}
                >
                  <div className="flex items-baseline gap-3 flex-wrap mb-2">
                    <span
                      className="v3-h text-xl font-bold"
                      style={{ color: V3.text }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="text-[0.65rem] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: V3.primaryBg,
                        color: V3.primary,
                      }}
                    >
                      {p.ages}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: V3.muted }}
                  >
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FIRST VISIT ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-4xl">
            <p className="v3-eyebrow mb-4">Getting Started</p>
            <h2
              className="v3-h font-black leading-[1.0] mb-16"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: V3.text }}
            >
              What to Expect at Your First Visit
            </h2>

            <div className="grid md:grid-cols-3 gap-10 md:gap-6">
              {STEPS.map(({ step, heading, body }) => (
                <div key={step} className="relative">
                  <div
                    className="v3-h font-black leading-none mb-4 select-none"
                    style={{
                      fontSize: '5rem',
                      color: V3.surface,
                      lineHeight: 1,
                    }}
                    aria-hidden="true"
                  >
                    {step}
                  </div>
                  <div
                    className="v3-h text-xl font-bold mb-3 -mt-2"
                    style={{ color: V3.text }}
                  >
                    {heading}
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: V3.muted }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-14">
              <p className="text-sm" style={{ color: V3.muted }}>
                Ready to visit? Find us on the{' '}
                <button
                  onClick={() => navigate(`${BASE}/contact`)}
                  className="underline underline-offset-2 font-semibold"
                  style={{ color: V3.primary }}
                >
                  Contact page
                </button>{' '}
                — first class is free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-6">From LBMAA Families</p>

          {/* Featured quote */}
          <div className="max-w-3xl mb-16">
            <div
              className="v3-h font-black leading-none mb-4 select-none"
              style={{
                fontSize: '7rem',
                color: 'oklch(90% 0.020 20)',
                lineHeight: 0.8,
              }}
              aria-hidden="true"
            >
              "
            </div>
            <blockquote
              className="v3-h font-semibold leading-[1.15] mb-6"
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
                color: V3.text,
              }}
            >
              {TESTIMONIALS[0].quote}
            </blockquote>
            <p className="text-sm font-semibold" style={{ color: V3.primary }}>
              — {TESTIMONIALS[0].name},{' '}
              <span style={{ color: V3.muted, fontWeight: 400 }}>
                {TESTIMONIALS[0].detail}
              </span>
            </p>
          </div>

          {/* Supporting quotes */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
            {TESTIMONIALS.slice(1).map((t) => (
              <div
                key={t.name}
                className="py-6"
                style={{ borderTop: `1px solid ${V3.border}` }}
              >
                <p
                  className="text-base leading-relaxed mb-4 italic"
                  style={{ color: V3.muted }}
                >
                  "{t.quote}"
                </p>
                <p className="text-sm font-semibold" style={{ color: V3.text }}>
                  — {t.name},{' '}
                  <span style={{ color: V3.muted, fontWeight: 400 }}>
                    {t.detail}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <button
              onClick={() => navigate(`${BASE}/reviews`)}
              className="v3-btn-primary"
            >
              Read All Reviews
            </button>
          </div>
        </div>
      </section>

      {/* ── PHOTO FILMSTRIP ── */}
      <section
        className="py-5 overflow-x-auto"
        style={{ backgroundColor: V3.bg }}
      >
        <div className="flex gap-2.5 min-w-max px-6">
          {FILMSTRIP.map((src, i) => (
            <div
              key={i}
              className="w-56 h-40 flex-shrink-0 rounded-lg overflow-hidden"
            >
              <ImageWithFallback
                src={src}
                alt="LBMAA students training"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center max-w-5xl mx-auto">
            <div>
              <p className="v3-eyebrow mb-4">Why LBMAA</p>
              <h2
                className="v3-h font-black leading-[1.0] mb-8"
                style={{
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)',
                  color: V3.text,
                }}
              >
                More Than Martial Arts — It's a Community
              </h2>
              <ul className="flex flex-col gap-4">
                {[
                  'Every instructor knows every student by name',
                  'Background-checked instructors · fully padded facility',
                  'Belt promotions based on skill and character, not a fixed calendar',
                  'Month-to-month · no long-term contracts',
                  'Part of the 40-year ERWCMAA legacy',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: V3.primary }}
                    />
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: V3.muted }}
                    >
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
              <ImageWithFallback
                src="/photos/29-IMG_5072.jpg"
                alt="LBMAA class in session"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
