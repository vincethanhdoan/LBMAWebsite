import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../public/lang';
import { ContactPage } from '../public/ContactPage';
import { V3 } from '../public/design';
import { UnderConstructionPage } from './UnderConstructionPage';
import '../public/public-website.css';

function LockedContactShell() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: V3.bg }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${V3.border}` }}
      >
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            className="rounded-full"
            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
          />
          <span className="v3-h" style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em' }}>
            LOS BANOS MARTIAL ARTS ACADEMY
          </span>
        </Link>
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
      </header>

      <main className="flex-1">
        <ContactPage />
      </main>

      <footer
        className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 px-6 py-6 text-xs"
        style={{ borderTop: `1px solid ${V3.border}`, color: V3.muted }}
      >
        <span>{t.footer.copyright}</span>
        <Link to="/privacy" style={{ color: V3.muted, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          {lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
        </Link>
      </footer>
    </div>
  );
}

export function LockedSite() {
  return (
    <LanguageProvider>
      <div className="v3-root">
        <Routes>
          <Route path="/" element={<UnderConstructionPage />} />
          <Route path="contact" element={<LockedContactShell />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </LanguageProvider>
  );
}
