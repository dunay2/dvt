import type { ReactNode } from 'react';

import { AlertTriangle, Info, LoaderCircle } from 'lucide-react';

import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
  routeWorkbenchSubtleTextClassName,
} from '../workbench/RouteWorkbenchFrame';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';

type ViewStateKind = 'loading' | 'error' | 'empty';

type ViewStateOverlayProps = {
  readonly kind: ViewStateKind;
  readonly title: string;
  readonly description: string;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
  readonly detail?: ReactNode;
};

function resolveIcon(kind: ViewStateKind): ReactNode {
  if (kind === 'loading') {
    return <LoaderCircle className="size-5 animate-spin text-[var(--text-muted)]" />;
  }
  if (kind === 'error') {
    return <AlertTriangle className="size-5 text-[var(--status-danger)]" />;
  }
  return <Info className="size-5 text-[var(--text-muted)]" />;
}

export function ViewStateOverlay({
  kind,
  title,
  description,
  action,
  detail,
}: ViewStateOverlayProps) {
  return (
    <Card data-slot="view-state-overlay" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{resolveIcon(kind)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium text-[var(--text-strong)]">{title}</div>
          <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{description}</p>
          {detail ? <div className={cn('text-sm', routeWorkbenchSubtleTextClassName)}>{detail}</div> : null}
          {action ? (
            <Button className="mt-2" size="sm" variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
