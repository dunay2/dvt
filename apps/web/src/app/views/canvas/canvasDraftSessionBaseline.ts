import type {
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
import type { CanvasDraftBaseline } from './canvasDraftSession.types';
import { serializeWorkspaceGraphDraftStructuralSignature } from './canvasDraftStructuralSignature';

function create(record: WorkspaceGraphDraftRecord | null): CanvasDraftBaseline {
  return {
    record,
    signature:
      record == null ? null : serializeWorkspaceGraphDraftStructuralSignature(record.draft),
  };
}

// Baseline owns deterministic draft signatures and remote-baseline creation.
export const canvasDraftSessionBaseline = {
  create,
  serialize: serializeWorkspaceGraphDraftStructuralSignature,
} as const;
