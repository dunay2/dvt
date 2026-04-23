/** Owned concern: render governed Canvas state views and read-only banners from route presentation models. */
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { WorkbenchReadOnlyState } from '../../components/workbench/state/WorkbenchStates';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasReadOnlyState } from './canvasWorkbenchStateModel';
import { canvasViewCopy } from './copy';

function CanvasSurfaceStateCard({
  dataSlot,
  title,
  message,
  children,
  tone = 'default',
}: Readonly<{
  dataSlot: string;
  title: string;
  message: string;
  children?: ReactNode;
  tone?: 'default' | 'danger';
}>) {
  return (
    <div data-slot={`${dataSlot}-frame`} className="flex flex-1 items-center justify-center p-6">
      <Card
        data-slot={dataSlot}
        className={cn(
          routeWorkbenchPanelClassName,
          'w-full max-w-xl p-6',
          tone === 'danger' && 'border-(--status-danger) bg-(--surface-elevated)'
        )}
      >
        <h2
          className={cn(
            'mb-2 text-base font-semibold',
            tone === 'danger' && 'text-(--status-danger)'
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            'text-sm',
            tone === 'danger' ? 'text-(--text-default)' : routeWorkbenchMutedTextClassName
          )}
        >
          {message}
        </p>
        {children}
      </Card>
    </div>
  );
}

function CanvasEmptyAuthoringCatalog({
  nodeKinds,
  onCreateAuthoringNode,
}: Readonly<{
  nodeKinds: readonly NodeKindRegistration[];
  onCreateAuthoringNode: (registration: NodeKindRegistration) => void;
}>) {
  return (
    <div data-slot="canvas-empty-authoring-catalog" className="mt-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-(--text-default)">
          {canvasViewCopy.routeEmptyFirstNodeLabel}
        </h3>
        <p className={cn('mt-1 text-xs', routeWorkbenchMutedTextClassName)}>
          {canvasViewCopy.routeEmptyFirstNodeHelper}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {nodeKinds.map((registration) => {
          const Icon = registration.icon;
          return (
            <Button
              key={registration.kind}
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => onCreateAuthoringNode(registration)}
            >
              <Icon className="size-4" />
              {registration.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function CanvasLoadingStateView({
  title = canvasViewCopy.routeLoadingTitle,
  message = canvasViewCopy.routeLoadingMessage,
}: Readonly<{
  title?: string;
  message?: string;
}>) {
  return <CanvasSurfaceStateCard dataSlot="canvas-loading-state" title={title} message={message} />;
}

export function CanvasEmptyStateView({
  message = canvasViewCopy.routeEmptyEditableMessage,
  nodeKinds = [],
  onCreateAuthoringNode,
}: Readonly<{
  message?: string;
  nodeKinds?: readonly NodeKindRegistration[];
  onCreateAuthoringNode?: (registration: NodeKindRegistration) => void;
}>) {
  const canCreateAuthoringNode = onCreateAuthoringNode != null && nodeKinds.length > 0;

  return (
    <CanvasSurfaceStateCard
      dataSlot="canvas-empty-state"
      title={canvasViewCopy.routeEmptyTitle}
      message={message}
    >
      {canCreateAuthoringNode ? (
        <CanvasEmptyAuthoringCatalog
          nodeKinds={nodeKinds}
          onCreateAuthoringNode={onCreateAuthoringNode}
        />
      ) : null}
    </CanvasSurfaceStateCard>
  );
}

export function CanvasErrorStateView({
  title = canvasViewCopy.routeErrorTitle,
  message,
}: Readonly<{
  title?: string;
  message: string;
}>) {
  return (
    <CanvasSurfaceStateCard
      dataSlot="canvas-error-state"
      title={title}
      message={message}
      tone="danger"
    />
  );
}

export function CanvasBlockedStateView({
  title = canvasViewCopy.backendBlockedTitle,
  message,
}: Readonly<{
  title?: string;
  message: string;
}>) {
  return (
    <CanvasSurfaceStateCard
      dataSlot="canvas-blocked-state"
      title={title}
      message={message}
      tone="danger"
    />
  );
}

export function CanvasReadOnlyBannerView({ state }: Readonly<{ state: CanvasReadOnlyState }>) {
  if (state == null) {
    return null;
  }

  return (
    <WorkbenchReadOnlyState
      dataSlot="canvas-readonly-state"
      className="rounded-none border-x-0 border-b border-t-0 px-4 py-3"
      title={state.title}
      message={state.message}
      note={state.note}
    />
  );
}
