import { getCanvasReadOnlyState, getCanvasWorkbenchState } from './canvasWorkbenchStateModel';
import {
  deriveCanvasDraftPresentationState,
  type CanvasDraftPresentationState,
} from './canvasDraftPresentationState';
import {
  resolveCanvasDraftTransportErrorState,
  type CanvasDraftTransportErrorState,
} from './canvasDraftTransportErrorState';
import type { useCanvasController } from './useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;

export type CanvasRouteViewState = {
  draftTransportError: CanvasDraftTransportErrorState | null;
  effectiveUserPermissions: CanvasController['userPermissions'];
  readOnlyState: ReturnType<typeof getCanvasReadOnlyState>;
  workbenchErrorMessage: string | null;
  presentationState: CanvasDraftPresentationState;
  showRecoveryBanner: boolean;
};

export function deriveCanvasRouteViewState(
  controller: CanvasController
): CanvasRouteViewState {
  const draftTransportError = resolveCanvasDraftTransportErrorState(controller);
  const workbenchState = getCanvasWorkbenchState({
    canonicalNodeCount: controller.explorerNodes.length,
    isLoadingGraph: controller.isLoadingGraph,
    graphErrorMessage: controller.graphErrorMessage,
  });
  const effectiveWorkbenchState =
    draftTransportError == null
      ? workbenchState
      : {
          kind: 'error' as const,
          message: draftTransportError.message,
        };
  const shouldBlockCanvasInApiMode = controller.dataSourceMode === 'api' && !controller.backendReady;
  const shouldDisableCanvasInteractions =
    shouldBlockCanvasInApiMode ||
    controller.isBackendCheckPending ||
    controller.draftRecoveryReason != null ||
    draftTransportError != null;
  const effectiveUserPermissions = shouldDisableCanvasInteractions
    ? {
        ...controller.userPermissions,
        canPlan: false,
        canRun: false,
        canEditEdges: false,
      }
    : {
        ...controller.userPermissions,
        canEditEdges:
          controller.userPermissions.canEditEdges && controller.draftAccessMode !== 'read_only',
      };
  const readOnlyState = shouldDisableCanvasInteractions
    ? null
    : getCanvasReadOnlyState(effectiveUserPermissions);
  const workbenchErrorMessage =
    effectiveWorkbenchState.kind === 'error' ? effectiveWorkbenchState.message : null;
  const presentationState = deriveCanvasDraftPresentationState({
    isBackendCheckPending: controller.isBackendCheckPending,
    shouldBlockCanvasInApiMode,
    backendBlockMessage: controller.backendBlockMessage,
    workbenchState: effectiveWorkbenchState,
    recoveryReason: controller.draftRecoveryReason,
    draftToolbarState: controller.draftToolbarState,
  });

  return {
    draftTransportError,
    effectiveUserPermissions,
    readOnlyState,
    workbenchErrorMessage,
    presentationState,
    showRecoveryBanner: presentationState.routeState === 'recovery',
  };
}
