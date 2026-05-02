import { toCanvasDraftTransportSurfaceState } from './canvasDraftAccessPostureModel';
import type { useCanvasController } from './useCanvasController';

export type CanvasDraftTransportErrorState =
  | { kind: 'unauthenticated'; title: string; message: string }
  | { kind: 'forbidden_scope'; title: string; message: string }
  | { kind: 'format_error'; title: string; message: string };

export function resolveCanvasDraftTransportErrorState(
  controller: Pick<ReturnType<typeof useCanvasController>, 'draftAccessPosture'>
): CanvasDraftTransportErrorState | null {
  return toCanvasDraftTransportSurfaceState(controller.draftAccessPosture);
}
