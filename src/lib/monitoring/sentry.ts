import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { scrubEvent, scrubText } from './scrub';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Initializes error reporting. A no-op when no DSN is configured, which is the
 * case in local dev and tests — nothing is transmitted from a developer machine.
 */
export function initMonitoring(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment:
      (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ??
      'unknown',
    // Errors only: no tracing, no replay. Conserves free-tier quota and
    // avoids collecting the surfaces most likely to carry personal data.
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => {
      if (typeof breadcrumb.message === 'string') {
        breadcrumb.message = scrubText(breadcrumb.message);
      }
      return breadcrumb;
    },
  });
}

/** Reports a caught render error. No-op when monitoring is not configured. */
export function reportError(error: Error, info?: ErrorInfo): void {
  if (!dsn) return;
  Sentry.captureException(error, {
    extra: { componentStack: info?.componentStack ?? null },
  });
}

/**
 * Associates events with a user by opaque id only — never email or name.
 * Pass null on sign-out.
 */
export function setMonitoringUser(id: string | null): void {
  if (!dsn) return;
  if (id) Sentry.setUser({ id });
  else Sentry.setUser(null);
}
