import { describe, it, expect } from 'vitest';
import { scrubEventOrDrop } from './sentry';

describe('scrubEventOrDrop', () => {
  it('returns the scrubbed event on the normal path', () => {
    expect(scrubEventOrDrop({ message: 'login failed for a@b.com' })).toEqual({
      message: 'login failed for [redacted-email]',
    });
  });

  it('drops the event instead of throwing when scrubbing fails', () => {
    // A getter that throws stands in for any future scrubber fault: the
    // contract under test is that beforeSend never propagates, because a throw
    // makes Sentry emit an internal event that bypasses beforeSend entirely.
    const hostile = {
      get message(): string {
        throw new Error('scrubber fault');
      },
    };

    expect(scrubEventOrDrop(hostile)).toBeNull();
  });
});
