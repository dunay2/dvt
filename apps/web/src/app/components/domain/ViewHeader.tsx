import type { ReactNode } from 'react';

import { Card } from '../ui/card';
import { cn } from '../ui/utils';

type ViewHeaderProps = {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly icon?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
};

export function ViewHeader({ title, subtitle, icon, actions, className }: ViewHeaderProps) {
  return (
    <Card className={cn('border-slate-700 bg-slate-900 px-6 py-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon ? <div className="mt-0.5 text-slate-200">{icon}</div> : null}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-50">{title}</h1>
            {subtitle ? <div className="text-sm text-slate-400">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}
