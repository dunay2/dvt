/**
 * Owned concern: render governed Canvas center-surface states from canonical route posture and draft transport posture.
 */
import {
  CanvasBlockedStateView,
  CanvasEmptyStateView,
  CanvasErrorStateView,
  CanvasLoadingStateView,
} from './CanvasStateViews';
import { canvasViewCopy } from './copy';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { CanvasRouteStartupBlockState } from './canvasRouteInteractionState';

type RenderCanvasCenterSurfaceArgs = {
  presentationState: CanvasDraftPresentationState;
  startupBlockState: CanvasRouteStartupBlockState | null;
  draftTransportError: CanvasDraftTransportErrorState | null;
  workbenchErrorMessage: string | null;
  canEditEdges: boolean;
  canOpenSourceImport: boolean;
};

type CanvasWorkbenchSurfaceArgs = Pick<
  RenderCanvasCenterSurfaceArgs,
  | 'presentationState'
  | 'startupBlockState'
  | 'workbenchErrorMessage'
  | 'canEditEdges'
  | 'canOpenSourceImport'
>;

function renderCanvasDraftTransportSurface(
  draftTransportError: CanvasDraftTransportErrorState | null
) {
  if (draftTransportError?.kind === 'forbidden') {
    return (
      <CanvasBlockedStateView
        title={draftTransportError.title}
        message={draftTransportError.message}
      />
    );
  }

  if (draftTransportError != null) {
    return (
      <CanvasErrorStateView
        title={draftTransportError.title}
        message={draftTransportError.message}
      />
    );
  }

  return null;
}

function renderCanvasStartupWorkbenchSurface(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'presentationState' | 'startupBlockState'>
) {
  const { presentationState, startupBlockState } = args;
  const { routeState } = presentationState;

  if (routeState === 'loading_backend') {
    return (
      <CanvasLoadingStateView
        title={canvasViewCopy.backendLoadingTitle}
        message={canvasViewCopy.backendLoadingMessage}
      />
    );
  }

  if (routeState === 'blocked_runtime') {
    return (
      <CanvasBlockedStateView
        title={startupBlockState?.title ?? canvasViewCopy.runtimeBlockedTitle}
        message={startupBlockState?.message ?? canvasViewCopy.runtimeBlockedFallbackMessage}
      />
    );
  }

  if (routeState === 'blocked_backend') {
    return (
      <CanvasBlockedStateView
        title={startupBlockState?.title ?? canvasViewCopy.backendBlockedTitle}
        message={startupBlockState?.message ?? canvasViewCopy.backendBlockedFallbackMessage}
      />
    );
  }

  return null;
}

function renderCanvasGraphWorkbenchSurface(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'presentationState' | 'workbenchErrorMessage'>
) {
  const {
    presentationState: { routeState },
    workbenchErrorMessage,
  } = args;

  if (routeState === 'loading_graph') {
    return <CanvasLoadingStateView />;
  }

  if (routeState === 'error_graph') {
    return (
      <CanvasErrorStateView
        message={workbenchErrorMessage || canvasViewCopy.routeErrorFallbackMessage}
      />
    );
  }

  return null;
}

function resolveCanvasEmptyWorkbenchMessage(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'canEditEdges' | 'canOpenSourceImport'>
) {
  const { canEditEdges, canOpenSourceImport } = args;

  if (!canEditEdges) {
    return canvasViewCopy.routeEmptyReadOnlyMessage;
  }

  if (!canOpenSourceImport) {
    return canvasViewCopy.routeEmptyImportUnavailableMessage;
  }

  return canvasViewCopy.routeEmptyEditableMessage;
}

function renderCanvasEmptyWorkbenchSurface(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    'presentationState' | 'canEditEdges' | 'canOpenSourceImport'
  >
) {
  const {
    presentationState: { routeState },
    canEditEdges,
    canOpenSourceImport,
  } = args;

  if (routeState !== 'empty') {
    return null;
  }

  return (
    <CanvasEmptyStateView
      message={resolveCanvasEmptyWorkbenchMessage({
        canEditEdges,
        canOpenSourceImport,
      })}
    />
  );
}

function renderCanvasWorkbenchSurface(args: CanvasWorkbenchSurfaceArgs) {
  const startupSurface = renderCanvasStartupWorkbenchSurface(args);
  if (startupSurface != null) {
    return startupSurface;
  }

  const graphSurface = renderCanvasGraphWorkbenchSurface(args);
  if (graphSurface != null) {
    return graphSurface;
  }

  const emptySurface = renderCanvasEmptyWorkbenchSurface(args);
  if (emptySurface != null) {
    return emptySurface;
  }

  return undefined;
}

export function renderCanvasCenterSurface(args: RenderCanvasCenterSurfaceArgs) {
  const draftTransportSurface = renderCanvasDraftTransportSurface(args.draftTransportError);
  if (draftTransportSurface != null) {
    return draftTransportSurface;
  }

  return renderCanvasWorkbenchSurface({
    presentationState: args.presentationState,
    startupBlockState: args.startupBlockState,
    workbenchErrorMessage: args.workbenchErrorMessage,
    canEditEdges: args.canEditEdges,
    canOpenSourceImport: args.canOpenSourceImport,
  });
}
