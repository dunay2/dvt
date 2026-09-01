import { getCanvasReadOnlyState, getCanvasWorkbenchState } from './canvasWorkbenchStateModel';
import { findCanvasRuntimeRegistration } from '../../plugins/graphStrategyRegistry';
import { canvasViewCopy } from './copy';
import {
  formatDisabledCanvasPluginMessage,
  formatUnsupportedCanvasKindMessage,
} from './canvasCopyFormatting';
import { isCanvasDraftPostureMutationBlocked } from './canvasDraftAccessPostureModel';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { useCanvasController } from './useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;

export type CanvasRouteStartupBlockState = {
  kind: 'backend_readiness';
  title: string;
  message: string;
};

export type CanvasRouteInteractionState = {
  effectiveWorkbenchState: ReturnType<typeof getCanvasWorkbenchState>;
  startupBlockState: CanvasRouteStartupBlockState | null;
  canvasDocument: CanvasController['canvasDocument'];
  canvasDocuments: CanvasController['canvasDocuments'];
  activeCanvasId: CanvasController['activeCanvasId'];
  availableCanvasKinds: CanvasController['availableCanvasKinds'];
  effectiveUserPermissions: CanvasController['userPermissions'];
  readOnlyState: ReturnType<typeof getCanvasReadOnlyState>;
  workbenchErrorMessage: string | null;
};

function resolveEffectiveWorkbenchState(
  controller: CanvasController,
  draftTransportError: CanvasDraftTransportErrorState | null,
  canvasDocumentRuntimeErrorMessage: string | null
): CanvasRouteInteractionState['effectiveWorkbenchState'] {
  const workbenchState = getCanvasWorkbenchState({
    canonicalNodeCount: controller.nodesWithImpact.length,
    hasCanvasDocument: controller.canvasDocument != null,
    isLoadingGraph: controller.isLoadingGraph,
    graphErrorMessage: controller.graphErrorMessage,
  });

  return draftTransportError == null
    ? canvasDocumentRuntimeErrorMessage == null
      ? workbenchState
      : {
          kind: 'error',
          message: canvasDocumentRuntimeErrorMessage,
        }
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

  const mutationBlocked = isCanvasDraftPostureMutationBlocked(controller.draftAccessPosture);

  return {
    ...controller.userPermissions,
    canPlan: controller.userPermissions.canPlan && !mutationBlocked,
    canRun: controller.userPermissions.canRun && !mutationBlocked,
    canEditEdges: controller.userPermissions.canEditEdges && !mutationBlocked,
  };
}

function resolveStartupBlockState(
  controller: CanvasController
): CanvasRouteStartupBlockState | null {
  if (!controller.isBackendCheckPending && !controller.backendReady) {
    return {
      kind: 'backend_readiness',
      title: canvasViewCopy.backendBlockedTitle,
      message: controller.backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage,
    };
  }

  return null;
}

function resolveCanvasDocumentRuntimeErrorMessage(controller: CanvasController): string | null {
  const canvasKind = controller.canvasDocument?.kind;
  if (!canvasKind) {
    return null;
  }

  const normalizedCanvasKind = canvasKind.trim().toLowerCase();
  const hasRuntimeRegistration = controller.availableCanvasKinds.some(
    (registration) => registration.kind.trim().toLowerCase() === normalizedCanvasKind
  );

  if (hasRuntimeRegistration) {
    return null;
  }

  return findCanvasRuntimeRegistration(normalizedCanvasKind) == null
    ? formatUnsupportedCanvasKindMessage(normalizedCanvasKind)
    : formatDisabledCanvasPluginMessage(normalizedCanvasKind);
}

export function deriveCanvasRouteInteractionState(
  controller: CanvasController,
  draftTransportError: CanvasDraftTransportErrorState | null
): CanvasRouteInteractionState {
  const canvasDocumentRuntimeErrorMessage = resolveCanvasDocumentRuntimeErrorMessage(controller);
  const effectiveWorkbenchState = resolveEffectiveWorkbenchState(
    controller,
    draftTransportError,
    canvasDocumentRuntimeErrorMessage
  );
  const startupBlockState = resolveStartupBlockState(controller);
  const shouldDisableCanvasInteractions =
    startupBlockState != null ||
    controller.isBackendCheckPending ||
    controller.draftRecoveryReason != null ||
    draftTransportError != null ||
    canvasDocumentRuntimeErrorMessage != null;
  const effectiveUserPermissions = resolveEffectiveUserPermissions({
    controller,
    shouldDisableCanvasInteractions,
  });
  const readOnlyState =
    shouldDisableCanvasInteractions || controller.draftAccessPosture.kind === 'saving'
      ? null
      : getCanvasReadOnlyState(effectiveUserPermissions);

  return {
    effectiveWorkbenchState,
    startupBlockState,
    canvasDocument: controller.canvasDocument,
    canvasDocuments: controller.canvasDocuments,
    activeCanvasId: controller.activeCanvasId,
    availableCanvasKinds: controller.availableCanvasKinds,
    effectiveUserPermissions,
    readOnlyState,
    workbenchErrorMessage:
      effectiveWorkbenchState.kind === 'error' ? effectiveWorkbenchState.message : null,
  };
}
