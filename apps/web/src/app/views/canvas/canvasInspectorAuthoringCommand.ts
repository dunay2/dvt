/** Owned concern: apply validated route-owned Inspector drafts back into the Canvas draft aggregate. */
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftApplyResult,
  CanvasInspectorNodeDraftInputChanges,
} from './canvasInspectorAuthoring.types';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { modelOutputDependencyRejection } from './canvasModelOutputDependencyPolicy';
import { bindCanvasInputField } from './canvasInputBindingAuthoring';

export function applyCanvasInspectorNodeDraftToSession(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  node: CanonicalNode;
  draft: CanvasInspectorNodeDraft;
  workspaceScope: WorkspaceScope;
}): CanvasInspectorNodeDraftApplyResult {
  const { canonicalNodesById, draftSession, node, draft, workspaceScope } = args;
  const nodes = resolveCanvasDraftNodes(draftSession, canonicalNodesById);
  const edges = draftSession.workingSet.visibleEdges.map((edge, index) => ({
    id: `draft-edge-${index}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: 'lineage' as const,
    ...(edge.executionGate == null ? {} : { executionGate: edge.executionGate }),
  }));

  if (!hasCanvasInspectorNodeDraftChanges(node, draft)) return { outcome: 'no_changes' };

  const errors = validateCanvasInspectorNodeDraft(draft, { node, nodes, edges, workspaceScope });
  if (Object.keys(errors).length > 0)
    return { outcome: 'rejected', reason: 'invalid_draft', errors };

  const updated = applyCanvasInspectorNodeDraft(node, draft, workspaceScope);
  const dependencyRejection = modelOutputDependencyRejection({
    node,
    candidate: updated,
    nodes,
    edges,
  });
  if (dependencyRejection != null) return dependencyRejection;
  const definition =
    node.sourceDefinitionId == null
      ? null
      : (draftSession.localNodeCatalog?.[node.sourceDefinitionId] ??
        canonicalNodesById.get(node.sourceDefinitionId));
  const nextSession =
    definition == null
      ? draftSession
      : canvasDraftSession.workingSet.updateNodeDefinition(draftSession, {
          ...definition,
          metadata: updated.metadata,
          path: updated.path,
        });
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.updateNodeDefinition(nextSession, updated),
  };
}

/** Build the edge and node changes privately; the route owns the single CAS publication. */
export async function applyCanvasInspectorNodeDraftWithInputsToSession(
  args: Parameters<typeof applyCanvasInspectorNodeDraftToSession>[0] &
    Readonly<{ changes: CanvasInspectorNodeDraftInputChanges; editable: boolean }>
): Promise<CanvasInspectorNodeDraftApplyResult> {
  if (!args.editable) return { outcome: 'rejected', reason: 'node_unavailable' };
  const { signal } = args.changes;
  signal?.throwIfAborted();
  const additions = new Map(
    args.changes.inputAdditions.map((source) => [
      JSON.stringify([source.nodeId, source.columnId]),
      source,
    ])
  );
  let candidate = args.draftSession;
  for (const source of additions.values()) {
    const result = await bindCanvasInputField({
      draftSession: candidate,
      canonicalNodesById: args.canonicalNodesById,
      target: { nodeId: args.node.id },
      source,
      editable: args.editable,
      signal,
    });
    signal?.throwIfAborted();
    if (result.outcome === 'rejected') return { outcome: 'rejected', reason: 'invalid_draft' };
    candidate = result.draftSession;
  }
  const node =
    candidate.localNodeCatalog?.[args.node.id] ?? args.canonicalNodesById.get(args.node.id);
  if (node == null || !candidate.workingSet.visibleNodeIds.includes(node.id))
    return { outcome: 'rejected', reason: 'node_unavailable' };
  const result = applyCanvasInspectorNodeDraftToSession({
    ...args,
    node,
    draftSession: candidate,
  });
  return result.outcome === 'no_changes' && candidate !== args.draftSession
    ? { outcome: 'applied', draftSession: candidate }
    : result;
}
