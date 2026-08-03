import {
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapHandle,
} from '../../bootstrap/routeBootstrapContract';
import { canvasViewCopy } from './copy';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';

const INITIAL_CANVAS_DRAFT_PRESENTATION_STATE: CanvasDraftPresentationState = {
  routeState: 'loading_graph',
  recoveryReason: null,
  draftStatusState: {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  },
  routeReadiness: {
    status: 'pending',
    detail: canvasViewCopy.preparingCanvasRouteDetail,
  },
};

export const CANVAS_ROUTE_ID = 'dbt.canvas';
export const CANVAS_WORKBENCH_ROUTE_ID = 'dbt.canvas.workbench-tab';

export const CANVAS_ROUTE_BOOTSTRAP_HANDLE: RouteBootstrapHandle =
  createPublishedRouteBootstrapHandle({
    pendingDetail: INITIAL_CANVAS_DRAFT_PRESENTATION_STATE.routeReadiness.detail,
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
    left.routeReadiness.status === right.routeReadiness.status &&
    left.routeReadiness.detail === right.routeReadiness.detail &&
    left.draftStatusState.label === right.draftStatusState.label &&
    left.draftStatusState.tone === right.draftStatusState.tone &&
    left.draftStatusState.showReloadAction === right.draftStatusState.showReloadAction
  );
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

export function publishCanvasDraftPresentationState(nextState: CanvasDraftPresentationState): void {
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
