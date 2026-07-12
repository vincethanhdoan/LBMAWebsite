import { useNavigate } from 'react-router-dom';
import { QuickAnswerStrip } from './QuickAnswerStrip';

const BASE = '/experimental/public';

const FOOTER_LINKS = [
  { label: 'Home', path: BASE },
  { label: 'About', path: `${BASE}/about` },
  { label: 'Facilities', path: `${BASE}/facilities` },
  { label: 'Programs', path: `${BASE}/programs` },
  { label: 'Instructors', path: `${BASE}/instructors` },
  { label: 'Reviews', path: `${BASE}/reviews` },
  { label: 'FAQ', path: `${BASE}/faq` },
  { label: 'Contact', path: `${BASE}/contact` },
];

type FooterV2Props = {
  onLogin: () => void;
};

export function FooterV2({ onLogin }: FooterV2Props) {
  const navigate = useNavigate();

  return (
    <footer>
      <QuickAnswerStrip />
      <div className="bg-[#1B1212] text-slate-300">
        <div className="container mx-auto px-4 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Brand */}
            <div>
              <button
                onClick={() => navigate(BASE)}
                className="flex items-center gap-2 mb-4 hover:opacity-75 transition-opacity"
              >
                <img src="/logo.png" alt="LBMAA Logo" className="h-5 w-auto" />
              </button>
              <p className="text-sm leading-relaxed opacity-70 max-w-xs">
                A family-run martial arts school in Los Banos, CA. Teaching
                children confidence, discipline, and respect — through Karate,
                BJJ, and Taekwondo.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">
                Quick Links
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {FOOTER_LINKS.map(({ label, path }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="text-left text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Contact</h4>
              <div className="space-y-2.5 text-sm text-slate-400">
                <p>
                  <a
                    href="mailto:info@lbmaa.com"
                    className="hover:text-white transition-colors"
                  >
                    info@lbmaa.com
                  </a>
                </p>
                <p>
                  <a
                    href="tel:+12095550123"
                    className="hover:text-white transition-colors"
                  >
                    (209) 555-0123
                  </a>
                </p>
                <p>
                  1209 South 6th Street Suite E<br />
                  Los Banos, CA 93635
                </p>
                <p className="pt-1">
                  Mon–Fri: 3:00 – 8:30 PM
                  <br />
                  Saturday: 9:00 AM – 2:00 PM
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <span>
              © 2026 Los Banos Martial Arts Academy. All rights reserved.
            </span>
            <button
              onClick={onLogin}
              className="hover:text-slate-300 transition-colors underline"
            >
              Parent Login
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
