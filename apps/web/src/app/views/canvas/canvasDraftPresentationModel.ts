import type { RouteBootstrapPresentation } from '../../bootstrap/routeBootstrapContract';
import type { CanvasWorkbenchState } from './canvasWorkbenchStateModel';
import { canvasViewCopy } from './copy';
import {
  resolveCanvasDraftRecoveryBootstrapDetail,
  type CanvasDraftRecoveryReason,
  type CanvasDraftToolbarState,
} from './canvasDraftToolbarState';

export type CanvasRouteState =
  | 'loading_backend'
  | 'blocked_backend'
  | 'loading_graph'
  | 'error_graph'
  | 'recovery'
  | 'empty'
  | 'ready';

export type CanvasDraftPresentationState = {
  routeState: CanvasRouteState;
  recoveryReason: CanvasDraftRecoveryReason;
  draftToolbarState: CanvasDraftToolbarState;
  bootstrapStatus: 'pending' | 'complete' | 'blocked' | 'error';
  bootstrapDetail: string;
  canCompleteBootstrap: boolean;
};

type CanvasDraftPresentationStateArgs = {
  isBackendCheckPending: boolean;
  shouldBlockCanvasInApiMode: boolean;
  backendBlockMessage: string | null;
  workbenchState: CanvasWorkbenchState;
  recoveryReason: CanvasDraftRecoveryReason;
  draftToolbarState: CanvasDraftToolbarState;
};

type CanvasDraftPresentationWorkbenchArgs = Pick<
  CanvasDraftPresentationStateArgs,
  'workbenchState' | 'recoveryReason' | 'draftToolbarState'
>;

function createCanvasDraftPresentationState({
  routeState,
  recoveryReason,
  draftToolbarState,
  bootstrapStatus,
  bootstrapDetail,
  canCompleteBootstrap,
}: CanvasDraftPresentationState): CanvasDraftPresentationState {
  return {
    routeState,
    recoveryReason,
    draftToolbarState,
    bootstrapStatus,
    bootstrapDetail,
    canCompleteBootstrap,
  };
}

function deriveWorkbenchCanvasDraftPresentationState({
  workbenchState,
  recoveryReason,
  draftToolbarState,
}: CanvasDraftPresentationWorkbenchArgs): CanvasDraftPresentationState {
  if (workbenchState.kind === 'loading') {
    return createCanvasDraftPresentationState({
      routeState: 'loading_graph',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'pending',
      bootstrapDetail: canvasViewCopy.loadingWorkspaceGraphDetail,
      canCompleteBootstrap: false,
    });
  }

  if (workbenchState.kind === 'error') {
    return createCanvasDraftPresentationState({
      routeState: 'error_graph',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'error',
      bootstrapDetail: workbenchState.message || canvasViewCopy.routeErrorFallbackMessage,
      canCompleteBootstrap: false,
    });
  }

  if (recoveryReason != null) {
    return createCanvasDraftPresentationState({
      routeState: 'recovery',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'blocked',
      bootstrapDetail: resolveCanvasDraftRecoveryBootstrapDetail(recoveryReason),
      canCompleteBootstrap: false,
    });
  }

  if (workbenchState.kind === 'empty') {
    return createCanvasDraftPresentationState({
      routeState: 'empty',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
      canCompleteBootstrap: true,
    });
  }

  return createCanvasDraftPresentationState({
    routeState: 'ready',
    recoveryReason,
    draftToolbarState,
    bootstrapStatus: 'complete',
    bootstrapDetail: canvasViewCopy.canvasReadyDetail,
    canCompleteBootstrap: true,
  });
}

export function deriveCanvasDraftPresentationState({
  isBackendCheckPending,
  shouldBlockCanvasInApiMode,
  backendBlockMessage,
  workbenchState,
  recoveryReason,
  draftToolbarState,
}: CanvasDraftPresentationStateArgs): CanvasDraftPresentationState {
  if (isBackendCheckPending) {
    return createCanvasDraftPresentationState({
      routeState: 'loading_backend',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'pending',
      bootstrapDetail: canvasViewCopy.checkingBackendReadinessDetail,
      canCompleteBootstrap: false,
    });
  }

  if (shouldBlockCanvasInApiMode) {
    return createCanvasDraftPresentationState({
      routeState: 'blocked_backend',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'blocked',
      bootstrapDetail:
        backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage,
      canCompleteBootstrap: false,
    });
  }

  return deriveWorkbenchCanvasDraftPresentationState({
    workbenchState,
    recoveryReason,
    draftToolbarState,
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
