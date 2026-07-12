import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Menu, X, Lock } from 'lucide-react';

const BASE = '/experimental/public';

type NavItem = { label: string; path: string };

const NAV_ITEMS: NavItem[] = [
  { label: 'About', path: `${BASE}/about` },
  { label: 'Facilities', path: `${BASE}/facilities` },
  { label: 'Programs', path: `${BASE}/programs` },
  { label: 'Instructors', path: `${BASE}/instructors` },
  { label: 'Reviews', path: `${BASE}/reviews` },
  { label: 'FAQ', path: `${BASE}/faq` },
  { label: 'Contact', path: `${BASE}/contact` },
];

type NavbarV2Props = {
  onLogin: () => void;
};

export function NavbarV2({ onLogin }: NavbarV2Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    // Prototype: resetting menu state on navigation alongside the scroll side effect; deriving is not worth it here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isHome = location.pathname === BASE || location.pathname === `${BASE}/`;

  const goTo = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-border transition-all duration-200 ${
        scrolled ? 'bg-white shadow-sm' : 'bg-white/95 backdrop-blur'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => goTo(BASE)}
            className="flex items-center gap-2.5 hover:opacity-75 transition-opacity min-w-0"
            aria-label="Los Banos Martial Arts Academy — home"
          >
            <img
              src="/logo.png"
              alt="LBMAA Logo"
              className="h-7 w-auto flex-shrink-0"
            />
            <span className="font-bold text-foreground leading-tight text-sm md:text-base truncate">
              Los Banos Martial Arts Academy
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => goTo(path)}
                aria-current={isActive(path) ? 'page' : undefined}
                className={`px-3 min-h-[44px] text-sm rounded-md transition-colors relative ${
                  isActive(path)
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                {label}
                {isActive(path) && (
                  <span className="absolute bottom-2.5 left-3 right-3 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={onLogin}
              className="ml-3 text-sm gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Parent Login
            </Button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={onLogin}
              className="text-xs gap-1"
            >
              <Lock className="w-3 h-3" />
              Login
            </Button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-v2"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div id="mobile-nav-v2" className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-2 flex flex-col">
            <button
              onClick={() => goTo(BASE)}
              aria-current={isHome ? 'page' : undefined}
              className={`text-left px-3 min-h-[44px] flex items-center rounded-md text-sm font-medium transition-colors ${
                isHome
                  ? 'text-primary bg-primary/5'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              Home
            </button>
            {NAV_ITEMS.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => goTo(path)}
                aria-current={isActive(path) ? 'page' : undefined}
                className={`text-left px-3 min-h-[44px] flex items-center rounded-md text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'text-primary bg-primary/5'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
