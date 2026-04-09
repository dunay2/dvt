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
  ok: 'border-emerald-500 text-emerald-300',
  degraded: 'border-amber-500 text-amber-300',
  warning: 'border-yellow-500 text-yellow-300',
  error: 'border-red-500 text-red-300',
};

export function StatusIndicator({ state, label, icon }: StatusIndicatorProps) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 bg-transparent', statusClasses[state])}>
      {icon}
      {label}
    </Badge>
  );
}
