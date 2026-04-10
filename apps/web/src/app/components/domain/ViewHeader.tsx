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
    <Card
      className={cn(
        'border-[color:var(--border-default)] bg-[var(--surface-panel)] px-6 py-4 text-[var(--text-default)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon ? <div className="mt-0.5 text-[var(--text-muted)]">{icon}</div> : null}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-[var(--text-strong)]">{title}</h1>
            {subtitle ? <div className="text-sm text-[var(--text-muted)]">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}
