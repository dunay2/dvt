import type { ReactNode } from 'react';

import {
  routeWorkbenchBodyPaddingClassName,
  routeWorkbenchClassName,
  routeWorkbenchHeaderBandClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { cn } from '../../components/ui/utils';

interface RunStateFrameProps {
  title: string;
  children: ReactNode;
}

export function RunStateFrame({ title, children }: RunStateFrameProps) {
  return (
    <div data-slot="runs-state-frame" className={routeWorkbenchClassName}>
      <div
        data-slot="runs-state-header"
        className={cn(routeWorkbenchHeaderBandClassName, 'flex h-12 items-center px-4 py-0')}
      >
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div data-slot="runs-state-body" className={cn('flex-1', routeWorkbenchBodyPaddingClassName)}>
        {children}
      </div>
    </div>
  );
}
