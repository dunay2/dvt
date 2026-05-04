import {
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapHandle,
} from '../../bootstrap/routeBootstrapContract';
import { canvasViewCopy } from './copy';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';

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
export const CANVAS_WORKBENCH_ROUTE_ID = 'dbt.canvas.workbench-tab';

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
