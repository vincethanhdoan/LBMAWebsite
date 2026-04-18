
import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import "./globals.css";

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found. Check index.html.');
createRoot(rootEl).render(
  <>
    <App />
    <Analytics />
  </>
);
  