/**
 * Owned concern: compose the canonical Canvas route state consumed by the shell.
 */
import {
  deriveCanvasDraftPresentationState,
  type CanvasDraftPresentationState,
} from './canvasDraftPresentationModel';
import {
  resolveCanvasDraftTransportErrorState,
  type CanvasDraftTransportErrorState,
} from './canvasDraftTransportErrorState';
import {
  deriveCanvasRouteInteractionState,
  type CanvasRouteInteractionState,
} from './canvasRouteInteractionState';
import type { useCanvasController } from './useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;

export type CanvasRouteViewState = {
  draftTransportError: CanvasDraftTransportErrorState | null;
  effectiveUserPermissions: CanvasRouteInteractionState['effectiveUserPermissions'];
  readOnlyState: CanvasRouteInteractionState['readOnlyState'];
  presentationState: CanvasDraftPresentationState;
};

export function deriveCanvasRouteViewState(
  controller: CanvasController
): CanvasRouteViewState {
  const draftTransportError = resolveCanvasDraftTransportErrorState(controller);
  const interactionState = deriveCanvasRouteInteractionState(controller, draftTransportError);
  const presentationState = deriveCanvasDraftPresentationState({
    isBackendCheckPending: controller.isBackendCheckPending,
    shouldBlockCanvasInApiMode: interactionState.shouldBlockCanvasInApiMode,
    backendBlockMessage: controller.backendBlockMessage,
    workbenchState: interactionState.effectiveWorkbenchState,
    recoveryReason: controller.draftRecoveryReason,
    draftToolbarState: controller.draftToolbarState,
  });

  return {
    draftTransportError,
    effectiveUserPermissions: interactionState.effectiveUserPermissions,
    readOnlyState: interactionState.readOnlyState,
    presentationState,
  };
}
