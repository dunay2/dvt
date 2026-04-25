/** Owned concern: resolve the active Canvas graph strategy from the current draft document. */
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';

export function resolveActiveCanvasGraphStrategy(
  draftReadModel: CanvasDraftReadModel | undefined
): CanvasGraphStrategy {
  return resolveCanvasGraphStrategy(draftReadModel?.record?.draft.canvas.kind);
}
