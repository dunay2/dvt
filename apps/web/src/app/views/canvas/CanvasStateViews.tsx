/** Owned concern: render governed Canvas state views and read-only banners from route presentation models. */
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasReadOnlyState } from './canvasWorkbenchStateModel';
import { CanvasAddNodePalette } from './CanvasAddNodePalette';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import { buildCanvasOutputTargetTemplateCatalog } from './canvasOutputTargetTemplateCatalog';
import { buildCanvasTransformationTemplateCatalog } from './canvasTransformationTemplateCatalog';
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
  firstNodeLabel,
  firstNodeHelper,
}: Readonly<{
  nodeKinds: readonly NodeKindRegistration[];
  onCreateAuthoringNode: CreateCanvasAuthoringNode;
  firstNodeLabel: string;
  firstNodeHelper: string;
}>) {
  const transformationTemplates = buildCanvasTransformationTemplateCatalog(nodeKinds);
  const outputTargetTemplates = buildCanvasOutputTargetTemplateCatalog(nodeKinds);

  return (
    <div data-slot="canvas-empty-authoring-catalog" className="mt-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-(--text-default)">{firstNodeLabel}</h3>
        <p className={cn('mt-1 text-xs', routeWorkbenchMutedTextClassName)}>{firstNodeHelper}</p>
      </div>
      <CanvasAddNodePalette
        nodeKinds={nodeKinds}
        onCreateAuthoringNode={onCreateAuthoringNode}
        transformationTemplates={transformationTemplates}
        outputTargetTemplates={outputTargetTemplates}
        triggerLabel={firstNodeLabel}
      />
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
  canvasTitle = null,
  title = canvasViewCopy.routeEmptyTitle,
  message = canvasViewCopy.routeEmptyEditableMessage,
  firstNodeLabel = canvasViewCopy.routeEmptyFirstNodeLabel,
  firstNodeHelper = canvasViewCopy.routeEmptyFirstNodeHelper,
  nodeKinds = [],
  onCreateAuthoringNode,
  emptyStateGuideVisible = true,
  onEmptyStateGuideVisibilityChange,
}: Readonly<{
  canvasTitle?: string | null;
  title?: string;
  message?: string;
  firstNodeLabel?: string;
  firstNodeHelper?: string;
  nodeKinds?: readonly NodeKindRegistration[];
  onCreateAuthoringNode?: CreateCanvasAuthoringNode;
  emptyStateGuideVisible?: boolean;
  onEmptyStateGuideVisibilityChange?: (visible: boolean) => void;
}>) {
  const canCreateAuthoringNode = onCreateAuthoringNode != null && nodeKinds.length > 0;

  return (
    <CanvasSurfaceStateCard dataSlot="canvas-empty-state" title={title} message={message}>
      {canvasTitle != null ? (
        <p
          data-slot="canvas-empty-active-canvas"
          className={cn('mt-1 text-xs font-medium', routeWorkbenchMutedTextClassName)}
        >
          {canvasTitle}
        </p>
      ) : null}
      {canCreateAuthoringNode ? (
        <CanvasEmptyAuthoringCatalog
          nodeKinds={nodeKinds}
          onCreateAuthoringNode={onCreateAuthoringNode}
          firstNodeLabel={firstNodeLabel}
          firstNodeHelper={firstNodeHelper}
        />
      ) : null}
      {onEmptyStateGuideVisibilityChange != null ? (
        <label
          data-slot="canvas-empty-guide-preference-row"
          className={cn(
            'mt-5 flex items-center gap-2 border-t border-[color:var(--border-default)] pt-4 text-xs',
            routeWorkbenchMutedTextClassName
          )}
        >
          <input
            data-slot="canvas-empty-guide-preference"
            type="checkbox"
            checked={emptyStateGuideVisible}
            onChange={(event) => {
              onEmptyStateGuideVisibilityChange(event.currentTarget.checked);
            }}
            className="size-4 accent-[var(--text-accent)]"
          />
          <span>{canvasViewCopy.toolbarEmptyCanvasGuideLabel}</span>
        </label>
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

export function CanvasReadOnlyBannerView({
  state,
  onRequestExecutableScope,
}: Readonly<{ state: CanvasReadOnlyState; onRequestExecutableScope?: () => void }>) {
  if (state == null) {
    return null;
  }

  return (
    <div
      data-slot="canvas-readonly-state"
      className="border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-3 py-1.5 text-xs"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-[var(--status-readonly)]">{state.title}</span>
        <span className={cn('min-w-0', routeWorkbenchMutedTextClassName)}>{state.message}</span>
        <span className={cn('min-w-0', routeWorkbenchMutedTextClassName)}>{state.note}</span>
        {onRequestExecutableScope != null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onRequestExecutableScope}
          >
            {canvasViewCopy.readOnlyActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
