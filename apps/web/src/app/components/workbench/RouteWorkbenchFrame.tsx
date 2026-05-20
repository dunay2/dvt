/** Owned concern: provide the route-level workbench frame, layout tokens, and shared panel classes. */
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
  'border border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-default)]';

export const routeWorkbenchMutedTextClassName = 'text-[var(--text-muted)]';

export const routeWorkbenchSubtleTextClassName = 'text-[var(--text-subtle)]';

export const routeWorkbenchSectionTitleClassName =
  'mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]';

export const routeWorkbenchTabListClassName =
  'border border-[color:var(--border-default)] bg-[var(--surface-app)]';

export const routeWorkbenchTabTriggerClassName =
  'text-[var(--text-muted)] data-[state=active]:bg-[var(--surface-elevated)] data-[state=active]:text-[var(--text-strong)]';

export const routeWorkbenchMonacoSurfaceClassName =
  'h-[420px] overflow-hidden rounded border border-[color:var(--border-default)] bg-[var(--surface-app)]';

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
    <div data-slot="route-workbench-frame" className={cn(routeWorkbenchClassName, className)}>
      {header ? (
        <div data-slot="route-workbench-header" className="shrink-0">
          {header}
        </div>
      ) : null}
      {scroll ? (
        <ScrollArea data-slot="route-workbench-body" className={routeWorkbenchScrollAreaClassName}>
          <div
            data-slot="route-workbench-body-content"
            className={cn(routeWorkbenchBodyPaddingClassName, bodyClassName)}
          >
            {bodyContent}
          </div>
        </ScrollArea>
      ) : (
        <div
          data-slot="route-workbench-body"
          className={cn(routeWorkbenchScrollAreaClassName, bodyClassName)}
        >
          {bodyContent}
        </div>
      )}
    </div>
  );
}
