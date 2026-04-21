import {
  getCanvasReadOnlyState,
  getCanvasWorkbenchState,
} from './canvasWorkbenchStateModel';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { useCanvasController } from './useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;

export type CanvasRouteInteractionState = {
  effectiveWorkbenchState: ReturnType<typeof getCanvasWorkbenchState>;
  shouldBlockCanvasInApiMode: boolean;
  effectiveUserPermissions: CanvasController['userPermissions'];
  readOnlyState: ReturnType<typeof getCanvasReadOnlyState>;
  workbenchErrorMessage: string | null;
};

function resolveEffectiveWorkbenchState(
  controller: CanvasController,
  draftTransportError: CanvasDraftTransportErrorState | null
): CanvasRouteInteractionState['effectiveWorkbenchState'] {
  const workbenchState = getCanvasWorkbenchState({
    canonicalNodeCount: controller.explorerNodes.length,
    isLoadingGraph: controller.isLoadingGraph,
    graphErrorMessage: controller.graphErrorMessage,
  });

  return draftTransportError == null
    ? workbenchState
    : {
        kind: 'error',
        message: draftTransportError.message,
      };
}

function resolveEffectiveUserPermissions(args: {
  controller: CanvasController;
  shouldDisableCanvasInteractions: boolean;
}): CanvasController['userPermissions'] {
  const { controller, shouldDisableCanvasInteractions } = args;

  if (shouldDisableCanvasInteractions) {
    return {
      ...controller.userPermissions,
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    };
  }

  return {
    ...controller.userPermissions,
    canEditEdges:
      controller.userPermissions.canEditEdges && controller.draftAccessMode !== 'read_only',
  };
}

export function deriveCanvasRouteInteractionState(
  controller: CanvasController,
  draftTransportError: CanvasDraftTransportErrorState | null
): CanvasRouteInteractionState {
  const effectiveWorkbenchState = resolveEffectiveWorkbenchState(controller, draftTransportError);
  const shouldBlockCanvasInApiMode =
    controller.dataSourceMode === 'api' && !controller.backendReady;
  const shouldDisableCanvasInteractions =
    shouldBlockCanvasInApiMode ||
    controller.isBackendCheckPending ||
    controller.draftRecoveryReason != null ||
    draftTransportError != null;
  const effectiveUserPermissions = resolveEffectiveUserPermissions({
    controller,
    shouldDisableCanvasInteractions,
  });
  const readOnlyState = shouldDisableCanvasInteractions
    ? null
    : getCanvasReadOnlyState(effectiveUserPermissions);

  return {
    effectiveWorkbenchState,
    shouldBlockCanvasInApiMode,
    effectiveUserPermissions,
    readOnlyState,
    workbenchErrorMessage:
      effectiveWorkbenchState.kind === 'error' ? effectiveWorkbenchState.message : null,
  };
}
