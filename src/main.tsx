import React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { initMonitoring } from './lib/monitoring/sentry';
import './globals.css';

initMonitoring();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found. Check index.html.');
createRoot(rootEl).render(
  <>
    <App />
    <Analytics />
  </>,
);
