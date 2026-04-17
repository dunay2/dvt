import {
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapPresentation';
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

const INITIAL_CANVAS_DRAFT_PRESENTATION_STATE: CanvasDraftPresentationState = {
  routeState: 'loading_graph',
  recoveryReason: null,
  draftToolbarState: {
    label: 'Draft synced',
    tone: 'neutral',
    showReloadAction: false,
  },
  bootstrapStatus: 'pending',
  bootstrapDetail: 'Preparing canvas route',
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

export function deriveCanvasDraftToolbarState({
  draftSaveStatus,
  recoveryReason,
}: CanvasDraftToolbarStateArgs): CanvasDraftToolbarState {
  switch (recoveryReason) {
    case 'stale_conflict':
      return {
        label: 'Stale version',
        tone: 'danger',
        showReloadAction: true,
      };
    case 'missing_remote':
      return {
        label: 'Draft missing',
        tone: 'warning',
        showReloadAction: true,
      };
    case 'projection_gap':
      return {
        label: 'Projection gap',
        tone: 'warning',
        showReloadAction: true,
      };
    default:
      return {
        label:
          draftSaveStatus === 'saving'
            ? 'Saving draft'
            : draftSaveStatus === 'saved'
              ? 'Draft saved'
              : 'Draft synced',
        tone: 'neutral',
        showReloadAction: false,
      };
  }
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
    return {
      routeState: 'loading_backend',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'pending',
      bootstrapDetail: 'Checking backend readiness for canvas',
      canCompleteBootstrap: false,
    };
  }

  if (shouldBlockCanvasInApiMode) {
    return {
      routeState: 'blocked_backend',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'blocked',
      bootstrapDetail:
        backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage,
      canCompleteBootstrap: false,
    };
  }

  if (workbenchState.kind === 'loading') {
    return {
      routeState: 'loading_graph',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'pending',
      bootstrapDetail: 'Loading workspace graph for canvas',
      canCompleteBootstrap: false,
    };
  }

  if (workbenchState.kind === 'error') {
    return {
      routeState: 'error_graph',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'error',
      bootstrapDetail: workbenchState.message || canvasViewCopy.routeErrorFallbackMessage,
      canCompleteBootstrap: false,
    };
  }

  if (recoveryReason != null) {
    return {
      routeState: 'recovery',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'blocked',
      bootstrapDetail: getRecoveryBootstrapDetail(recoveryReason),
      canCompleteBootstrap: false,
    };
  }

  if (workbenchState.kind === 'empty') {
    return {
      routeState: 'empty',
      recoveryReason,
      draftToolbarState,
      bootstrapStatus: 'complete',
      bootstrapDetail: 'Canvas is ready with no graph content yet',
      canCompleteBootstrap: true,
    };
  }

  return {
    routeState: 'ready',
    recoveryReason,
    draftToolbarState,
    bootstrapStatus: 'complete',
    bootstrapDetail: 'Canvas is ready',
    canCompleteBootstrap: true,
  };
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
