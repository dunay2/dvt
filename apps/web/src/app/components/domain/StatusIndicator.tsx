import type { ReactNode } from 'react';

import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';

type StatusIndicatorState = 'ok' | 'degraded' | 'warning' | 'error';

type StatusIndicatorProps = {
  readonly state: StatusIndicatorState;
  readonly label: string;
  readonly icon?: ReactNode;
};

const statusClasses: Record<StatusIndicatorState, string> = {
  ok: 'border-[color:var(--status-success)] text-[var(--status-success)]',
  degraded: 'border-[color:var(--status-degraded)] text-[var(--status-degraded)]',
  warning: 'border-[color:var(--status-warning)] text-[var(--status-warning)]',
  error: 'border-[color:var(--status-danger)] text-[var(--status-danger)]',
};

export function StatusIndicator({ state, label, icon }: StatusIndicatorProps) {
  return (
    <Badge
      data-slot="status-indicator"
      variant="outline"
      className={cn('gap-1.5 bg-transparent', statusClasses[state])}
    >
      {icon}
      {label}
    </Badge>
  );
}
