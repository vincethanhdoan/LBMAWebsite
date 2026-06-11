import { useNavigate, Link } from 'react-router-dom';
import { BASE, V3 } from './design';
import { useLanguage } from './lang';

type Page = 'about' | 'facilities' | 'programs' | 'instructors' | 'reviews' | 'faq' | 'contact';

const PROGRAM_PATHS: Page[] = ['programs', 'programs', 'programs', 'programs'];
const ACADEMY_PATHS: Page[] = ['about', 'instructors', 'facilities', 'reviews', 'faq'];

export function Footer() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer style={{ backgroundColor: V3.dark }}>
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-1">
            <img src="/logo.png" alt="ERWCMAA Logo" className="h-12 w-auto mb-5" />
            <p className="text-sm leading-relaxed max-w-[220px]" style={{ color: V3.mutedOnDark }}>
              {f.brandDesc}
            </p>
          </div>

          {/* Programs */}
          <div>
            <h4 className="v3-h text-sm font-bold uppercase tracking-widest mb-5" style={{ color: V3.onDark }}>
              {f.programs}
            </h4>
            <div className="flex flex-col gap-3">
              {f.programLinks.map((label, i) => (
                <button
                  key={label}
                  onClick={() => navigate(`${BASE}/${PROGRAM_PATHS[i]}`)}
                  className="text-left text-sm transition-colors"
                  style={{ color: V3.mutedOnDark }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = V3.onDark)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = V3.mutedOnDark)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Academy */}
          <div>
            <h4 className="v3-h text-sm font-bold uppercase tracking-widest mb-5" style={{ color: V3.onDark }}>
              {f.academy}
            </h4>
            <div className="flex flex-col gap-3">
              {f.academyLinks.map((label, i) => (
                <button
                  key={label}
                  onClick={() => navigate(`${BASE}/${ACADEMY_PATHS[i]}`)}
                  className="text-left text-sm transition-colors"
                  style={{ color: V3.mutedOnDark }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = V3.onDark)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = V3.mutedOnDark)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="v3-h text-sm font-bold uppercase tracking-widest mb-5" style={{ color: V3.onDark }}>
              {f.getInTouch}
            </h4>
            <div className="flex flex-col gap-3 text-sm" style={{ color: V3.mutedOnDark }}>
              <a href="tel:+14086200252" className="transition-colors hover:text-white">
                (408) 620-0252
              </a>
              <a href="mailto:westcoastlosbanos@gmail.com" className="transition-colors hover:text-white">
                westcoastlosbanos@gmail.com
              </a>
              <p>1209 South 6th Street Suite E<br />Los Banos, CA 93635</p>
              <div style={{ borderTop: `1px solid ${V3.borderDark}`, paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <p>{f.hoursMon}</p>
                <p>{f.hoursWeekend}</p>
                <p>{f.hoursHoliday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs"
          style={{ borderTop: `1px solid ${V3.borderDark}`, color: V3.mutedOnDark }}
        >
          <span>{f.copyright}</span>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="transition-colors hover:text-white"
            >
              {f.privacyPolicy}
            </Link>
            <button
              onClick={() => navigate(`${BASE}/contact`)}
              className="v3-btn-white"
              style={{ padding: '0.5rem 1.1rem', fontSize: '0.72rem' }}
            >
              {f.bookTrial}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
