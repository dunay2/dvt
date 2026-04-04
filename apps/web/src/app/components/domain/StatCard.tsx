import type { ReactNode } from 'react';

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
  default: 'text-slate-200',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  info: 'text-blue-400',
};

export function StatCard({ icon, value, label, trend, tone = 'default' }: StatCardProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className={cn('flex items-center gap-2', toneClasses[tone])}>
          <div className="shrink-0">{icon}</div>
          <span className="text-2xl font-semibold">{value}</span>
        </div>
        {trend ? <div className="text-xs text-slate-300">{trend}</div> : null}
      </div>
      <p className="text-sm text-slate-300">{label}</p>
    </Card>
  );
}
