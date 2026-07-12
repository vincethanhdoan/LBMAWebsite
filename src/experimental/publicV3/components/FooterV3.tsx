import { useNavigate } from 'react-router-dom';
import { BASE, V3 } from '../design';

type Page =
  | 'about'
  | 'facilities'
  | 'programs'
  | 'instructors'
  | 'reviews'
  | 'faq'
  | 'contact';

const PROGRAM_LINKS: { label: string; path: Page }[] = [
  { label: 'Little Dragons (Ages 4–6)', path: 'programs' },
  { label: 'Kids Martial Arts (Ages 7–12)', path: 'programs' },
  { label: 'Teens & Adults (Ages 13+)', path: 'programs' },
  { label: 'Kickboxing Fitness', path: 'programs' },
];

const ACADEMY_LINKS: { label: string; path: Page }[] = [
  { label: 'About Us', path: 'about' },
  { label: 'Our Instructors', path: 'instructors' },
  { label: 'Facilities', path: 'facilities' },
  { label: 'Reviews', path: 'reviews' },
  { label: 'FAQ', path: 'faq' },
];

export function FooterV3({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();

  return (
    <footer style={{ backgroundColor: V3.dark }}>
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <img
              src="/logo.png"
              alt="ERWCMAA Logo"
              className="h-12 w-auto mb-5"
            />
            <p
              className="text-sm leading-relaxed max-w-[220px]"
              style={{ color: V3.mutedOnDark }}
            >
              Los Banos Martial Arts Academy develops champions in life —
              physically, mentally, and spiritually. ERWCMAA Affiliated.
            </p>
          </div>

          {/* Programs */}
          <div>
            <h4
              className="v3-h text-sm font-bold uppercase tracking-widest mb-5"
              style={{ color: V3.onDark }}
            >
              Programs
            </h4>
            <div className="flex flex-col gap-3">
              {PROGRAM_LINKS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(`${BASE}/${item.path}`)}
                  className="text-left text-sm transition-colors"
                  style={{ color: V3.mutedOnDark }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = V3.onDark)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = V3.mutedOnDark)
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Academy */}
          <div>
            <h4
              className="v3-h text-sm font-bold uppercase tracking-widest mb-5"
              style={{ color: V3.onDark }}
            >
              Academy
            </h4>
            <div className="flex flex-col gap-3">
              {ACADEMY_LINKS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(`${BASE}/${item.path}`)}
                  className="text-left text-sm transition-colors"
                  style={{ color: V3.mutedOnDark }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = V3.onDark)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = V3.mutedOnDark)
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="v3-h text-sm font-bold uppercase tracking-widest mb-5"
              style={{ color: V3.onDark }}
            >
              Get In Touch
            </h4>
            <div
              className="flex flex-col gap-3 text-sm"
              style={{ color: V3.mutedOnDark }}
            >
              <a
                href="tel:+12095550123"
                className="transition-colors hover:text-white"
              >
                (209) 555-0123
              </a>
              <a
                href="mailto:info@lbmaa.com"
                className="transition-colors hover:text-white"
              >
                info@lbmaa.com
              </a>
              <p>Los Banos, CA</p>
              <div
                style={{
                  borderTop: `1px solid ${V3.borderDark}`,
                  paddingTop: '0.75rem',
                  marginTop: '0.25rem',
                }}
              >
                <p>Mon–Fri: 3:00 – 8:30 PM</p>
                <p>Saturday: 9:00 AM – 2:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs"
          style={{
            borderTop: `1px solid ${V3.borderDark}`,
            color: V3.mutedOnDark,
          }}
        >
          <span>© 2026 Los Banos Martial Arts Academy · ERWCMAA Certified</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`${BASE}/contact`)}
              className="v3-btn-white"
              style={{ padding: '0.5rem 1.1rem', fontSize: '0.72rem' }}
            >
              Book a Trial
            </button>
            <button
              onClick={onLogin}
              className="transition-colors hover:text-white underline"
              style={{ color: V3.mutedOnDark }}
            >
              Family Login
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
