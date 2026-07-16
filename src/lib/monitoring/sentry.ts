import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { scrubEvent, scrubText } from './scrub';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Scrubs an event, or drops it if scrubbing fails. Failing closed matters
 * because a throw inside beforeSend makes Sentry capture its own internal
 * error event, and that event bypasses beforeSend while keeping the current
 * scope and breadcrumbs — so an unscrubbed trail could egress. Losing a report
 * is always preferable to sending an unscrubbed one.
 */
export function scrubEventOrDrop<T>(event: T): T | null {
  try {
    return scrubEvent(event);
  } catch {
    return null;
  }
}

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
    // DOM (click/keypress) breadcrumbs are off because Sentry builds their
    // message from the element's aria-label/type/name/title/alt attributes,
    // which in this app hold students' and parents' names. Names are the one
    // PII class the scrubber cannot match by shape, so they must never be
    // collected in the first place. Console, fetch, xhr and history
    // breadcrumbs stay on — this array merges with Sentry's defaults and only
    // replaces the Breadcrumbs integration.
    integrations: [Sentry.breadcrumbsIntegration({ dom: false })],
    beforeSend: (event) => scrubEventOrDrop(event),
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
