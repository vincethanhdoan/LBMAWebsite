// Credential-bearing query parameters (magic-link OTPs, OAuth codes, session
// tokens). The value is redacted; the name is kept because it is useful for
// debugging and is not itself a secret.
// The name is matched by shape, not by a fixed list, so provider_token,
// id_token and csrf_token are covered without naming each one. Requiring the
// name to *end* in `token` (or be exactly `code`) is what keeps `error_code`
// and other merely-code-suffixed params readable as debug data.
const SENSITIVE_PARAM =
  /(?<![\w-])((?:[\w-]*token(?:_hash)?)|code)=[^&\s"'#]+/gi;
// parent@example.com, and the percent-encoded form URLSearchParams produces.
const EMAIL = /[A-Za-z0-9._%+-]+(?:@|%40)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Captured (not consumed) so scrubText can hold UUIDs out of the digit rules:
// a record id is pseudonymous, and redacting its tail would destroy
// correlation while protecting nothing.
const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
// (209) 555-0134 | 209-555-0134 | 209.555.0134 | 2095550134 | +1 209 555 0134
// Lookbehind/lookahead (not \b) so this can't match a digit-aligned slice out
// of a longer run — e.g. a 15-digit token must fall through to LONG_NUMBER
// rather than have PHONE claim 10-12 digits from its middle.
const PHONE =
  /(?<!\d)(\+?\d{1,2}[\s.-]?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
// Any remaining run of 7+ digits: ids, tokens, account numbers.
const LONG_NUMBER = /\b\d{7,}\b/g;

function scrubDigits(value: string): string {
  return value
    .replace(PHONE, '[redacted-phone]')
    .replace(LONG_NUMBER, '[redacted-number]');
}

/** Redacts personal data from a free-text string. Safe to call on any string. */
export function scrubText(value: string): string {
  return (
    value
      .replace(SENSITIVE_PARAM, '$1=[redacted-token]')
      // Emails must be redacted before the digit rules, or a numeric local part
      // or domain is consumed first and the email rule never matches.
      .replace(EMAIL, '[redacted-email]')
      // A capturing split yields UUIDs at the odd indices; only the text
      // between them is handed to the digit rules.
      .split(UUID)
      .map((part, i) => (i % 2 === 1 ? part : scrubDigits(part)))
      .join('')
  );
}

/** Redacts a string field in place. Absent fields stay absent. */
function scrubField(target: Record<string, unknown>, key: string): void {
  const value = target[key];
  if (typeof value === 'string') target[key] = scrubText(value);
}

// Sentry normalizes to a depth of 3 before beforeSend runs, so this only ever
// binds against a hostile or unexpected payload, never a real event.
const MAX_DEPTH = 8;

/**
 * Scrubs every string reachable under `value`, in place. Non-strings are
 * returned untouched, so numbers, booleans and null keep their type. Guarded
 * against cycles (a shared `seen` set, which also stops an object shared
 * between two branches being walked twice) and runaway depth.
 */
function scrubDeep(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object' || depth >= MAX_DEPTH) {
    return value;
  }

  const node = value as object;
  if (seen.has(node)) return value;
  seen.add(node);

  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      value[i] = scrubDeep(item, depth + 1, seen);
    });
  } else {
    const record = value as Record<string, unknown>;
    Object.keys(record).forEach((key) => {
      record[key] = scrubDeep(record[key], depth + 1, seen);
    });
  }

  return value;
}

/**
 * Redacts personal data from the fields of a Sentry event that carry free text.
 * Mutates and returns the event, matching Sentry's beforeSend contract.
 */
export function scrubEvent<T>(event: T): T {
  const e = event as Record<string, unknown>;
  const seen = new WeakSet<object>();

  scrubField(e, 'message');

  const exception = e.exception as
    { values?: Array<Record<string, unknown>> } | undefined;
  exception?.values?.forEach((v) => {
    scrubField(v, 'value');
  });

  const breadcrumbs = e.breadcrumbs as
    Array<Record<string, unknown>> | undefined;
  breadcrumbs?.forEach((b) => {
    scrubField(b, 'message');
    // fetch/xhr breadcrumbs carry the URL in data.url and navigation ones carry
    // data.from/data.to, but the console integration puts raw call arguments —
    // error objects included — in data.arguments, so this walks the whole tree.
    if (b.data) scrubDeep(b.data, 0, seen);
  });

  // url and query_string are the obvious carriers, but headers.Referer holds
  // the previous URL, which for a magic-link login is the token-bearing
  // callback. Walking the whole object covers those and request.data alike.
  if (e.request) scrubDeep(e.request, 0, seen);

  return event;
}
