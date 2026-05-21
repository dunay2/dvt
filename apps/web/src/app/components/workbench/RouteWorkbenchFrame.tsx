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
  readonly slots: RouteWorkbenchFrameSlots;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly bodyContainerClassName?: string;
  readonly scroll?: boolean;
};

export type RouteWorkbenchFrameSlots = Readonly<{
  leftPanel?: ReactNode;
  primarySurface: ReactNode;
  rightPanel?: ReactNode;
  bottomDrawer?: ReactNode;
}>;

function RouteWorkbenchSlotLayout({ slots }: { readonly slots: RouteWorkbenchFrameSlots }) {
  return (
    <div data-slot="route-workbench-slot-stack" className="flex h-full min-h-0 flex-col gap-4">
      <div data-slot="route-workbench-slot-layout" className="flex min-h-0 flex-1 gap-4">
        {slots.leftPanel ? (
          <aside
            data-slot="route-workbench-left-panel"
            className="min-h-0 w-72 shrink-0 overflow-hidden"
          >
            {slots.leftPanel}
          </aside>
        ) : null}
        <main data-slot="route-workbench-primary-surface" className="min-w-0 flex-1">
          {slots.primarySurface}
        </main>
        {slots.rightPanel ? (
          <aside
            data-slot="route-workbench-right-panel"
            className="min-h-0 w-80 shrink-0 overflow-hidden"
          >
            {slots.rightPanel}
          </aside>
        ) : null}
      </div>
      {slots.bottomDrawer ? (
        <section
          data-slot="route-workbench-bottom-drawer"
          className="min-h-0 shrink-0 overflow-hidden"
        >
          {slots.bottomDrawer}
        </section>
      ) : null}
    </div>
  );
}

export function RouteWorkbenchFrame({
  header,
  slots,
  className,
  bodyClassName,
  bodyContainerClassName,
  scroll = true,
}: RouteWorkbenchFrameProps) {
  const routeBody = <RouteWorkbenchSlotLayout slots={slots} />;
  const bodyContent = bodyContainerClassName ? (
    <div className={bodyContainerClassName}>{routeBody}</div>
  ) : (
    routeBody
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
