/**
 * @vitest-environment jsdom
 */
import type React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom({ explode }: { explode: boolean }): React.ReactElement {
  if (explode) throw new Error('boom');
  return <p>all good</p>;
}

const fallback = (reset: () => void) => (
  <button onClick={reset}>try again</button>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary fallback={fallback}>
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeTruthy();
  });

  it('renders the fallback instead of propagating when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={fallback}>
        <Boom explode={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('try again')).toBeTruthy();
    expect(screen.queryByText('all good')).toBeNull();
  });

  it('calls onError with the thrown error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    render(
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Boom explode={true} />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('boom');
  });

  it('clears the error when resetKey changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary fallback={fallback} resetKey="leads">
        <Boom explode={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('try again')).toBeTruthy();

    rerender(
      <ErrorBoundary fallback={fallback} resetKey="settings">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeTruthy();
  });
});
