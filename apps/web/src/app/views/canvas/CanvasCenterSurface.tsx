/**
 * Owned concern: render the center workbench surface from canonical route posture.
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

type RenderCanvasCenterSurfaceArgs = {
  presentationState: CanvasDraftPresentationState;
  draftTransportError: CanvasDraftTransportErrorState | null;
  canEditEdges: boolean;
};

type CanvasWorkbenchSurfaceArgs = Pick<
  RenderCanvasCenterSurfaceArgs,
  'presentationState' | 'canEditEdges'
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
  'presentationState'
>) {
  const {
    presentationState: { bootstrapDetail, routeState },
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
    return <CanvasBlockedStateView message={bootstrapDetail} />;
  }

  return null;
}

function renderCanvasGraphWorkbenchSurface(args: Pick<
  CanvasWorkbenchSurfaceArgs,
  'presentationState'
>) {
  const {
    presentationState: { bootstrapDetail, routeState },
  } = args;

  if (routeState === 'loading_graph') {
    return <CanvasLoadingStateView />;
  }

  if (routeState === 'error_graph') {
    return <CanvasErrorStateView message={bootstrapDetail} />;
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
  presentationState: CanvasDraftPresentationState;
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
    presentationState: args.presentationState,
    canEditEdges: args.canEditEdges,
  });
}
