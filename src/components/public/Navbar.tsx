import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BASE, V3 } from './design';
import { useLanguage } from './lang';

export function Navbar({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const NAV = [
    { label: t.nav.home, path: '/' },
    { label: t.nav.about, path: `${BASE}/about` },
    { label: t.nav.programs, path: `${BASE}/programs` },
    { label: t.nav.facilities, path: `${BASE}/facilities` },
    { label: t.nav.instructors, path: `${BASE}/instructors` },
    { label: t.nav.reviews, path: `${BASE}/reviews` },
    { label: t.nav.faq, path: `${BASE}/faq` },
    { label: t.nav.contact, path: `${BASE}/contact` },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: close mobile menu on navigation
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname === path + '/';
  };

  const goTo = (path: string) => navigate(path);
  const toggleLang = () => setLang(lang === 'en' ? 'es' : 'en');

  return (
    <nav
      style={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${V3.border}`,
        boxShadow: scrolled ? '0 1px 12px oklch(20% 0.012 30 / 0.08)' : 'none',
        transition: 'box-shadow 0.2s ease',
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
        {/* Brand */}
        <button
          onClick={() => goTo('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0 flex-shrink-0"
          aria-label="Los Banos Martial Arts Academy — home"
        >
          <img
            src="/logo.png"
            alt="ERWCMAA Logo"
            className="h-11 w-auto flex-shrink-0"
          />
          <div className="hidden sm:block">
            <div
              className="v3-h font-bold text-[19px] uppercase tracking-wide"
              style={{ color: V3.text }}
            >
              Los Banos Martial Arts
            </div>
          </div>
        </button>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => goTo(path)}
              aria-current={isActive(path) ? 'page' : undefined}
              className="relative px-3 py-2 min-h-[44px] text-[13px] font-semibold transition-colors"
              style={{
                color: isActive(path) ? V3.primary : V3.muted,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {label}
              {isActive(path) && (
                <span
                  className="absolute bottom-1.5 left-3 right-3 h-[2px] rounded-full"
                  style={{ backgroundColor: V3.primary }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language toggle — desktop */}
          <button
            onClick={toggleLang}
            className="hidden lg:block"
            aria-label={`Switch to ${t.nav.switchLang}`}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: V3.muted,
              padding: '0.4rem 0.65rem',
              border: `1px solid ${V3.border}`,
              borderRadius: '5px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = V3.primary;
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                V3.primary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = V3.muted;
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                V3.border;
            }}
          >
            {t.nav.switchLang}
          </button>

          <button
            onClick={onLogin}
            className="v3-btn-primary hidden lg:block"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.78rem' }}
          >
            {t.nav.parentLogin}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden min-h-[44px] px-2 flex items-center gap-1.5 rounded-md transition-colors"
            style={{ color: V3.muted }}
            aria-label={mobileOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <>
                <X className="w-5 h-5" />
                <span
                  className="text-xs font-semibold"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {t.nav.close}
                </span>
              </>
            ) : (
              <>
                <Menu className="w-5 h-5" />
                <span
                  className="text-xs font-semibold"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {t.nav.menu}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden"
          style={{
            borderTop: `1px solid ${V3.border}`,
            backgroundColor: 'white',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-0.5">
            {NAV.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => goTo(path)}
                aria-current={isActive(path) ? 'page' : undefined}
                className="text-left px-3 min-h-[44px] flex items-center rounded-lg text-sm font-semibold transition-colors"
                style={{
                  color: isActive(path) ? V3.primary : V3.text,
                  backgroundColor: isActive(path)
                    ? V3.primaryBg
                    : 'transparent',
                }}
              >
                {label}
              </button>
            ))}
            <div className="pt-3 pb-1 flex flex-col gap-2">
              <button
                onClick={() => {
                  onLogin();
                  setMobileOpen(false);
                }}
                className="v3-btn-primary w-full"
              >
                {t.nav.parentLogin}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={toggleLang}
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: V3.muted,
                    padding: '0.4rem 0.75rem',
                    border: `1px solid ${V3.border}`,
                    borderRadius: '5px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.nav.switchLang}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
