import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Rendered in place of children when a child throws. Receives a reset callback. */
  fallback: (reset: () => void) => React.ReactNode;
  /** Changing this value clears the error state — e.g. the active tab id. */
  resetKey?: string | number;
  /** Called once per caught error, for reporting. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) return this.props.fallback(this.reset);
    return this.props.children;
  }
}
