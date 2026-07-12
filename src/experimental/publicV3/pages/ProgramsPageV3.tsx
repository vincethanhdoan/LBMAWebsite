import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { CheckCircle2 } from 'lucide-react';
import { BASE, V3 } from '../design';

const PROGRAMS = [
  {
    name: 'Kids Martial Arts',
    ages: 'Ages 4–12',
    summary:
      'Our flagship program combines Taekwondo, boxing, and kickboxing into a structured, age-appropriate curriculum with two class tracks: Little Dragons (4–6) and Juniors (7–12).',
    highlights: [
      'Age-split classes: Little Dragons (4–6) and Juniors (7–12)',
      'Clear belt progression with defined skill standards',
      'Emphasis on focus, respect, and self-control',
      'Anti-bullying principles woven throughout',
      'Small class sizes for individual attention',
    ],
    photo: '/photos/42-IMG_5020.jpg',
    photoAlt: 'Kids martial arts class at LBMAA',
    photoRight: false,
  },
  {
    name: 'Teens & Adults',
    ages: 'Ages 13+',
    summary:
      'Advanced training for teens and adults in a high-energy, welcoming environment. The curriculum includes striking, grappling, and Filipino stick fighting with a strong emphasis on leadership and real-world self-defense.',
    highlights: [
      'Full WCWMA mixed martial arts curriculum',
      'Fitness conditioning built into every session',
      'Clear path toward Black Belt and beyond',
      'Leadership and mentorship opportunities',
      'All experience levels welcome',
    ],
    photo: '/photos/50-IMG_4978.jpg',
    photoAlt: 'Adult martial arts training at LBMAA',
    photoRight: true,
  },
  {
    name: 'Kickboxing Fitness',
    ages: 'All Ages',
    summary:
      'A high-energy fitness class combining kickboxing fundamentals with cardio conditioning. No martial arts background required — just show up ready to move.',
    highlights: [
      'No prior experience needed',
      'Full-body cardio workout every class',
      'Real kickboxing technique instruction',
      'Supportive group atmosphere',
      'Flexible scheduling',
    ],
    photo: '/photos/55-IMG_4969.jpg',
    photoAlt: 'Kickboxing fitness class at LBMAA',
    photoRight: false,
  },
];

const BELT_RANKS = [
  { belt: 'White', color: '#f9f8f5', border: '#c9c4bc' },
  { belt: 'Yellow', color: '#fef08a', border: '#ca8a04' },
  { belt: 'Orange', color: '#fed7aa', border: '#ea580c' },
  { belt: 'Green', color: '#bbf7d0', border: '#16a34a' },
  { belt: 'Blue', color: '#bfdbfe', border: '#2563eb' },
  { belt: 'Purple', color: '#e9d5ff', border: '#9333ea' },
  { belt: 'Red', color: '#fecaca', border: '#dc2626' },
  { belt: 'Red/Black', color: '#fecaca', border: '#1f2937' },
  { belt: 'Brown', color: '#d6b899', border: '#92400e' },
  { belt: 'Brown/Black', color: '#d6b899', border: '#1f2937' },
  { belt: 'Black Belt', color: '#1f2937', border: '#1f2937' },
  { belt: 'Dan Ranks', color: '#1f2937', border: '#A01F23' },
];

export function ProgramsPageV3() {
  const navigate = useNavigate();
  const goToTrial = () => navigate(`${BASE}/contact`);

  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section
        className="py-20"
        style={{
          backgroundColor: V3.surface,
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Our Programs</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            Training for Every Stage of Life
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            From our youngest Little Dragons to adult black belt candidates —
            every program is built around what students at that stage actually
            need.
          </p>
        </div>
      </section>

      {/* ── PROGRAM DETAILS ── */}
      {PROGRAMS.map((p, idx) => (
        <section
          key={p.name}
          className="py-24"
          style={{
            backgroundColor: idx % 2 === 0 ? 'white' : V3.surface,
            borderBottom: `1px solid ${V3.border}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div
              className={`grid md:grid-cols-2 gap-14 items-center max-w-5xl mx-auto ${
                p.photoRight ? '' : 'md:[&>*:first-child]:order-last'
              }`}
            >
              {/* Photo */}
              <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                <ImageWithFallback
                  src={p.photo}
                  alt={p.photoAlt}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div>
                <span
                  className="inline-block text-[0.65rem] font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-5"
                  style={{ backgroundColor: V3.primaryBg, color: V3.primary }}
                >
                  {p.ages}
                </span>
                <h2
                  className="v3-h font-black leading-[1.0] mb-4"
                  style={{
                    fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                    color: V3.text,
                  }}
                >
                  {p.name}
                </h2>
                <p
                  className="text-[0.95rem] leading-relaxed mb-7"
                  style={{ color: V3.muted }}
                >
                  {p.summary}
                </p>
                <ul className="flex flex-col gap-3 mb-8">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: V3.primary }}
                      />
                      <span
                        className="text-sm leading-relaxed"
                        style={{ color: V3.muted }}
                      >
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
                <button className="v3-btn-primary" onClick={goToTrial}>
                  Book a Free Trial
                </button>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── BELT SYSTEM ── */}
      <section className="py-24" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-4xl">
            <p className="v3-eyebrow mb-4">Belt System</p>
            <h2
              className="v3-h font-black leading-[1.0] mb-4"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                color: V3.text,
              }}
            >
              Your Path to Black Belt
            </h2>
            <p
              className="text-sm leading-relaxed mb-12 max-w-lg"
              style={{ color: V3.muted }}
            >
              Every promotion is earned — based on demonstrated skill, effort,
              and character. Students test when their instructor says they're
              ready, not on a fixed schedule.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {BELT_RANKS.map(({ belt, color, border }) => (
                <div
                  key={belt}
                  className="rounded-lg p-3 text-center"
                  style={{
                    backgroundColor: 'white',
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
                    {belt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
