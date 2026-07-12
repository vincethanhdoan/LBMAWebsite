import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { V3 } from '../design';

const VALUES = [
  {
    label: 'Honor',
    desc: 'Integrity in everything we do, on and off the mat.',
  },
  {
    label: 'Loyalty',
    desc: 'Standing by your school, your instructors, and your fellow students.',
  },
  {
    label: 'Family',
    desc: 'Our academy is a community — every student belongs here.',
  },
  { label: 'Bravery', desc: 'The courage to try, to fail, and to keep going.' },
];

const FOUNDERS = [
  {
    name: 'Grandmaster Ernie Reyes Sr.',
    role: 'ERWCMAA Founder',
    bio: 'World-renowned martial arts champion, actor, and stunt coordinator. Grandmaster Reyes founded the ERWCMAA system to share the transformative power of martial arts with communities everywhere. His system has trained champions on the world stage for over 40 years.',
  },
  {
    name: 'Master Tony Thompson',
    role: 'ERWCMAA Co-Founder',
    bio: 'Master Thompson co-founded the ERWCMAA system and has dedicated his life to spreading the martial arts philosophy of developing the whole person — physically, mentally, and spiritually. His teaching methods form the foundation of every ERWCMAA-affiliated school.',
  },
];

const PURPOSES = [
  {
    num: '01',
    label: 'Physical',
    desc: 'Strength, coordination, flexibility, and conditioning through structured martial arts training.',
  },
  {
    num: '02',
    label: 'Mental',
    desc: 'Focus, discipline, and the confidence to set goals and achieve them.',
  },
  {
    num: '03',
    label: 'Spiritual',
    desc: 'Character, integrity, and the inner strength to do what is right.',
  },
  {
    num: '04',
    label: 'Good Character',
    desc: 'We develop the whole person — not just a martial artist, but a leader in life.',
  },
];

export function AboutPageV3() {
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
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <p className="v3-eyebrow mb-4">About LBMAA</p>
              <h1
                className="v3-h font-black leading-[1.0] mb-6"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  color: V3.text,
                }}
              >
                A School That Feels Like Family
              </h1>
              <p
                className="text-base leading-relaxed"
                style={{ color: V3.muted }}
              >
                Los Banos Martial Arts Academy is an ERWCMAA-affiliated school
                built around one belief: that every student deserves a place
                where they feel safe, challenged, and supported. We know every
                student by name.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
              <ImageWithFallback
                src="/photos/34-IMG_5055.jpg"
                alt="LBMAA dojo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION QUOTE ── */}
      <section className="py-20" style={{ backgroundColor: V3.primary }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] mb-6"
            style={{
              color: 'oklch(85% 0.055 20)',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Our Mission
          </p>
          <blockquote
            className="v3-h font-black leading-[1.05]"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: 'white' }}
          >
            "Impact and Empower Through Martial Arts — Developing Black Belts in
            Life"
          </blockquote>
        </div>
      </section>

      {/* ── FOUR PILLARS ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">What We Develop</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-16"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            Our Four Pillars
          </h2>
          <div className="grid md:grid-cols-4 gap-0 max-w-5xl">
            {PURPOSES.map(({ num, label, desc }, i) => (
              <div
                key={num}
                className="py-6 pr-8"
                style={{
                  borderTop: `2px solid ${i === 0 ? V3.primary : V3.border}`,
                }}
              >
                <div
                  className="v3-h text-4xl font-black mb-3"
                  style={{ color: V3.surface }}
                >
                  {num}
                </div>
                <h3
                  className="v3-h text-xl font-bold mb-3"
                  style={{ color: V3.text }}
                >
                  {label}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: V3.muted }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="py-24" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center max-w-5xl mx-auto">
            <div>
              <p className="v3-eyebrow mb-4">Our Story</p>
              <h2
                className="v3-h font-black leading-[1.0] mb-6"
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  color: V3.text,
                }}
              >
                Built for the Community
              </h2>
              <div
                className="flex flex-col gap-4 text-[0.95rem] leading-relaxed"
                style={{ color: V3.muted }}
              >
                <p>
                  LBMAA is part of the Ernie Reyes World Combat Martial Arts
                  Association (ERWCMAA) — an organization that has trained
                  champions for over 40 years. Our curriculum is built on the
                  World Chun Woo Martial Arts (WCWMA) system.
                </p>
                <p>
                  Our instructors aren't just skilled martial artists. They're
                  mentors who understand students — how to challenge them
                  without discouraging them, and how to make every student feel
                  like they belong.
                </p>
                <p>
                  Whether your child needs a confidence boost, more focus, or
                  just something positive to be part of — we meet them where
                  they are.
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
              <ImageWithFallback
                src="/photos/59-_MG_4959.jpg"
                alt="LBMAA training floor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Core Values</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-16"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            What We Teach Every Day
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl">
            {VALUES.map(({ label, desc }) => (
              <div key={label}>
                <div
                  className="v3-h text-5xl font-black mb-3 leading-none"
                  style={{ color: V3.primary }}
                >
                  {label[0]}
                </div>
                <h3
                  className="v3-h text-xl font-bold mb-2"
                  style={{ color: V3.text }}
                >
                  {label}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: V3.muted }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDERS ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Our Foundation</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-12"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            Built on a Legacy of Excellence
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
            {FOUNDERS.map(({ name, role, bio }) => (
              <div
                key={name}
                className="p-7 rounded-xl"
                style={{
                  backgroundColor: V3.surface,
                  border: `1px solid ${V3.border}`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: V3.primaryBg }}
                >
                  <span
                    className="v3-h text-xl font-black"
                    style={{ color: V3.primary }}
                  >
                    {name.split(' ').pop()![0]}
                  </span>
                </div>
                <h3
                  className="v3-h text-xl font-bold mb-1"
                  style={{ color: V3.text }}
                >
                  {name}
                </h3>
                <p
                  className="text-sm font-semibold mb-4"
                  style={{ color: V3.primary }}
                >
                  {role}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: V3.muted }}
                >
                  {bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AFFILIATION ── */}
      <section
        className="py-10"
        style={{
          backgroundColor: V3.surface,
          borderTop: `1px solid ${V3.border}`,
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <img
              src="/logo.png"
              alt="ERWCMAA Logo"
              className="h-14 w-auto flex-shrink-0"
            />
            <div>
              <h3
                className="v3-h text-lg font-bold mb-1"
                style={{ color: V3.text }}
              >
                Ernie Reyes World Combat Martial Arts Association
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: V3.muted }}
              >
                LBMAA is proudly affiliated with the ERWCMAA — one of the most
                respected martial arts organizations in the world. Our
                curriculum, standards, and instructor certifications are backed
                by 40+ years of proven excellence.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
