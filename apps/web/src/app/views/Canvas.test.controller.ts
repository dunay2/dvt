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

function toCanvasDocumentId(canvasDocument: NonNullable<CanvasController['canvasDocument']>) {
  const existingId = 'id' in canvasDocument ? canvasDocument.id : undefined;

  if (typeof existingId === 'string' && existingId.length > 0) {
    return existingId;
  }

  const titleId = canvasDocument.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return titleId || `${canvasDocument.kind}-canvas`;
}

function normalizeCanvasDocumentState(
  controller: CanvasController,
  overrides?: Partial<CanvasController>
): Pick<CanvasController, 'canvasDocument' | 'canvasDocuments' | 'activeCanvasId'> {
  if (overrides?.canvasDocument === undefined) {
    return {
      canvasDocument: controller.canvasDocument,
      canvasDocuments: controller.canvasDocuments,
      activeCanvasId: controller.activeCanvasId,
    };
  }

  if (overrides.canvasDocument == null) {
    return {
      canvasDocument: null,
      canvasDocuments: overrides.canvasDocuments ?? [],
      activeCanvasId: overrides.activeCanvasId ?? null,
    };
  }

  const activeCanvas = {
    ...overrides.canvasDocument,
    id: toCanvasDocumentId(overrides.canvasDocument),
  };

  return {
    canvasDocument: activeCanvas,
    canvasDocuments: overrides.canvasDocuments ?? [activeCanvas],
    activeCanvasId: overrides.activeCanvasId ?? activeCanvas.id,
  };
}

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
  const normalizedController: CanvasController = {
    ...controller,
    ...normalizeCanvasDocumentState(controller, overrides),
  };

  return {
    ...normalizedController,
    ...normalizeCanvasDraftPosture(normalizedController, overrides),
  };
}
