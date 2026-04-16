import type { ReactNode } from 'react';

import { routeWorkbenchPanelClassName } from '../workbench/RouteWorkbenchFrame';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';

type StatCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

type StatCardProps = {
  readonly icon: ReactNode;
  readonly value: ReactNode;
  readonly label: string;
  readonly trend?: ReactNode;
  readonly tone?: StatCardTone;
};

const toneClasses: Record<StatCardTone, string> = {
  default: 'text-[var(--text-default)]',
  success: 'text-[var(--status-success)]',
  warning: 'text-[var(--status-warning)]',
  danger: 'text-[var(--status-danger)]',
  info: 'text-[var(--status-info)]',
};

export function StatCard({ icon, value, label, trend, tone = 'default' }: StatCardProps) {
  return (
    <Card className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className={cn('flex items-center gap-2', toneClasses[tone])}>
          <div className="shrink-0">{icon}</div>
          <span className="text-2xl font-semibold">{value}</span>
        </div>
        {trend ? <div className="text-xs text-[var(--text-muted)]">{trend}</div> : null}
      </div>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </Card>
  );
}
