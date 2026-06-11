import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE, V3 } from './design';
import { useLanguage } from './lang';

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        border: `1px solid ${V3.border}`,
        overflow: 'hidden',
      }}
    >
      <button
        className="w-full flex items-center justify-between gap-4 text-left"
        style={{ padding: '17px 18px' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-bold leading-snug" style={{ color: V3.text }}>
          {q}
        </span>
        <span
          className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: open ? V3.primary : V3.primaryBg,
            color: open ? 'white' : V3.primary,
            fontFamily: 'monospace',
            fontSize: '1rem',
            fontWeight: 700,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p
          style={{
            padding: '0 18px 16px',
            fontSize: '0.875rem',
            lineHeight: 1.75,
            color: V3.muted,
            maxWidth: '65ch',
          }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

export function FAQPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const f = t.faq;

  return (
    <div>

      {/* ── HERO ── */}
      <section className="py-14" style={{ backgroundColor: 'white', borderBottom: `1px solid ${V3.border}` }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">{f.eyebrow}</p>
          <h1
            className="v3-h font-black mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text, lineHeight: 1.0, letterSpacing: '-0.01em' }}
          >
            {f.heading}
          </h1>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: V3.muted, maxWidth: '48ch' }}>
            {f.sub}
          </p>
        </div>
      </section>

      {/* ── FAQ SECTIONS ── */}
      {f.faqs.map(({ category, subtitle, items }, idx) => (
        <section
          key={category}
          style={{ backgroundColor: idx % 2 === 0 ? V3.surface : 'white', padding: '68px 0' }}
        >
          <div className="max-w-3xl mx-auto px-6 md:px-10">

            <div className="flex items-start gap-4 mb-8">
              <div style={{ paddingTop: '4px' }}>
                <h2
                  className="v3-h font-extrabold uppercase"
                  style={{ fontSize: '1.6rem', color: V3.text, lineHeight: 1.05, letterSpacing: '0.01em', marginBottom: '4px' }}
                >
                  {category}
                </h2>
                <p style={{ fontSize: '0.78rem', color: V3.muted, lineHeight: 1.5 }}>{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>

          </div>
        </section>
      ))}

      {/* ── CTA ── */}
      <section style={{ backgroundColor: V3.primary, padding: '80px 0' }}>
        <div className="max-w-3xl mx-auto px-6 md:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
          <div>
            <p
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'oklch(84% 0.058 22)',
                marginBottom: '12px',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {f.ctaEyebrow}
            </p>
            <h2
              className="v3-h font-black mb-3"
              style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'white', lineHeight: 1.0, letterSpacing: '-0.01em' }}
            >
              {f.ctaHeading}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'oklch(88% 0.032 22)', lineHeight: 1.65, maxWidth: '40ch' }}>
              {f.ctaBody}
            </p>
          </div>
          <button
            className="v3-btn-white flex-shrink-0"
            onClick={() => navigate(`${BASE}/contact`)}
          >
            {f.contactUs}
          </button>
        </div>
      </section>

    </div>
  );
}
