import { Link } from 'react-router-dom';
import { useLanguage } from '../public/lang';
import { V3 } from '../public/design';

const COPY = {
  en: {
    status: 'Our new website is on its way.',
    body: "We're building a new online home for the academy. In the meantime, if you have questions or would like to enroll, we'd be honored to hear from you.",
    contactUs: 'Contact Us',
    thanks: "Thank you for your patience. We can't wait to share what's coming.",
  },
  es: {
    status: 'Nuestro nuevo sitio web está en camino.',
    body: 'Estamos construyendo un nuevo hogar en línea para la academia. Mientras tanto, si tienes preguntas o deseas inscribir a tu hijo, sería un honor saber de ti.',
    contactUs: 'Contáctanos',
    thanks: 'Gracias por tu paciencia. Estamos ansiosos por compartir lo que viene.',
  },
} as const;

export function UnderConstructionPage() {
  const { lang, setLang, t } = useLanguage();
  const c = COPY[lang];

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ minHeight: '100svh', backgroundColor: V3.bg }}
    >
      <div className="flex flex-col items-center w-full" style={{ maxWidth: '26rem' }}>
        <img
          src="/logo.png"
          alt="Los Banos Martial Arts Academy"
          className="rounded-full"
          style={{ width: '104px', height: '104px', objectFit: 'cover', marginBottom: '20px' }}
        />
        <h1
          style={{
            fontSize: 'clamp(2rem, 9vw, 2.9rem)',
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: '-0.01em',
            marginBottom: '36px',
          }}
        >
          LOS BANOS<br />MARTIAL ARTS ACADEMY
        </h1>

        <div className="w-full" style={{ borderTop: `1px solid ${V3.border}`, paddingTop: '28px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '10px' }}>{c.status}</h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.65, color: V3.muted, marginBottom: '28px' }}>
            {c.body}
          </p>

          <Link to="/contact" className="v3-btn-primary" style={{ display: 'inline-block', marginBottom: '28px' }}>
            {c.contactUs}
          </Link>

          <div className="flex flex-col items-center gap-2" style={{ fontSize: '0.95rem', marginBottom: '28px' }}>
            <a href="tel:+14086200252" style={{ color: V3.text, fontWeight: 600 }}>
              (408) 620-0252
            </a>
            <a
              href="https://www.instagram.com/LBMartialArts"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: V3.primary, fontWeight: 600 }}
            >
              @LBMartialArts
            </a>
          </div>

          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: V3.muted, marginBottom: '32px' }}>
            {c.thanks}
          </p>

          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: V3.muted,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            {t.nav.switchLang}
          </button>
        </div>
      </div>
    </div>
  );
}
