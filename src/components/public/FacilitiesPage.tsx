import { ImageWithFallback } from '../figma/ImageWithFallback';
import { V3 } from './design';
import { useLanguage } from './lang';

const GALLERY = [
  { src: '/photos/19-IMG_5093.jpg', alt: 'LBMAA training floor' },
  { src: '/photos/29-IMG_5072.jpg', alt: 'LBMAA class in session' },
  { src: '/photos/42-IMG_5020.jpg', alt: 'Students practicing at LBMAA' },
  { src: '/photos/50-IMG_4978.jpg', alt: 'LBMAA adult program' },
  { src: '/photos/16-IMG_5107.jpg', alt: 'LBMAA dojo interior' },
  { src: '/photos/17-IMG_5102.jpg', alt: 'LBMAA padded training area' },
];

export function FacilitiesPage() {
  const { t } = useLanguage();
  const f = t.facilities;

  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section
        className="py-14"
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">{f.eyebrow}</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            {f.heading}
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            {f.sub}
          </p>
        </div>
      </section>

      {/* ── HERO PHOTO ── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
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
      <section className="py-16" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">{f.featuresEyebrow}</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-10"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            {f.featuresHeading}
          </h2>

          <div className="grid md:grid-cols-3 gap-0 max-w-5xl">
            {f.features.map(({ label, desc }, i) => (
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
      <section className="py-20" style={{ backgroundColor: V3.surface }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">{f.galleryEyebrow}</p>
          <h2
            className="v3-h font-black leading-[1.0] mb-8"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: V3.text,
            }}
          >
            {f.galleryHeading}
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
