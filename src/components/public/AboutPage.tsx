import { ImageWithFallback } from '../figma/ImageWithFallback';
import { V3 } from './design';
import { useLanguage } from './lang';

const FOUNDER_IMAGES = [
  { image: '/photos/founder-reyes.jpg' },
  { image: '/photos/founder-thompson.jpg' },
];

export function AboutPage() {
  const { t } = useLanguage();
  const a = t.about;

  return (
    <div>
      {/* ── HERO ── */}
      <section
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div
            className="grid md:grid-cols-2 md:items-stretch"
            style={{ minHeight: '500px' }}
          >
            <div className="py-14 md:py-20 flex flex-col justify-center md:pr-14">
              <p className="v3-eyebrow mb-5">{a.eyebrow}</p>
              <h1
                className="v3-h font-black mb-6"
                style={{
                  fontSize: 'clamp(2.75rem, 6vw, 4.75rem)',
                  color: V3.text,
                  lineHeight: 1.05,
                }}
              >
                {a.heading}
              </h1>
              <p
                className="text-base leading-relaxed"
                style={{ color: V3.muted, maxWidth: '38ch' }}
              >
                {a.sub}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl md:rounded-none aspect-[4/3] md:aspect-auto bg-gray-100 mb-14 md:mb-0">
              <ImageWithFallback
                src="/photos/kjn-guerra-with-students.jpg"
                alt="LBMAA students with trophies at the dojo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="py-16" style={{ backgroundColor: V3.primary }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] mb-6"
            style={{
              color: 'oklch(85% 0.055 20)',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {a.missionEyebrow}
          </p>
          <blockquote
            className="v3-h font-black"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              color: 'white',
              lineHeight: 1.1,
            }}
          >
            {a.missionQuote}
          </blockquote>
        </div>
      </section>

      {/* ── TRAINING THE WHOLE PERSON ── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-[1fr_340px] gap-14 items-start max-w-5xl">
            <div>
              <p className="v3-eyebrow mb-4">{a.approachEyebrow}</p>
              <h2
                className="v3-h font-black mb-10"
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  color: V3.text,
                  lineHeight: 1.05,
                }}
              >
                {a.approachHeading}
              </h2>
              {a.pillars.map(({ n, title, body }) => (
                <div
                  key={n}
                  className="py-7 flex gap-6 items-start"
                  style={{ borderTop: `2px solid ${V3.border}` }}
                >
                  <span
                    className="v3-h text-2xl font-black flex-shrink-0"
                    style={{ color: 'oklch(82% 0.009 30)', marginTop: '2px' }}
                  >
                    {n}
                  </span>
                  <div>
                    <h3
                      className="v3-h text-xl font-bold mb-2"
                      style={{ color: V3.text }}
                    >
                      {title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: V3.muted }}
                    >
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl overflow-hidden bg-gray-100"
              style={{ aspectRatio: '3/4' }}
            >
              <ImageWithFallback
                src="/photos/kjn-guerra-portrait.jpg"
                alt="KJN Guerra, LBMAA head instructor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── PHOTO STRIP ── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1.5fr 1fr 1fr',
          height: '300px',
          gap: '3px',
          backgroundColor: V3.surface,
        }}
      >
        {[
          { src: '/photos/1-_MG_5182.jpg', alt: 'Students in class' },
          {
            src: '/photos/students-trophy-dojo.jpg',
            alt: 'LBMAA students with trophies',
          },
          { src: '/photos/59-_MG_4959.jpg', alt: 'LBMAA training floor' },
        ].map(({ src, alt }) => (
          <div key={src} className="overflow-hidden bg-gray-200">
            <ImageWithFallback
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* ── WHAT WE TEACH ── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center max-w-5xl">
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
              <ImageWithFallback
                src="/photos/youth-class.jpg"
                alt="LBMAA class in session"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="v3-eyebrow mb-4">{a.teachEyebrow}</p>
              <h2
                className="v3-h font-black mb-5"
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  color: V3.text,
                  lineHeight: 1.05,
                }}
              >
                {a.teachHeading}
              </h2>
              <p
                className="text-[0.95rem] leading-relaxed mb-7"
                style={{ color: V3.muted }}
              >
                {a.teachBody}
              </p>
              <ul className="grid grid-cols-2 gap-y-2.5 gap-x-6">
                {a.disciplines.map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <span
                      className="flex-shrink-0 rounded-full"
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: V3.primary,
                        marginTop: '6px',
                      }}
                    />
                    <span
                      className="text-sm leading-snug"
                      style={{ color: V3.muted }}
                    >
                      {d}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="py-16" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">{a.valuesEyebrow}</p>
          <h2
            className="v3-h font-black mb-10"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
              lineHeight: 1.05,
            }}
          >
            {a.valuesHeading}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 max-w-5xl">
            {a.values.map(({ label, desc }) => (
              <div
                key={label}
                className="py-7 pr-8"
                style={{ borderTop: `2px solid ${V3.border}` }}
              >
                <h3
                  className="v3-h font-black mb-3"
                  style={{
                    fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                    color: V3.text,
                    lineHeight: 1.1,
                  }}
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

      {/* ── WCWMA HERITAGE ── */}
      <section className="py-16" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-5xl">
            <div className="flex items-center gap-5 mb-8">
              <img
                src="/logo.png"
                alt="WCWMA Logo"
                className="h-12 w-auto flex-shrink-0"
              />
              <div>
                <p className="v3-eyebrow mb-1">{a.foundationEyebrow}</p>
                <h2
                  className="v3-h font-black"
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                    color: V3.text,
                    lineHeight: 1.05,
                  }}
                >
                  {a.foundationHeading}
                </h2>
              </div>
            </div>
            <p
              className="text-[0.95rem] leading-relaxed mb-10 max-w-2xl"
              style={{ color: V3.muted }}
            >
              {a.foundationBody}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {a.founders.map(({ name, role, bio }, i) => (
                <div
                  key={name}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: V3.surface,
                    border: `1px solid ${V3.border}`,
                  }}
                >
                  <div className="aspect-[4/3] bg-gray-100">
                    <ImageWithFallback
                      src={FOUNDER_IMAGES[i].image}
                      alt={name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="p-7">
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
