import type { ReactNode } from 'react';

import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../ui/utils';

export const routeWorkbenchClassName =
  'flex h-full min-h-0 flex-col bg-[var(--surface-route)] text-[var(--text-default)]';

export const routeWorkbenchHeaderBandClassName =
  'border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-6 py-4';

export const routeWorkbenchBodyPaddingClassName = 'p-6 pb-10';

export const routeWorkbenchScrollAreaClassName = 'min-h-0 flex-1';

export const routeWorkbenchPanelClassName =
  'border-[color:var(--border-default)] bg-[var(--surface-panel)] text-[var(--text-default)]';

export const routeWorkbenchFieldClassName =
  'border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-default)]';

export const routeWorkbenchMutedTextClassName = 'text-[var(--text-muted)]';

type RouteWorkbenchFrameProps = {
  readonly header?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly bodyContainerClassName?: string;
  readonly scroll?: boolean;
};

export function RouteWorkbenchFrame({
  header,
  children,
  className,
  bodyClassName,
  bodyContainerClassName,
  scroll = true,
}: RouteWorkbenchFrameProps) {
  const bodyContent = bodyContainerClassName ? (
    <div className={bodyContainerClassName}>{children}</div>
  ) : (
    children
  );

  return (
    <div className={cn(routeWorkbenchClassName, className)}>
      {header}
      {scroll ? (
        <ScrollArea className={routeWorkbenchScrollAreaClassName}>
          <div className={cn(routeWorkbenchBodyPaddingClassName, bodyClassName)}>{bodyContent}</div>
        </ScrollArea>
      ) : (
        <div className={cn(routeWorkbenchScrollAreaClassName, bodyClassName)}>{bodyContent}</div>
      )}
    </div>
  );
}
