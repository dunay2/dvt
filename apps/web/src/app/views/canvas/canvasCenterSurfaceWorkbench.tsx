/** Owned concern: render Canvas workbench states from canonical route posture. */
import {
  CanvasBlockedStateView,
  CanvasEmptyStateView,
  CanvasErrorStateView,
  CanvasLoadingStateView,
} from './CanvasStateViews';
import { DVT_AUTHORING_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import { canvasViewCopy } from './copy';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';

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
    'presentationState' | 'canEditEdges' | 'canOpenSourceImport' | 'onCreateAuthoringNode'
  >
) {
  const {
    presentationState: { routeState },
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
      nodeKinds={canEditEdges ? DVT_AUTHORING_NODE_KINDS : []}
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

  const emptySurface = renderCanvasEmptyWorkbenchSurface(args);
  if (emptySurface != null) {
    return emptySurface;
  }

  return undefined;
}
