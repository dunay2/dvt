import {
  CanvasBlockedStateView,
  CanvasEmptyStateView,
  CanvasErrorStateView,
  CanvasLoadingStateView,
} from './CanvasStateViews';
import { canvasViewCopy } from './copy';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { useCanvasController } from './useCanvasController';

type CanvasControllerSurfaceState = Pick<
  ReturnType<typeof useCanvasController>,
  'backendBlockMessage'
>;

type RenderCanvasCenterSurfaceArgs = {
  controller: CanvasControllerSurfaceState;
  presentationState: CanvasDraftPresentationState;
  draftTransportError: CanvasDraftTransportErrorState | null;
  workbenchErrorMessage: string | null;
  canEditEdges: boolean;
};

type CanvasWorkbenchSurfaceArgs = Pick<
  RenderCanvasCenterSurfaceArgs,
  'controller' | 'presentationState' | 'workbenchErrorMessage' | 'canEditEdges'
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

function renderCanvasBackendWorkbenchSurface(args: Pick<
  CanvasWorkbenchSurfaceArgs,
  'controller' | 'presentationState'
>) {
  const {
    controller,
    presentationState: { routeState },
  } = args;

  if (routeState === 'loading_backend') {
    return (
      <CanvasLoadingStateView
        title={canvasViewCopy.backendLoadingTitle}
        message={canvasViewCopy.backendLoadingMessage}
      />
    );
  }

  if (routeState === 'blocked_backend') {
    return (
      <CanvasBlockedStateView
        message={controller.backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage}
      />
    );
  }

  return null;
}

function renderCanvasGraphWorkbenchSurface(args: Pick<
  CanvasWorkbenchSurfaceArgs,
  'presentationState' | 'workbenchErrorMessage'
>) {
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

function renderCanvasEmptyWorkbenchSurface(args: Pick<
  CanvasWorkbenchSurfaceArgs,
  'presentationState' | 'canEditEdges'
>) {
  const {
    presentationState: { routeState },
    canEditEdges,
  } = args;

  if (routeState !== 'empty') {
    return null;
  }

  return (
    <CanvasEmptyStateView
      message={
        canEditEdges
          ? canvasViewCopy.routeEmptyEditableMessage
          : canvasViewCopy.routeEmptyReadOnlyMessage
      }
    />
  );
}

function renderCanvasWorkbenchSurface(args: {
  controller: CanvasControllerSurfaceState;
  presentationState: CanvasDraftPresentationState;
  workbenchErrorMessage: string | null;
  canEditEdges: boolean;
}) {
  const backendSurface = renderCanvasBackendWorkbenchSurface(args);
  if (backendSurface != null) {
    return backendSurface;
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
    controller: args.controller,
    presentationState: args.presentationState,
    workbenchErrorMessage: args.workbenchErrorMessage,
    canEditEdges: args.canEditEdges,
  });
}
