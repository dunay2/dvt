/** Owned concern: carry explicit empty-definition removal through the existing draft session and projection. */
import type { CanvasAuthoringSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanvasDraftSession } from './canvasDraftSession.types';
import { canRemoveEmptyCanvasModel } from './canvasEmptyModelDefinition';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';

export function removeEmptyCanvasModelDefinition(
  session: CanvasDraftSession,
  id: string
): CanvasDraftSession {
  if (!canRemoveEmptyCanvasModel(session, id)) return session;
  const { [id]: _removed, ...localNodeCatalog } = session.localNodeCatalog ?? {};
  return {
    ...session,
    removedDefinitionIds: [...(session.removedDefinitionIds ?? []), id],
    localNodeCatalog: Object.keys(localNodeCatalog).length ? localNodeCatalog : undefined,
  };
}

export function restoreCanvasDefinition(
  session: CanvasDraftSession,
  id: string
): CanvasDraftSession {
  if (!session.removedDefinitionIds?.includes(id)) return session;
  const retained = session.removedDefinitionIds.filter((removed) => removed !== id);
  return { ...session, removedDefinitionIds: retained.length ? retained : undefined };
}

export function acknowledgeCanvasDefinitionRemovals(
  session: CanvasDraftSession,
  record: CanvasAuthoringDraftRecord
): readonly string[] | undefined {
  const acknowledged = new Set(session.savingRemovedDefinitionIds);
  const savedIds = new Set(record.draft.nodes.map((node) => node.id));
  const pending = session.removedDefinitionIds?.filter(
    (id) => !acknowledged.has(id) || savedIds.has(id)
  );
  return pending?.length ? pending : undefined;
}

export function projectRetainedCanvasDefinitions(
  graph: CanvasAuthoringSemanticGraph | null,
  removedIds: readonly string[] | undefined
): CanvasAuthoringSemanticGraph | null {
  if (graph == null || !removedIds?.length) return graph;
  const removed = new Set(removedIds);
  return {
    canonicalNodes: graph.canonicalNodes.filter((node) => !removed.has(node.id)),
    canonicalEdges: graph.canonicalEdges.filter(
      (edge) => !removed.has(edge.sourceId) && !removed.has(edge.targetId)
    ),
  };
}
