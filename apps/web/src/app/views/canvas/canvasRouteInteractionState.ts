import {
  getCanvasReadOnlyState,
  getCanvasWorkbenchState,
} from './canvasWorkbenchStateModel';
import { canvasViewCopy } from './copy';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { useCanvasController } from './useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;

export type CanvasRouteStartupBlockState =
  | {
      kind: 'runtime_mode';
      title: string;
      message: string;
    }
  | {
      kind: 'backend_readiness';
      title: string;
      message: string;
    };

export type CanvasRouteInteractionState = {
  effectiveWorkbenchState: ReturnType<typeof getCanvasWorkbenchState>;
  startupBlockState: CanvasRouteStartupBlockState | null;
  canvasDocument: CanvasController['canvasDocument'];
  availableCanvasKinds: CanvasController['availableCanvasKinds'];
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
    hasCanvasDocument: controller.canvasDocument != null,
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

function resolveStartupBlockState(
  controller: CanvasController
): CanvasRouteStartupBlockState | null {
  if (controller.dataSourceMode !== 'api') {
    return {
      kind: 'runtime_mode',
      title: canvasViewCopy.runtimeBlockedTitle,
      message: canvasViewCopy.runtimeBlockedFallbackMessage,
    };
  }

  if (!controller.isBackendCheckPending && !controller.backendReady) {
    return {
      kind: 'backend_readiness',
      title: canvasViewCopy.backendBlockedTitle,
      message: controller.backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage,
    };
  }

  return null;
}

export function deriveCanvasRouteInteractionState(
  controller: CanvasController,
  draftTransportError: CanvasDraftTransportErrorState | null
): CanvasRouteInteractionState {
  const effectiveWorkbenchState = resolveEffectiveWorkbenchState(controller, draftTransportError);
  const startupBlockState = resolveStartupBlockState(controller);
  const shouldDisableCanvasInteractions =
    startupBlockState != null ||
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
    startupBlockState,
    canvasDocument: controller.canvasDocument,
    availableCanvasKinds: controller.availableCanvasKinds,
    effectiveUserPermissions,
    readOnlyState,
    workbenchErrorMessage:
      effectiveWorkbenchState.kind === 'error' ? effectiveWorkbenchState.message : null,
  };
}
