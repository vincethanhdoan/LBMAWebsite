const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// (209) 555-0134 | 209-555-0134 | 209.555.0134 | 2095550134 | +1 209 555 0134
// Lookbehind/lookahead (not \b) so this can't match a digit-aligned slice out
// of a longer run — e.g. a 15-digit token must fall through to LONG_NUMBER
// rather than have PHONE claim 10-12 digits from its middle.
const PHONE =
  /(?<!\d)(\+?\d{1,2}[\s.-]?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
// Any remaining run of 7+ digits: ids, tokens, account numbers.
const LONG_NUMBER = /\b\d{7,}\b/g;

/** Redacts personal data from a free-text string. Safe to call on any string. */
export function scrubText(value: string): string {
  return value
    .replace(EMAIL, '[redacted-email]')
    .replace(PHONE, '[redacted-phone]')
    .replace(LONG_NUMBER, '[redacted-number]');
}

function scrubMaybe(value: unknown): unknown {
  return typeof value === 'string' ? scrubText(value) : value;
}

/**
 * Redacts personal data from the fields of a Sentry event that carry free text.
 * Mutates and returns the event, matching Sentry's beforeSend contract.
 */
export function scrubEvent<T>(event: T): T {
  const e = event as Record<string, unknown>;

  e.message = scrubMaybe(e.message);

  const exception = e.exception as
    { values?: Array<Record<string, unknown>> } | undefined;
  exception?.values?.forEach((v) => {
    v.value = scrubMaybe(v.value);
  });

  const breadcrumbs = e.breadcrumbs as
    Array<Record<string, unknown>> | undefined;
  breadcrumbs?.forEach((b) => {
    b.message = scrubMaybe(b.message);
  });

  const request = e.request as Record<string, unknown> | undefined;
  if (request) request.url = scrubMaybe(request.url);

  return event;
}
