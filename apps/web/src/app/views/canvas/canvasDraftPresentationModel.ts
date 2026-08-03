/** Owned concern: derive the canonical Canvas route posture and shell bootstrap projection. */
import {
  createBlockedRouteBootstrapPresentation,
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { CanvasWorkbenchState } from './canvasWorkbenchStateModel';
import { canvasViewCopy } from './copy';
import {
  resolveCanvasDraftRecoveryBootstrapDetail,
  type CanvasDraftRecoveryReason,
  type CanvasDraftStatusState,
} from './canvasDraftStatusState';
import type { CanvasRouteStartupBlockState } from './canvasRouteInteractionState';

export type CanvasRouteState =
  | 'loading_backend'
  | 'blocked_backend'
  | 'loading_graph'
  | 'error_graph'
  | 'recovery'
  | 'needs_canvas'
  | 'empty'
  | 'ready';

export type CanvasDraftPresentationState = {
  routeState: CanvasRouteState;
  recoveryReason: CanvasDraftRecoveryReason;
  draftStatusState: CanvasDraftStatusState;
  routeReadiness: RouteBootstrapPresentation;
};

type CanvasDraftPresentationStateArgs = {
  isBackendCheckPending: boolean;
  startupBlockState: CanvasRouteStartupBlockState | null;
  workbenchState: CanvasWorkbenchState;
  recoveryReason: CanvasDraftRecoveryReason;
  draftStatusState: CanvasDraftStatusState;
};

type CanvasDraftPresentationWorkbenchArgs = Pick<
  CanvasDraftPresentationStateArgs,
  'workbenchState' | 'recoveryReason' | 'draftStatusState'
>;

function deriveWorkbenchCanvasDraftPresentationState({
  workbenchState,
  recoveryReason,
  draftStatusState,
}: CanvasDraftPresentationWorkbenchArgs): CanvasDraftPresentationState {
  if (workbenchState.kind === 'loading') {
    return {
      routeState: 'loading_graph',
      recoveryReason,
      draftStatusState,
      routeReadiness: createPendingRouteBootstrapPresentation(
        canvasViewCopy.loadingWorkspaceGraphDetail
      ),
    };
  }

  if (workbenchState.kind === 'error') {
    return {
      routeState: 'error_graph',
      recoveryReason,
      draftStatusState,
      routeReadiness: createFailedRouteBootstrapPresentation(
        workbenchState.message || canvasViewCopy.routeErrorFallbackMessage
      ),
    };
  }

  if (recoveryReason != null) {
    return {
      routeState: 'recovery',
      recoveryReason,
      draftStatusState,
      routeReadiness: createBlockedRouteBootstrapPresentation(
        resolveCanvasDraftRecoveryBootstrapDetail(recoveryReason)
      ),
    };
  }

  if (workbenchState.kind === 'needs_canvas') {
    return {
      routeState: 'needs_canvas',
      recoveryReason,
      draftStatusState,
      routeReadiness: createCompleteRouteBootstrapPresentation(
        canvasViewCopy.needsCanvasReadyDetail
      ),
    };
  }

  if (workbenchState.kind === 'empty') {
    return {
      routeState: 'empty',
      recoveryReason,
      draftStatusState,
      routeReadiness: createCompleteRouteBootstrapPresentation(
        canvasViewCopy.emptyCanvasReadyDetail
      ),
    };
  }

  return {
    routeState: 'ready',
    recoveryReason,
    draftStatusState,
    routeReadiness: createCompleteRouteBootstrapPresentation(canvasViewCopy.canvasReadyDetail),
  };
}

export function deriveCanvasDraftPresentationState({
  isBackendCheckPending,
  startupBlockState,
  workbenchState,
  recoveryReason,
  draftStatusState,
}: CanvasDraftPresentationStateArgs): CanvasDraftPresentationState {
  if (isBackendCheckPending) {
    return {
      routeState: 'loading_backend',
      recoveryReason,
      draftStatusState,
      routeReadiness: createPendingRouteBootstrapPresentation(
        canvasViewCopy.checkingBackendReadinessDetail
      ),
    };
  }

  if (startupBlockState?.kind === 'backend_readiness') {
    return {
      routeState: 'blocked_backend',
      recoveryReason,
      draftStatusState,
      routeReadiness: createCompleteRouteBootstrapPresentation(startupBlockState.message),
    };
  }

  return deriveWorkbenchCanvasDraftPresentationState({
    workbenchState,
    recoveryReason,
    draftStatusState,
  });
}

export function toRouteBootstrapPresentation(
  presentationState: CanvasDraftPresentationState
): RouteBootstrapPresentation {
  return presentationState.routeReadiness;
}
