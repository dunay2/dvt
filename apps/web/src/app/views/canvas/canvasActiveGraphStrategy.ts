/** Owned concern: resolve the active Canvas graph strategy from the current draft document. */
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type { CanvasGraphAuthoringMode } from '../../plugins/nodeTypeContracts';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';

const DEFAULT_CANVAS_AUTHORING_MODE: CanvasGraphAuthoringMode = 'transformation';

export function resolveActiveCanvasGraphStrategy(
  draftReadModel: CanvasDraftReadModel | undefined
): CanvasGraphStrategy {
  return resolveCanvasGraphStrategy(draftReadModel?.record?.draft.canvas.kind);
}

export function resolveActiveCanvasAuthoringMode(
  draftReadModel: CanvasDraftReadModel | undefined
): CanvasGraphAuthoringMode {
  return draftReadModel?.record?.draft.canvas.kind ?? DEFAULT_CANVAS_AUTHORING_MODE;
}
