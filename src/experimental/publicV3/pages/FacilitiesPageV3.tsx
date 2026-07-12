import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { V3 } from '../design';

const FEATURES = [
  {
    label: 'Fully Padded Training Area',
    desc: 'Floor-to-wall padding throughout the training floor for safe practice at every level.',
  },
  {
    label: 'Dedicated Little Dragons Zone',
    desc: 'A separate, smaller mat area sized for our youngest students to help them feel comfortable.',
  },
  {
    label: 'Clean Changing Areas',
    desc: 'Separate changing rooms for students before and after class.',
  },
  {
    label: 'Observation Area',
    desc: 'A dedicated seating area for parents to watch class comfortably from the side.',
  },
  {
    label: 'Air Conditioned',
    desc: 'Year-round climate control so every class is comfortable regardless of season.',
  },
  {
    label: 'Safe Neighborhood Location',
    desc: 'Conveniently located in Los Banos with easy parking and a safe, accessible setting.',
  },
];

const GALLERY = [
  { src: '/photos/19-IMG_5093.jpg', alt: 'LBMAA training floor' },
  { src: '/photos/29-IMG_5072.jpg', alt: 'LBMAA class in session' },
  { src: '/photos/42-IMG_5020.jpg', alt: 'Students practicing at LBMAA' },
  { src: '/photos/50-IMG_4978.jpg', alt: 'LBMAA adult program' },
  { src: '/photos/16-IMG_5107.jpg', alt: 'LBMAA dojo interior' },
  { src: '/photos/17-IMG_5102.jpg', alt: 'LBMAA padded training area' },
];

export function FacilitiesPageV3() {
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
          <p className="v3-eyebrow mb-4">Our Facilities</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            A Space Designed for Learning
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            Our training space is purpose-built for martial arts education —
            safe, clean, and welcoming for students of all ages and experience
            levels.
          </p>
        </div>
      </section>

      {/* ── HERO PHOTO ── */}
      <section className="py-0">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
          <div className="rounded-xl overflow-hidden aspect-[16/7] bg-gray-100">
            <ImageWithFallback
              src="/photos/34-IMG_5055.jpg"
              alt="LBMAA main training floor"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">What We Offer</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-16"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            Everything You'd Expect. Nothing You Wouldn't.
          </h2>

          <div className="grid md:grid-cols-3 gap-0 max-w-5xl">
            {FEATURES.map(({ label, desc }, i) => (
              <div
                key={label}
                className="py-6 pr-8"
                style={{
                  borderTop: `1px solid ${V3.border}`,
                  ...(i < 3
                    ? {
                        borderTop: `2px solid ${i === 0 ? V3.primary : V3.border}`,
                      }
                    : {}),
                }}
              >
                <h3
                  className="v3-h text-base font-bold mb-2"
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

      {/* ── GALLERY ── */}
      <section className="py-24" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Gallery</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-12"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            See the Space
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GALLERY.map(({ src, alt }) => (
              <div
                key={src}
                className="rounded-xl overflow-hidden aspect-square bg-gray-100"
              >
                <ImageWithFallback
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
