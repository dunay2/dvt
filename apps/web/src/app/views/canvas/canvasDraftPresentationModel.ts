/** Owned concern: derive the canonical Canvas route posture and shell bootstrap projection. */
import type { RouteBootstrapPresentation } from '../../bootstrap/routeBootstrapContract';
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
  bootstrapStatus: 'pending' | 'complete' | 'failed' | 'blocked' | 'error';
  bootstrapDetail: string;
  canCompleteBootstrap: boolean;
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

function createCanvasDraftPresentationState({
  routeState,
  recoveryReason,
  draftStatusState,
  bootstrapStatus,
  bootstrapDetail,
  canCompleteBootstrap,
}: CanvasDraftPresentationState): CanvasDraftPresentationState {
  return {
    routeState,
    recoveryReason,
    draftStatusState,
    bootstrapStatus,
    bootstrapDetail,
    canCompleteBootstrap,
  };
}

function deriveWorkbenchCanvasDraftPresentationState({
  workbenchState,
  recoveryReason,
  draftStatusState,
}: CanvasDraftPresentationWorkbenchArgs): CanvasDraftPresentationState {
  if (workbenchState.kind === 'loading') {
    return createCanvasDraftPresentationState({
      routeState: 'loading_graph',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'pending',
      bootstrapDetail: canvasViewCopy.loadingWorkspaceGraphDetail,
      canCompleteBootstrap: false,
    });
  }

  if (workbenchState.kind === 'error') {
    return createCanvasDraftPresentationState({
      routeState: 'error_graph',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'failed',
      bootstrapDetail: workbenchState.message || canvasViewCopy.routeErrorFallbackMessage,
      canCompleteBootstrap: true,
    });
  }

  if (recoveryReason != null) {
    return createCanvasDraftPresentationState({
      routeState: 'recovery',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'blocked',
      bootstrapDetail: resolveCanvasDraftRecoveryBootstrapDetail(recoveryReason),
      canCompleteBootstrap: false,
    });
  }

  if (workbenchState.kind === 'needs_canvas') {
    return createCanvasDraftPresentationState({
      routeState: 'needs_canvas',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.needsCanvasReadyDetail,
      canCompleteBootstrap: true,
    });
  }

  if (workbenchState.kind === 'empty') {
    return createCanvasDraftPresentationState({
      routeState: 'empty',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
      canCompleteBootstrap: true,
    });
  }

  return createCanvasDraftPresentationState({
    routeState: 'ready',
    recoveryReason,
    draftStatusState,
    bootstrapStatus: 'complete',
    bootstrapDetail: canvasViewCopy.canvasReadyDetail,
    canCompleteBootstrap: true,
  });
}

export function deriveCanvasDraftPresentationState({
  isBackendCheckPending,
  startupBlockState,
  workbenchState,
  recoveryReason,
  draftStatusState,
}: CanvasDraftPresentationStateArgs): CanvasDraftPresentationState {
  if (isBackendCheckPending) {
    return createCanvasDraftPresentationState({
      routeState: 'loading_backend',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'pending',
      bootstrapDetail: canvasViewCopy.checkingBackendReadinessDetail,
      canCompleteBootstrap: false,
    });
  }

  if (startupBlockState?.kind === 'backend_readiness') {
    return createCanvasDraftPresentationState({
      routeState: 'blocked_backend',
      recoveryReason,
      draftStatusState,
      bootstrapStatus: 'complete',
      bootstrapDetail: startupBlockState.message,
      canCompleteBootstrap: true,
    });
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
  return {
    status: presentationState.bootstrapStatus,
    detail: presentationState.bootstrapDetail,
    canComplete: presentationState.canCompleteBootstrap,
  };
}
