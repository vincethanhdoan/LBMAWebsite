import type { ComponentProps, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';

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
        hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40 transition-colors
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
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
    </div>
  );
}
