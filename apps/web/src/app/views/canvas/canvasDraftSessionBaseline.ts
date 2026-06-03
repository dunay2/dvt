import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import type { CanvasDraftBaseline } from './canvasDraftSession.types';

function createCanvasDraftBaseline(record: CanvasAuthoringDraftRecord | null): CanvasDraftBaseline {
  return {
    record,
  };
}

// Baseline owns the current remote draft record for session transitions.
export const canvasDraftSessionBaseline = {
  create: createCanvasDraftBaseline,
} as const;
