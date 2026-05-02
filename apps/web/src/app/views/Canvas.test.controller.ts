import type { useCanvasController } from './canvas/useCanvasController';
import {
  deriveCanvasDraftAccessPosture,
  toCanvasDraftToolbarState,
} from './canvas/canvasDraftAccessPostureModel';
import {
  buildDefaultCanvasControllerCallbacks,
  buildDefaultCanvasControllerState,
} from './Canvas.test.controller.defaults';

export type CanvasController = ReturnType<typeof useCanvasController>;

function normalizeCanvasDraftPosture(
  controller: CanvasController,
  overrides?: Partial<CanvasController>
): Pick<CanvasController, 'draftAccessPosture' | 'draftToolbarState'> {
  const hasExplicitDraftPosture = overrides?.draftAccessPosture !== undefined;
  const draftAccessPosture = hasExplicitDraftPosture
    ? controller.draftAccessPosture
    : deriveCanvasDraftAccessPosture({
        draftAccessMode: controller.draftAccessMode,
        draftCapabilityReason: controller.draftCapabilityReason,
        draftFormatError: controller.draftFormatError,
        authTransportPosture: controller.draftAuthTransportPosture,
        recoveryReason: controller.draftRecoveryReason,
        draftSaveStatus: controller.draftSaveStatus,
      });

  return {
    draftAccessPosture,
    draftToolbarState:
      hasExplicitDraftPosture && overrides?.draftToolbarState !== undefined
        ? controller.draftToolbarState
        : toCanvasDraftToolbarState(draftAccessPosture),
  };
}

export function buildController(overrides?: Partial<CanvasController>): CanvasController {
  const controller: CanvasController = {
    ...buildDefaultCanvasControllerState(),
    ...buildDefaultCanvasControllerCallbacks(),
    ...overrides,
  };

  return {
    ...controller,
    ...normalizeCanvasDraftPosture(controller, overrides),
  };
}
