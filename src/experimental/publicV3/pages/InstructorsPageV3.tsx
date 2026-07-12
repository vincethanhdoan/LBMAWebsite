import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { V3 } from '../design';

const INSTRUCTORS = [
  {
    name: 'Head Instructor',
    role: 'ERWCMAA Certified · 2nd Degree Black Belt',
    bio: 'A lifelong martial artist and ERWCMAA certified instructor. Trained directly under the ERWCMAA system for over 15 years and has been teaching at LBMAA since it opened. Known for patience and the ability to connect with students of all ages.',
    photo: '/photos/59-_MG_4959.jpg',
    photoAlt: 'LBMAA head instructor',
  },
  {
    name: 'Youth Instructor',
    role: 'ERWCMAA Certified · 1st Degree Black Belt',
    bio: 'Specializes in our Little Dragons and Junior programs. Has a background in child development and brings genuine enthusiasm to every class. Students and parents consistently describe classes with this instructor as their child\'s favorite part of the week.',
    photo: '/photos/42-IMG_5020.jpg',
    photoAlt: 'LBMAA youth instructor with students',
  },
];

const CERTIFICATIONS = [
  'ERWCMAA Certified Instructor',
  'Background Checked',
  'CPR & First Aid Certified',
  'Child Safety Training',
  'World Chun Woo Martial Arts Curriculum',
];

export function InstructorsPageV3() {
  return (
    <div>

      {/* ── PAGE HERO ── */}
      <section className="py-20" style={{ backgroundColor: V3.surface, borderBottom: `1px solid ${V3.border}` }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Our Instructors</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            People Who Know Your Child's Name
          </h1>
          <p className="text-base leading-relaxed max-w-xl" style={{ color: V3.muted }}>
            Small class sizes mean our instructors actually know every student — not just their
            face, but their personality, their struggles, and what motivates them.
          </p>
        </div>
      </section>

      {/* ── INSTRUCTORS ── */}
      {INSTRUCTORS.map((inst, idx) => (
        <section
          key={inst.name}
          className="py-24"
          style={{
            backgroundColor: idx % 2 === 0 ? 'white' : V3.surface,
            borderBottom: `1px solid ${V3.border}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div
              className={`grid md:grid-cols-2 gap-14 items-center max-w-5xl mx-auto ${
                idx % 2 === 1 ? 'md:[&>*:first-child]:order-last' : ''
              }`}
            >
              <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                <ImageWithFallback
                  src={inst.photo}
                  alt={inst.photoAlt}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2
                  className="v3-h font-black leading-tight mb-1"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', color: V3.text }}
                >
                  {inst.name}
                </h2>
                <p className="text-sm font-semibold mb-5" style={{ color: V3.primary }}>
                  {inst.role}
                </p>
                <p className="text-[0.95rem] leading-relaxed" style={{ color: V3.muted }}>
                  {inst.bio}
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── CERTIFICATIONS ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-3xl">
            <p className="v3-eyebrow mb-4">Instructor Standards</p>
            <h2
              className="v3-h font-black leading-[1.0] mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: V3.text }}
            >
              Every Instructor at LBMAA Is:
            </h2>
            <p className="text-sm leading-relaxed mb-10" style={{ color: V3.muted }}>
              We hold our instructors to the highest standards — because the people who teach
              your child should be the best in their field.
            </p>
            <div className="flex flex-col gap-4">
              {CERTIFICATIONS.map((cert, i) => (
                <div
                  key={cert}
                  className="flex items-center gap-5"
                  style={{ paddingTop: i > 0 ? '1rem' : 0, borderTop: i > 0 ? `1px solid ${V3.border}` : 'none' }}
                >
                  <span
                    className="v3-h text-2xl font-black flex-shrink-0"
                    style={{ color: V3.primary, minWidth: '2rem' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-base font-semibold" style={{ color: V3.text }}>
                    {cert}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
