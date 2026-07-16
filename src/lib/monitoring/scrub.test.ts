import { describe, it, expect } from 'vitest';
import { scrubText, scrubEvent } from './scrub';

describe('scrubText', () => {
  it('redacts email addresses', () => {
    expect(scrubText('failed for parent@example.com on save')).toBe(
      'failed for [redacted-email] on save',
    );
  });

  it('redacts emails with a plus tag', () => {
    expect(scrubText('failed for a+b@x.com on save')).toBe(
      'failed for [redacted-email] on save',
    );
  });

  it('redacts emails inside a URL query string', () => {
    expect(scrubText('GET https://x.test/admin?q=parent@example.com 404')).toBe(
      'GET https://x.test/admin?q=[redacted-email] 404',
    );
  });

  it('redacts percent-encoded emails', () => {
    expect(scrubText('https://x.test/admin?q=parent%40example.com')).toBe(
      'https://x.test/admin?q=[redacted-email]',
    );
  });

  it('redacts phone numbers in common formats', () => {
    expect(scrubText('called (209) 555-0134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called 209-555-0134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called 209.555.0134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called 2095550134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called +1 209 555 0134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called +12095550134 twice')).toBe(
      'called [redacted-phone] twice',
    );
  });

  it('redacts long digit runs that could identify a person', () => {
    expect(scrubText('token 123456789012345 rejected')).toBe(
      'token [redacted-number] rejected',
    );
  });

  it('redacts sensitive query parameter values but keeps the name', () => {
    expect(
      scrubText('/auth/callback?token_hash=pkce_abcdef123456&type=email'),
    ).toBe('/auth/callback?token_hash=[redacted-token]&type=email');
    expect(scrubText('POST /token?code=abcdef')).toBe(
      'POST /token?code=[redacted-token]',
    );
    expect(
      scrubText('#access_token=aaa&refresh_token=bbb&token=ccc&type=magiclink'),
    ).toBe(
      '#access_token=[redacted-token]&refresh_token=[redacted-token]&token=[redacted-token]&type=magiclink',
    );
  });

  it('leaves UUIDs intact so records stay correlatable', () => {
    expect(scrubText('no lead for 550e8400-e29b-41d4-a716-446655440000')).toBe(
      'no lead for 550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('leaves benign text untouched', () => {
    expect(scrubText('Cannot read properties of null (reading slice)')).toBe(
      'Cannot read properties of null (reading slice)',
    );
  });

  it('does not mangle short numbers like error codes or dates', () => {
    expect(scrubText('HTTP 500 on 2026-07-15')).toBe('HTTP 500 on 2026-07-15');
  });
});

describe('scrubEvent', () => {
  it('scrubs exception values, messages, and breadcrumbs', () => {
    const event = {
      message: 'lookup failed for parent@example.com',
      exception: {
        values: [{ value: 'no lead for parent@example.com' }],
      },
      breadcrumbs: [
        { message: 'searched 209-555-0134' },
        { message: 'clicked save' },
      ],
      request: { url: 'https://x.test/admin?q=parent@example.com' },
    };

    const out = scrubEvent(event);

    expect(out.message).toBe('lookup failed for [redacted-email]');
    expect(out.exception.values[0].value).toBe('no lead for [redacted-email]');
    expect(out.breadcrumbs[0].message).toBe('searched [redacted-phone]');
    expect(out.breadcrumbs[1].message).toBe('clicked save');
    expect(out.request.url).toBe('https://x.test/admin?q=[redacted-email]');
  });

  it('scrubs the auth token out of request url and query string', () => {
    const event = {
      request: {
        url: 'https://x.test/auth/callback?token_hash=pkce_abc123&type=email',
        query_string: 'token_hash=pkce_abc123&type=email',
      },
    };

    const out = scrubEvent(event);

    expect(out.request.url).toBe(
      'https://x.test/auth/callback?token_hash=[redacted-token]&type=email',
    );
    expect(out.request.query_string).toBe(
      'token_hash=[redacted-token]&type=email',
    );
  });

  it('scrubs string values inside breadcrumb data', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'navigation',
          data: {
            from: '/auth/callback?token_hash=pkce_abc123&type=email',
            to: '/dashboard?q=parent@example.com',
          },
        },
        {
          category: 'fetch',
          data: {
            url: 'https://x.test/rest/v1/guardians?phone=eq.2095550134',
            status_code: 400,
          },
        },
      ],
    };

    const out = scrubEvent(event);

    expect(out.breadcrumbs[0].data.from).toBe(
      '/auth/callback?token_hash=[redacted-token]&type=email',
    );
    expect(out.breadcrumbs[0].data.to).toBe('/dashboard?q=[redacted-email]');
    expect(out.breadcrumbs[1].data.url).toBe(
      'https://x.test/rest/v1/guardians?phone=eq.[redacted-phone]',
    );
    expect(out.breadcrumbs[1].data.status_code).toBe(400);
  });

  it('tolerates an event with no optional fields', () => {
    expect(scrubEvent({})).toStrictEqual({});
  });
});
