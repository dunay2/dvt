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
  startupBlockState: CanvasRouteInteractionState['startupBlockState'];
  effectiveUserPermissions: CanvasRouteInteractionState['effectiveUserPermissions'];
  readOnlyState: CanvasRouteInteractionState['readOnlyState'];
  workbenchErrorMessage: CanvasRouteInteractionState['workbenchErrorMessage'];
  presentationState: CanvasDraftPresentationState;
  showRecoveryBanner: boolean;
};

export function deriveCanvasRouteViewState(
  controller: CanvasController
): CanvasRouteViewState {
  const draftTransportError = resolveCanvasDraftTransportErrorState(controller);
  const interactionState = deriveCanvasRouteInteractionState(controller, draftTransportError);
  const presentationState = deriveCanvasDraftPresentationState({
    isBackendCheckPending: controller.isBackendCheckPending,
    startupBlockState: interactionState.startupBlockState,
    workbenchState: interactionState.effectiveWorkbenchState,
    recoveryReason: controller.draftRecoveryReason,
    draftToolbarState: controller.draftToolbarState,
  });

  return {
    draftTransportError,
    startupBlockState: interactionState.startupBlockState,
    effectiveUserPermissions: interactionState.effectiveUserPermissions,
    readOnlyState: interactionState.readOnlyState,
    workbenchErrorMessage: interactionState.workbenchErrorMessage,
    presentationState,
    showRecoveryBanner: presentationState.routeState === 'recovery',
  };
}
