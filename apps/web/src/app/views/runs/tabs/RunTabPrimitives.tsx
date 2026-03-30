import type { ReactNode } from 'react';

import { Card } from '../../../components/ui/card';
import { cn } from '../../../components/ui/utils';

type RunSurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

type RunStatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  valueClassName?: string;
};

export function RunSurfaceCard({ children, className }: Readonly<RunSurfaceCardProps>) {
  return <Card className={cn('border-slate-700 bg-slate-900', className)}>{children}</Card>;
}

export function RunStatCard({ label, value, icon, valueClassName }: Readonly<RunStatCardProps>) {
  return (
    <RunSurfaceCard className="p-4">
      <div className={cn('mb-2 flex items-center gap-2', valueClassName)}>
        {icon}
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <p className="text-sm text-slate-300">{label}</p>
    </RunSurfaceCard>
  );
}
