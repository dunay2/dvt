/**
 * Owned concern: provide deterministic structural signatures for projected
 * workspace graph drafts when semantic graph detail is unavailable.
 */
import type { WorkspaceGraphDraft } from '../../ports/workspace';

export function serializeWorkspaceGraphDraftStructuralSignature(
  draft: WorkspaceGraphDraft
): string {
  return JSON.stringify({
    canvas: {
      kind: draft.canvas.kind,
      title: draft.canvas.title,
    },
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
