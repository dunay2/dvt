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
} from './canvasInspectorAuthoring.types';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';

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

  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(
      draftSession,
      applyCanvasInspectorNodeDraft(node, draft, workspaceScope)
    ),
  };
}
