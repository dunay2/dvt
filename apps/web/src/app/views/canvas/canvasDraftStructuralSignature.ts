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

export function toWorkspaceGraphAuthoringNodeKind(
  node: Pick<WorkspaceGraphAuthoringDraft['nodes'][number], 'kind' | 'pluginId'>
): string {
  const pluginPrefix = `${node.pluginId}:`;
  return node.kind.startsWith(pluginPrefix) ? node.kind.slice(pluginPrefix.length) : node.kind;
}

function structuralWorkspace(
  workspace: Pick<WorkspaceGraphAuthoringDraft, 'canvas' | 'nodeIds' | 'nodes' | 'edges'>
) {
  return {
    canvas: workspace.canvas,
    nodeIds: workspace.nodeIds,
    nodes: [...workspace.nodes].sort(compareAuthoringNodes).map((node) => ({
      ...node,
      kind: toWorkspaceGraphAuthoringNodeKind(node),
    })),
    edges: [...workspace.edges].sort(compareAuthoringEdges),
  };
}

export function serializeWorkspaceGraphAuthoringDraftStructuralSignature(
  draft: WorkspaceGraphAuthoringDraft
): string {
  const active = structuralWorkspace(draft);
  const activeCanvasId = draft.activeCanvasId ?? draft.canvas.id;
  const canvases =
    draft.canvases?.map(structuralWorkspace) ?? (activeCanvasId ? [active] : undefined);
  return JSON.stringify(
    toCanvasAuthoringSerializableValue({ ...active, activeCanvasId, canvases })
  );
}
