/** Owned concern: render Canvas workbench states from canonical route posture. */
import {
  CanvasBlockedStateView,
  CanvasErrorStateView,
  CanvasLoadingStateView,
} from './CanvasStateViews';
import { CanvasPlaygroundHost } from './CanvasPlaygroundHost';
import { deriveCanvasHostCycleState } from './canvasHostCycleState';
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

function renderCanvasHostCycleWorkbenchSurface(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    | 'presentationState'
    | 'workspaceScope'
    | 'canvasDocument'
    | 'draftSaveStatus'
    | 'availableCanvasKinds'
    | 'canCreateCanvasDocument'
    | 'onCreateCanvasDocument'
  >
) {
  const cycleState = deriveCanvasHostCycleState(args);
  if (cycleState == null) {
    return null;
  }

  if (cycleState.kind === 'needs_canvas') {
    return (
      <CanvasPlaygroundHost
        canvasKinds={cycleState.availableCanvasKinds}
        onCreateCanvasDocument={cycleState.onCreateCanvasDocument}
        unavailableMessage={cycleState.unavailableMessage}
      />
    );
  }

  return null;
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

  const cycleSurface = renderCanvasHostCycleWorkbenchSurface(args);
  if (cycleSurface != null) {
    return cycleSurface;
  }

  return undefined;
}
