import { useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'lbma_site_unlocked';
const UNLOCK_CODE = 'lbmaa2026';

function consumeUnlockParam(): boolean {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('unlock');
  if (code === null) return false;
  url.searchParams.delete('unlock');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  return code === UNLOCK_CODE;
}

const text = {
  fontFamily: "'Nunito', sans-serif",
  fontSize: '0.9rem',
  lineHeight: 1.65,
  color: 'oklch(52% 0.010 30)',
};

const phoneLink = {
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 700 as const,
  color: '#A01F23',
  textDecoration: 'none',
};

export function LockdownGate({ children }: { children: ReactNode }) {
  const [unlocked] = useState(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return true;
    if (consumeUnlockParam()) {
      localStorage.setItem(STORAGE_KEY, 'true');
      return true;
    }
    return false;
  });

  if (unlocked) return <>{children}</>;

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
        <div className="flex flex-col items-center text-center" style={{ maxWidth: '26rem', width: '100%' }}>
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
              marginBottom: '32px',
            }}
          >
            LOS BANOS<br />MARTIAL ARTS
          </h1>
          <div
            style={{
              borderTop: '1px solid oklch(88% 0.008 35)',
              paddingTop: '28px',
              width: '100%',
            }}
          >
            <p style={{ ...text, marginBottom: '16px' }}>
              Los Banos Martial Arts Academy is becoming an independent school and is
              no longer affiliated with the Ernie Reyes World Combat Martial Arts
              Association. Our website is temporarily offline while we complete this
              transition. A new name and website are on the way.
            </p>
            <p style={{ ...text, marginBottom: '28px' }}>
              If you have any questions, please call us at{' '}
              <a href="tel:+14086200252" style={phoneLink}>(408) 620-0252</a>.
            </p>
          </div>
          <div
            style={{
              borderTop: '1px solid oklch(88% 0.008 35)',
              paddingTop: '28px',
              width: '100%',
            }}
          >
            <p style={{ ...text, marginBottom: '16px' }}>
              Los Banos Martial Arts Academy se está convirtiendo en una escuela
              independiente y ya no está afiliada a la Ernie Reyes World Combat
              Martial Arts Association. Nuestro sitio web está temporalmente fuera de
              línea mientras completamos esta transición. Un nuevo nombre y sitio web
              están en camino.
            </p>
            <p style={text}>
              Si tiene alguna pregunta, llámenos al{' '}
              <a href="tel:+14086200252" style={phoneLink}>(408) 620-0252</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
