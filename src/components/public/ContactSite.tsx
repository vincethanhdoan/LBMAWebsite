import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { LanguageProvider } from './LanguageProvider';
import { useLanguage } from './lang';
import { ContactPage } from './ContactPage';
import { V3 } from './design';
import './public-website.css';

function ContactShell() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: V3.bg }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4"
        style={{ borderBottom: `1px solid ${V3.border}` }}
      >
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            className="rounded-full"
            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
          />
          <span
            className="v3-h"
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            LOS BANOS MARTIAL ARTS ACADEMY
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <a
            href="tel:+14086200252"
            style={{
              color: V3.text,
              fontWeight: 700,
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
            }}
          >
            (408) 620-0252
          </a>
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
      </header>

      <main className="flex-1">
        <ContactPage />
      </main>

      <footer
        className="flex flex-col items-center gap-3 px-6 py-6 text-center text-xs"
        style={{ borderTop: `1px solid ${V3.border}`, color: V3.muted }}
      >
        <p>
          1209 South 6th Street Suite E, Los Banos, CA 93635 ·{' '}
          {t.footer.serving}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
          <span>{t.footer.copyright}</span>
          <Link
            to="/privacy"
            style={{
              color: V3.muted,
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            {lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function ContactSite() {
  return (
    <LanguageProvider>
      <div className="v3-root">
        <Routes>
          <Route path="/" element={<ContactShell />} />
          <Route path="contact" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </LanguageProvider>
  );
}
