import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BASE, V3 } from '../design';

const NAV = [
  { label: 'Home', path: '/' },
  { label: 'About', path: `${BASE}/about` },
  { label: 'Programs', path: `${BASE}/programs` },
  { label: 'Facilities', path: `${BASE}/facilities` },
  { label: 'Instructors', path: `${BASE}/instructors` },
  { label: 'Reviews', path: `${BASE}/reviews` },
  { label: 'FAQ', path: `${BASE}/faq` },
  { label: 'Contact', path: `${BASE}/contact` },
];

export function NavbarV3({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Prototype: resetting menu state on navigation alongside the scroll side effect; deriving is not worth it here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname === path + '/';
  };

  const goTo = (path: string) => navigate(path);

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
          <div className="text-left leading-snug hidden sm:block">
            <div
              className="v3-h font-bold text-[15px] uppercase tracking-wide"
              style={{ color: V3.text }}
            >
              Los Banos Martial Arts
            </div>
            <div
              className="text-[10px] uppercase tracking-widest font-semibold"
              style={{ color: V3.muted }}
            >
              ERWCMAA Affiliated Academy
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
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="v3-btn-outline hidden lg:block"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.78rem' }}
          >
            Parent Login
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden min-h-[44px] px-2 flex items-center gap-1.5 rounded-md transition-colors"
            style={{ color: V3.muted }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <>
                <X className="w-5 h-5" />
                <span
                  className="text-xs font-semibold"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Close
                </span>
              </>
            ) : (
              <>
                <Menu className="w-5 h-5" />
                <span
                  className="text-xs font-semibold"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Menu
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
            <div className="pt-3 pb-1">
              <button onClick={onLogin} className="v3-btn-outline w-full">
                Parent Login
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
