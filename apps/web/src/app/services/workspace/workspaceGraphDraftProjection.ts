import type { WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord } from '@dvt/contracts';

import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';

function projectProtectedWorkspaceGraphDraft(
  draft: ProtectedWorkspaceGraphDraftRecord['draft']
): WorkspaceGraphDraft {
  return {
    nodeIds: draft.nodes.map((node) => node.id),
    // The protected draft boundary owns structural graph state, not visual canvas layout.
    nodePositions: {},
    edges: draft.edges.map((edge) => ({
      sourceId: edge.fromNodeId,
      targetId: edge.toNodeId,
    })),
  };
}

export function projectProtectedWorkspaceGraphDraftRecord(
  record: ProtectedWorkspaceGraphDraftRecord
): WorkspaceGraphDraftRecord {
  return {
    revision: record.revision,
    savedAt: record.updatedAt,
    draft: projectProtectedWorkspaceGraphDraft(record.draft),
  };
}
