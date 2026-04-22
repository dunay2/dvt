/** Owned concern: render governed Canvas state views and read-only banners from route presentation models. */
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { WorkbenchReadOnlyState } from '../../components/workbench/state/WorkbenchStates';
import type { CanvasReadOnlyState } from './canvasWorkbenchStateModel';
import { canvasViewCopy } from './copy';

function CanvasSurfaceStateCard({
  dataSlot,
  title,
  message,
  tone = 'default',
}: Readonly<{
  dataSlot: string;
  title: string;
  message: string;
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
      </Card>
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
}: Readonly<{
  message?: string;
}>) {
  return (
    <CanvasSurfaceStateCard
      dataSlot="canvas-empty-state"
      title={canvasViewCopy.routeEmptyTitle}
      message={message}
    />
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
