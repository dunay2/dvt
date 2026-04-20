import type { useCanvasController } from './canvas/useCanvasController';
import {
  buildDefaultCanvasControllerCallbacks,
  buildDefaultCanvasControllerState,
} from './Canvas.test.controller.defaults';

export type CanvasController = ReturnType<typeof useCanvasController>;

export function buildController(overrides?: Partial<CanvasController>): CanvasController {
  return {
    ...buildDefaultCanvasControllerState(),
    ...buildDefaultCanvasControllerCallbacks(),
    ...overrides,
  };
}
