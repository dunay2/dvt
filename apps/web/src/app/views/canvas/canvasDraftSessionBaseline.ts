import type {
  WorkspaceGraphDraft,
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
import type { CanvasDraftBaseline } from './canvasDraftSession.types';

function create(record: WorkspaceGraphDraftRecord | null): CanvasDraftBaseline {
  return {
    record,
    signature: record == null ? null : serialize(record.draft),
  };
}

function serialize(draft: WorkspaceGraphDraft): string {
  return JSON.stringify({
    nodeIds: [...draft.nodeIds],
    edges: [...draft.edges]
      .map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId }))
      .sort(
        (left, right) =>
          left.sourceId.localeCompare(right.sourceId) ||
          left.targetId.localeCompare(right.targetId)
      ),
  });
}

// Baseline owns deterministic draft signatures and remote-baseline creation.
export const canvasDraftSessionBaseline = { create, serialize } as const;
