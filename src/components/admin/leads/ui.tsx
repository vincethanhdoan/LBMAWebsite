import type { ComponentProps, ReactNode } from 'react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';

// Shared 48px-min touch target for leads action buttons (list rows, detail
// panel action bar, record-outcome trigger). Keeps every inline lead action at
// one tap-friendly size.
export function ActionButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      size="sm"
      className={`min-h-12${className ? ` ${className}` : ''}`}
      {...props}
    />
  );
}

export function Surface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl shadow-sm overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  count,
  alert = false,
  hint,
  action,
}: {
  title: string;
  count?: number;
  alert?: boolean;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[11px] font-bold rounded-full px-2 py-0.5 leading-none ${
            alert
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
      {hint && (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      )}
      <div className="flex-1" />
      {action}
    </div>
  );
}

type StatusKind =
  | 'confirmed'
  | 'unconfirmed'
  | 'attended'
  | 'no_show'
  | 'closed'
  | 'denied'
  | 'new';

const BADGE: Record<StatusKind, { label: string; cls: string }> = {
  confirmed: {
    label: 'Confirmed',
    cls: 'bg-status-success-bg text-status-success-fg border-status-success-border',
  },
  unconfirmed: {
    label: 'Not confirmed',
    cls: 'bg-status-warning-bg text-status-warning-fg border-status-warning-border',
  },
  attended: {
    label: 'Attended',
    cls: 'bg-status-success-bg text-status-success-fg border-status-success-border',
  },
  no_show: {
    label: 'No-show',
    cls: 'bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border',
  },
  closed: {
    label: 'Closed',
    cls: 'bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border',
  },
  denied: {
    label: 'Denied',
    cls: 'bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border',
  },
  new: {
    label: 'New',
    cls: 'bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border',
  },
};

export function StatusBadge({ kind }: { kind: StatusKind }) {
  const { label, cls } = BADGE[kind];
  return (
    <span
      className={`text-[11px] font-bold rounded-full border px-2 py-0.5 whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

export function LeadRow({
  leading,
  title,
  titleMeta,
  line2,
  badge,
  action,
  onOpen,
  highlighted = false,
  id,
  dimmed = false,
}: {
  leading?: ReactNode;
  title: string;
  titleMeta?: string;
  line2?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  onOpen: () => void;
  highlighted?: boolean;
  id?: string;
  dimmed?: boolean;
}) {
  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0 cursor-pointer
        hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40
        focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-inset transition-colors
        ${highlighted ? 'ring-2 ring-primary ring-inset' : ''} ${dimmed ? 'opacity-60' : ''}`}
    >
      {leading}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">
          {title}
          {titleMeta && (
            <span className="font-normal text-muted-foreground">
              {' '}
              · {titleMeta}
            </span>
          )}
        </div>
        {line2 && (
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {line2}
          </div>
        )}
      </div>
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {badge}
        {action}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
    </div>
  );
}

// One placeholder row, shaped to match LeadRow (two text lines, a trailing
// badge, and a chevron-sized spacer). Compose several inside a Surface to
// stand in for a loading list.
export function LeadRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0">
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
      <div className="w-4 h-4 flex-shrink-0" />
    </div>
  );
}

export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card px-6 py-10 text-center">
      <p className="text-[15px] font-medium">{message}</p>
      <p className="text-[13px] text-muted-foreground mt-1">
        Check your connection and try again.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

type PillTone = 'neutral' | 'warning' | 'primary';

const PILL_TONE: Record<PillTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  primary: 'bg-primary text-primary-foreground',
};

// Small rounded label. Pass onDismiss to add a trailing clear button (the
// filter-chip case); otherwise it renders as a plain status/count chip.
export function Pill({
  tone = 'neutral',
  onDismiss,
  dismissLabel,
  children,
}: {
  tone?: PillTone;
  onDismiss?: () => void;
  dismissLabel?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full ${
        onDismiss ? 'pl-3 pr-1.5 py-1' : 'px-2 py-0.5'
      } ${PILL_TONE[tone]}`}
    >
      {children}
      {onDismiss && (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-foreground/10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Empty-list placeholder. `plain` is a muted one-liner (optionally with an
// action beneath it); `celebrate` adds an icon and headline for the
// nothing-left-to-do state.
export function EmptyState({
  variant = 'plain',
  message,
  headline,
  action,
}: {
  variant?: 'plain' | 'celebrate';
  message: string;
  headline?: string;
  action?: ReactNode;
}) {
  if (variant === 'celebrate') {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
        <p className="mt-3 text-[15px] font-semibold">{headline}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{message}</p>
        {action}
      </div>
    );
  }
  return (
    <div className="py-8 text-center">
      <p className="text-[13px] text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
