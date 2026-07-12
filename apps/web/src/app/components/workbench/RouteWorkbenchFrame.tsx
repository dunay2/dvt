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

type RouteWorkbenchFrameProps = {
  readonly header?: ReactNode;
  readonly slots: RouteWorkbenchFrameSlots;
  readonly presentationMode?: RouteWorkbenchPresentationMode;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly bodyContainerClassName?: string;
  readonly scroll?: boolean;
};

export type RouteWorkbenchPresentationMode = 'route' | 'embedded';

export type RouteWorkbenchFrameSlots = Readonly<{
  leftPanel?: ReactNode;
  primarySurface: ReactNode;
  rightPanel?: ReactNode;
  bottomDrawer?: ReactNode;
}>;

function RouteWorkbenchSlotLayout({
  slots,
  primarySurfaceClassName,
  presentationMode,
}: {
  readonly slots: RouteWorkbenchFrameSlots;
  readonly primarySurfaceClassName?: string;
  readonly presentationMode: RouteWorkbenchPresentationMode;
}) {
  const isEmbedded = presentationMode === 'embedded';

  return (
    <div
      data-slot="route-workbench-slot-stack"
      className={cn('flex h-full min-h-0 flex-col', isEmbedded ? 'gap-3' : 'gap-4')}
    >
      <div
        data-slot="route-workbench-slot-layout"
        className={cn('flex min-h-0 flex-1', isEmbedded ? 'gap-3' : 'gap-4')}
      >
        {slots.leftPanel ? (
          <aside
            data-slot="route-workbench-left-panel"
            className={cn('min-h-0 shrink-0 overflow-hidden', isEmbedded ? 'w-48' : 'w-72')}
          >
            {slots.leftPanel}
          </aside>
        ) : null}
        <main
          data-slot="route-workbench-primary-surface"
          className={cn('min-w-0 flex-1', primarySurfaceClassName)}
        >
          {slots.primarySurface}
        </main>
        {slots.rightPanel ? (
          <aside
            data-slot="route-workbench-right-panel"
            className={cn('min-h-0 shrink-0 overflow-hidden', isEmbedded ? 'w-56' : 'w-80')}
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
  presentationMode = 'route',
  className,
  bodyClassName,
  bodyContainerClassName,
  scroll = true,
}: RouteWorkbenchFrameProps) {
  const bodyContent = (
    <RouteWorkbenchSlotLayout
      slots={slots}
      primarySurfaceClassName={bodyContainerClassName}
      presentationMode={presentationMode}
    />
  );

  return (
    <div
      data-slot="route-workbench-frame"
      data-presentation-mode={presentationMode}
      className={cn(routeWorkbenchClassName, className)}
    >
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
