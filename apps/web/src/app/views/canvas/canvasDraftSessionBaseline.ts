import type {
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
import type { CanvasDraftBaseline } from './canvasDraftSession.types';

function create(record: WorkspaceGraphDraftRecord | null): CanvasDraftBaseline {
  return {
    record,
  };
}

// Baseline owns the current remote draft record for session transitions.
export const canvasDraftSessionBaseline = {
  create,
} as const;
