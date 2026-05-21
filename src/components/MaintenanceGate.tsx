import { useState } from 'react';
import type { ReactNode, FormEvent } from 'react';

const STORAGE_KEY = 'lbma_site_unlocked';
const SITE_PASSWORD = 'password';

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input === SITE_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Nunito:wght@400;600;700&display=swap"
      />
      <div
        style={{ background: 'oklch(97.5% 0.008 35)', minHeight: '100svh' }}
        className="flex flex-col items-center justify-center px-6 py-16"
      >
        <div className="flex flex-col items-center text-center" style={{ maxWidth: '22rem', width: '100%' }}>
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '20px' }}
          />
          <p
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#A01F23',
              textTransform: 'uppercase' as const,
              marginBottom: '8px',
            }}
          >
            Los Banos, CA
          </p>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(2rem, 10vw, 3rem)',
              fontWeight: 900,
              lineHeight: 1.0,
              color: 'oklch(22% 0.014 30)',
              letterSpacing: '-0.01em',
              marginBottom: '6px',
            }}
          >
            LOS BANOS<br />MARTIAL ARTS
          </h1>
          <p
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'oklch(52% 0.010 30)',
              textTransform: 'uppercase' as const,
              marginBottom: '36px',
            }}
          >
            ERWCMAA Affiliated Academy
          </p>
          <div
            style={{
              borderTop: '1px solid oklch(88% 0.008 35)',
              paddingTop: '28px',
              marginBottom: '28px',
              width: '100%',
            }}
          >
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: '0.9rem',
                lineHeight: 1.65,
                color: 'oklch(52% 0.010 30)',
              }}
            >
              Website is under maintenance. Enter the password below to take a look.
            </p>
          </div>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="Password"
              autoComplete="current-password"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                fontFamily: "'Nunito', sans-serif",
                fontSize: '0.95rem',
                background: 'oklch(94.5% 0.009 35)',
                border: error ? '1.5px solid #A01F23' : '1.5px solid oklch(88% 0.008 35)',
                borderRadius: '8px',
                color: 'oklch(20% 0.012 30)',
                outline: 'none',
                marginBottom: error ? '8px' : '12px',
                boxSizing: 'border-box' as const,
              }}
            />
            {error && (
              <p
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: '0.8rem',
                  color: '#A01F23',
                  marginBottom: '12px',
                  textAlign: 'left' as const,
                }}
              >
                Incorrect password. Please try again.
              </p>
            )}
            <button
              type="submit"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 32px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                background: '#A01F23',
                color: 'oklch(97.5% 0.008 35)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget).style.background = '#7A1619'; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = '#A01F23'; }}
            >
              Enter Site
            </button>
          </form>
        </div>
      </div>
    </>
  );
}