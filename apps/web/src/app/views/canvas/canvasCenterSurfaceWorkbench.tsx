/** Owned concern: render Canvas workbench states from canonical route posture. */
import {
  CanvasBlockedStateView,
  CanvasEmptyStateView,
  CanvasErrorStateView,
  CanvasLoadingStateView,
} from './CanvasStateViews';
import { CanvasPlaygroundHost } from './CanvasPlaygroundHost';
import { canvasViewCopy } from './copy';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';

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

function renderCanvasPlaygroundWorkbenchSurface(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    'presentationState' | 'availableCanvasKinds' | 'onCreateCanvasDocument'
  >
) {
  const {
    presentationState: { routeState },
    availableCanvasKinds,
    onCreateCanvasDocument,
  } = args;

  if (routeState !== 'needs_canvas') {
    return null;
  }

  return (
    <CanvasPlaygroundHost
      canvasKinds={availableCanvasKinds}
      onCreateCanvasDocument={onCreateCanvasDocument}
    />
  );
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

function resolveCanvasEmptyWorkbenchNodeKinds(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'canvasDocument' | 'availableCanvasKinds'>
): readonly NodeKindRegistration[] {
  const { canvasDocument, availableCanvasKinds } = args;
  if (canvasDocument == null) {
    return [];
  }

  return (
    availableCanvasKinds.find((registration) => registration.kind === canvasDocument.kind)?.nodeKinds ??
    []
  );
}

function renderCanvasEmptyWorkbenchSurface(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    | 'presentationState'
    | 'canvasDocument'
    | 'availableCanvasKinds'
    | 'canEditEdges'
    | 'canOpenSourceImport'
    | 'onCreateAuthoringNode'
  >
) {
  const {
    presentationState: { routeState },
    canvasDocument,
    availableCanvasKinds,
    canEditEdges,
    canOpenSourceImport,
    onCreateAuthoringNode,
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
      nodeKinds={
        canEditEdges
          ? resolveCanvasEmptyWorkbenchNodeKinds({
              canvasDocument,
              availableCanvasKinds,
            })
          : []
      }
      onCreateAuthoringNode={canEditEdges ? onCreateAuthoringNode : undefined}
    />
  );
}

export function renderCanvasWorkbenchSurface(args: CanvasWorkbenchSurfaceArgs) {
  const startupSurface = renderCanvasStartupWorkbenchSurface(args);
  if (startupSurface != null) {
    return startupSurface;
  }

  const graphSurface = renderCanvasGraphWorkbenchSurface(args);
  if (graphSurface != null) {
    return graphSurface;
  }

  const playgroundSurface = renderCanvasPlaygroundWorkbenchSurface(args);
  if (playgroundSurface != null) {
    return playgroundSurface;
  }

  const emptySurface = renderCanvasEmptyWorkbenchSurface(args);
  if (emptySurface != null) {
    return emptySurface;
  }

  return undefined;
}
