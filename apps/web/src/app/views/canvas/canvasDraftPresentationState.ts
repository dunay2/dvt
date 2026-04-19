import {
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { CanvasWorkbenchState } from './canvasWorkbenchStateModel';
import { canvasViewCopy } from './copy';

export type CanvasDraftRecoveryReason =
  | 'stale_conflict'
  | 'missing_remote'
  | 'projection_gap'
  | null;

export type CanvasDraftToolbarState = {
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
  showReloadAction: boolean;
};

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

type CanvasDraftToolbarStateArgs = {
  draftSaveStatus: 'idle' | 'saving' | 'saved';
  recoveryReason: CanvasDraftRecoveryReason;
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

const INITIAL_CANVAS_DRAFT_PRESENTATION_STATE: CanvasDraftPresentationState = {
  routeState: 'loading_graph',
  recoveryReason: null,
  draftToolbarState: {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  },
  bootstrapStatus: 'pending',
  bootstrapDetail: canvasViewCopy.preparingCanvasRouteDetail,
  canCompleteBootstrap: false,
};

export const CANVAS_ROUTE_ID = 'dbt.canvas';

export const CANVAS_ROUTE_BOOTSTRAP_HANDLE: RouteBootstrapHandle =
  createPublishedRouteBootstrapHandle({
    pendingDetail: INITIAL_CANVAS_DRAFT_PRESENTATION_STATE.bootstrapDetail,
  });

let canvasDraftPresentationState = INITIAL_CANVAS_DRAFT_PRESENTATION_STATE;
const listeners = new Set<() => void>();

function arePresentationStatesEqual(
  left: CanvasDraftPresentationState,
  right: CanvasDraftPresentationState
): boolean {
  return (
    left.routeState === right.routeState &&
    left.recoveryReason === right.recoveryReason &&
    left.bootstrapStatus === right.bootstrapStatus &&
    left.bootstrapDetail === right.bootstrapDetail &&
    left.canCompleteBootstrap === right.canCompleteBootstrap &&
    left.draftToolbarState.label === right.draftToolbarState.label &&
    left.draftToolbarState.tone === right.draftToolbarState.tone &&
    left.draftToolbarState.showReloadAction === right.draftToolbarState.showReloadAction
  );
}

function getRecoveryBootstrapDetail(recoveryReason: CanvasDraftRecoveryReason): string {
  switch (recoveryReason) {
    case 'stale_conflict':
      return canvasViewCopy.staleDraftMessage;
    case 'missing_remote':
      return canvasViewCopy.missingRemoteDraftMessage;
    case 'projection_gap':
      return canvasViewCopy.draftProjectionGapMessage;
    default:
      return canvasViewCopy.routeLoadingMessage;
  }
}

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

export function deriveDraftRecoveryReason({
  hasMissingRemoteDraft,
  hasStaleDraftVersion,
  hasDraftProjectionGap,
}: {
  hasMissingRemoteDraft: boolean;
  hasStaleDraftVersion: boolean;
  hasDraftProjectionGap: boolean;
}): CanvasDraftRecoveryReason {
  if (hasStaleDraftVersion) {
    return 'stale_conflict';
  }
  if (hasMissingRemoteDraft) {
    return 'missing_remote';
  }
  if (hasDraftProjectionGap) {
    return 'projection_gap';
  }
  return null;
}

function resolveNeutralDraftToolbarLabel(
  draftSaveStatus: CanvasDraftToolbarStateArgs['draftSaveStatus']
): string {
  switch (draftSaveStatus) {
    case 'saving':
      return canvasViewCopy.savingDraftLabel;
    case 'saved':
      return canvasViewCopy.draftSavedLabel;
    default:
      return canvasViewCopy.draftSyncedLabel;
  }
}

export function deriveCanvasDraftToolbarState({
  draftSaveStatus,
  recoveryReason,
}: CanvasDraftToolbarStateArgs): CanvasDraftToolbarState {
  switch (recoveryReason) {
    case 'stale_conflict':
      return {
        label: canvasViewCopy.staleVersionLabel,
        tone: 'danger',
        showReloadAction: true,
      };
    case 'missing_remote':
      return {
        label: canvasViewCopy.draftMissingLabel,
        tone: 'warning',
        showReloadAction: true,
      };
    case 'projection_gap':
      return {
        label: canvasViewCopy.projectionGapLabel,
        tone: 'warning',
        showReloadAction: true,
      };
    default:
      return {
        label: resolveNeutralDraftToolbarLabel(draftSaveStatus),
        tone: 'neutral',
        showReloadAction: false,
      };
  }
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
      bootstrapDetail: getRecoveryBootstrapDetail(recoveryReason),
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

export function getCanvasDraftPresentationState(): CanvasDraftPresentationState {
  return canvasDraftPresentationState;
}

export function subscribeCanvasDraftPresentationState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishCanvasDraftPresentationState(
  nextState: CanvasDraftPresentationState
): void {
  if (arePresentationStatesEqual(canvasDraftPresentationState, nextState)) {
    return;
  }

  canvasDraftPresentationState = nextState;
  listeners.forEach((listener) => {
    listener();
  });
}

export function resetCanvasDraftPresentationState(): void {
  publishCanvasDraftPresentationState(INITIAL_CANVAS_DRAFT_PRESENTATION_STATE);
}
