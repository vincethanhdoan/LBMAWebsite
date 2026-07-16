import { describe, it, expect } from 'vitest';
import { scrubText, scrubEvent } from './scrub';

describe('scrubText', () => {
  it('redacts email addresses', () => {
    expect(scrubText('failed for parent@example.com on save')).toBe(
      'failed for [redacted-email] on save',
    );
  });

  it('redacts phone numbers in common formats', () => {
    expect(scrubText('called (209) 555-0134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called 209-555-0134 twice')).toBe(
      'called [redacted-phone] twice',
    );
    expect(scrubText('called 2095550134 twice')).toBe(
      'called [redacted-phone] twice',
    );
  });

  it('redacts long digit runs that could identify a person', () => {
    expect(scrubText('token 123456789012345 rejected')).toBe(
      'token [redacted-number] rejected',
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

  it('tolerates an event with no optional fields', () => {
    expect(scrubEvent({})).toEqual({});
  });
});
