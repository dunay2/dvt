/**
 * Owned concern: provide deterministic structural signatures for protected
 * workspace graph authoring drafts from the aggregate's semantic truth.
 */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { toCanvasAuthoringSerializableValue } from './canvasAuthoringMetadata';

function compareAuthoringEdges(
  left: WorkspaceGraphAuthoringDraft['edges'][number],
  right: WorkspaceGraphAuthoringDraft['edges'][number]
): number {
  return (
    left.sourceId.localeCompare(right.sourceId) ||
    left.targetId.localeCompare(right.targetId) ||
    left.relation.localeCompare(right.relation) ||
    left.id.localeCompare(right.id)
  );
}

function compareAuthoringNodes(
  left: WorkspaceGraphAuthoringDraft['nodes'][number],
  right: WorkspaceGraphAuthoringDraft['nodes'][number]
): number {
  return left.id.localeCompare(right.id);
}

export function serializeWorkspaceGraphAuthoringDraftStructuralSignature(
  draft: WorkspaceGraphAuthoringDraft
): string {
  const nodes = [...draft.nodes].sort(compareAuthoringNodes);
  const edges = [...draft.edges].sort(compareAuthoringEdges);
  const signaturePayload = toCanvasAuthoringSerializableValue({
    canvas: {
      id: draft.canvas.id,
      kind: draft.canvas.kind,
      title: draft.canvas.title,
      environmentId: draft.canvas.environmentId,
      defaultPermission: draft.canvas.defaultPermission,
    },
    activeCanvasId: draft.activeCanvasId,
    canvases: draft.canvases?.map((workspace) => ({
      canvas: workspace.canvas,
      nodeIds: workspace.nodeIds,
      nodes: [...workspace.nodes].sort(compareAuthoringNodes),
      edges: [...workspace.edges].sort(compareAuthoringEdges),
    })),
    nodeIds: [...draft.nodeIds],
    nodes,
    edges,
  });

  return JSON.stringify(signaturePayload);
}
