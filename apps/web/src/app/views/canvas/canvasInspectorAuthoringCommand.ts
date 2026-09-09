/** Owned concern: apply validated route-owned Inspector drafts back into the Canvas draft aggregate. */
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';

export function applyCanvasInspectorNodeDraftToSession(args: {
  draftSession: CanvasDraftSession;
  node: CanonicalNode;
  draft: CanvasInspectorNodeDraft;
  workspaceScope: WorkspaceScope;
}): CanvasDraftSession {
  const { draftSession, node, draft, workspaceScope } = args;
  const localNodes = Object.values(draftSession.localNodeCatalog ?? {});
  const nodes = localNodes.some((candidate) => candidate.id === node.id)
    ? localNodes
    : [...localNodes, node];
  const edges = draftSession.workingSet.visibleEdges.map((edge, index) => ({
    id: `draft-edge-${index}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: 'lineage' as const,
    ...(edge.executionGate == null ? {} : { executionGate: edge.executionGate }),
  }));

  if (
    !hasCanvasInspectorNodeDraftChanges(node, draft) ||
    Object.keys(validateCanvasInspectorNodeDraft(draft, { node, nodes, edges, workspaceScope }))
      .length > 0
  ) {
    return draftSession;
  }

  return canvasDraftSession.workingSet.upsertNode(
    draftSession,
    applyCanvasInspectorNodeDraft(node, draft, workspaceScope)
  );
}
