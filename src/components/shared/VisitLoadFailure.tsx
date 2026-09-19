interface VisitLoadFailureProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// Shared by VisitPicker's own fetch failures and TrialVisitStep's chunk-load
// fallback. Stays free of react-day-picker (or anything else heavy) since
// TrialVisitStep renders it from the entry chunk.
export function VisitLoadFailure({
  message,
  onRetry,
  retryLabel,
}: VisitLoadFailureProps) {
  return (
    <div className="text-center py-4">
      <p role="alert" className="text-sm text-destructive">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-[44px] px-4 rounded-lg border-2 border-border text-sm font-semibold hover:border-primary/50 hover:bg-muted/50 transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
