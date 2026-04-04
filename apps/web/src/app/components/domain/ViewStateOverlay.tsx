import type { ReactNode } from 'react';

import { AlertTriangle, Info, LoaderCircle } from 'lucide-react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';

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
    return <LoaderCircle className="size-5 animate-spin text-slate-300" />;
  }
  if (kind === 'error') {
    return <AlertTriangle className="size-5 text-red-400" />;
  }
  return <Info className="size-5 text-slate-300" />;
}

export function ViewStateOverlay({
  kind,
  title,
  description,
  action,
  detail,
}: ViewStateOverlayProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{resolveIcon(kind)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium text-slate-100">{title}</div>
          <p className="text-sm text-slate-400">{description}</p>
          {detail ? <div className="text-sm text-slate-300">{detail}</div> : null}
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
