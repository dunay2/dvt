import type { WorkspaceGraphDraft } from '../../ports/workspace';
import type { CanvasDraftEdge, CanvasDraftSession, CanvasDraftWorkingSet, CanonicalSnapshotArgs } from './canvasDraftSession.types';
export const EMPTY_WORKING_SET: CanvasDraftWorkingSet = { visibleNodeIds: [], visibleEdges: [], pendingExplicitNodeIds: [] };
function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function draftEdgesEqual(left: CanvasDraftEdge[], right: CanvasDraftEdge[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (edge, index) =>
        edge.sourceId === right[index]?.sourceId && edge.targetId === right[index]?.targetId
    )
  );
}
function dedupeNodeIds(nodeIds: string[]): string[] {
  return [...new Set(nodeIds)];
}
function dedupeEdges(edges: ReadonlyArray<CanvasDraftEdge>): CanvasDraftEdge[] {
  const seen = new Set<string>();
  const deduped: CanvasDraftEdge[] = [];
  for (const edge of edges) {
    const signature = `${edge.sourceId}::${edge.targetId}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push({ sourceId: edge.sourceId, targetId: edge.targetId });
  }
  return deduped;
}
function buildVisibleEdges(edges: ReadonlyArray<CanvasDraftEdge>, visibleNodeIds: readonly string[]): CanvasDraftEdge[] {
  const visibleNodeIdSet = new Set(visibleNodeIds);
  return dedupeEdges(
    edges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    )
  );
}
function buildWorkingSet(nodeIds: string[], edges: ReadonlyArray<CanvasDraftEdge>): CanvasDraftWorkingSet {
  const visibleNodeIds = dedupeNodeIds(nodeIds);
  return {
    visibleNodeIds,
    visibleEdges: buildVisibleEdges(edges, visibleNodeIds),
    pendingExplicitNodeIds: [],
  };
}
function buildCanonical({
  canonicalNodeIds,
  canonicalEdges,
}: CanonicalSnapshotArgs): CanvasDraftWorkingSet {
  return buildWorkingSet(canonicalNodeIds, canonicalEdges);
}
function buildFromDraft(draft: WorkspaceGraphDraft): CanvasDraftWorkingSet {
  return buildWorkingSet(draft.nodeIds, draft.edges);
}
function workingSetsEqual(left: CanvasDraftWorkingSet, right: CanvasDraftWorkingSet): boolean {
  if (!arraysEqual(left.visibleNodeIds, right.visibleNodeIds)) {
    return false;
  }
  if (!draftEdgesEqual(left.visibleEdges, right.visibleEdges)) {
    return false;
  }
  return arraysEqual(left.pendingExplicitNodeIds, right.pendingExplicitNodeIds);
}
function withWorkingSet(session: CanvasDraftSession, workingSet: CanvasDraftWorkingSet): CanvasDraftSession {
  if (workingSetsEqual(session.workingSet, workingSet)) {
    return session;
  }
  return { ...session, workingSet };
}
function reconcileSnapshot(
  session: CanvasDraftSession,
  { canonicalNodeIds, canonicalEdges }: CanonicalSnapshotArgs
): CanvasDraftSession {
  const knownNodeIds = new Set(dedupeNodeIds(canonicalNodeIds));
  const nextVisibleNodeIds = dedupeNodeIds(session.workingSet.visibleNodeIds);
  const pendingExplicitNodeIds = dedupeNodeIds(
    session.workingSet.pendingExplicitNodeIds.filter(
      (nodeId) => !nextVisibleNodeIds.includes(nodeId)
    )
  );
  const promotedExplicitNodeIds = pendingExplicitNodeIds.filter((nodeId) =>
    knownNodeIds.has(nodeId)
  );
  const nextPendingExplicitNodeIds = pendingExplicitNodeIds.filter(
    (nodeId) => !knownNodeIds.has(nodeId)
  );
  const mergedVisibleNodeIds = dedupeNodeIds([
    ...nextVisibleNodeIds,
    ...promotedExplicitNodeIds,
  ]);
  const visibleNodeIdSet = new Set(mergedVisibleNodeIds);
  const promotedNodeIdSet = new Set(promotedExplicitNodeIds);
  const promotedCanonicalEdges = dedupeEdges(
    canonicalEdges.filter(
      (edge) =>
        visibleNodeIdSet.has(edge.sourceId) &&
        visibleNodeIdSet.has(edge.targetId) &&
        (promotedNodeIdSet.has(edge.sourceId) || promotedNodeIdSet.has(edge.targetId))
    )
  );
  const nextVisibleEdges = dedupeEdges([
    ...session.workingSet.visibleEdges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    ),
    ...promotedCanonicalEdges,
  ]);

  return withWorkingSet(session, {
    visibleNodeIds: mergedVisibleNodeIds,
    visibleEdges: nextVisibleEdges,
    pendingExplicitNodeIds: nextPendingExplicitNodeIds,
  });
}
function queueExplicitNodeIds(
  session: CanvasDraftSession,
  nodeIds: string[]
): CanvasDraftSession {
  if (nodeIds.length === 0) {
    return session;
  }
  const nextPendingNodeIds = dedupeNodeIds([
    ...session.workingSet.pendingExplicitNodeIds,
    ...nodeIds.filter((nodeId) => !session.workingSet.visibleNodeIds.includes(nodeId)),
  ]);
  if (arraysEqual(session.workingSet.pendingExplicitNodeIds, nextPendingNodeIds)) {
    return session;
  }
  return withWorkingSet(session, {
    ...session.workingSet,
    pendingExplicitNodeIds: nextPendingNodeIds,
  });
}
function addExplicitNode(session: CanvasDraftSession, nodeId: string): CanvasDraftSession {
  if (
    session.workingSet.visibleNodeIds.includes(nodeId) &&
    !session.workingSet.pendingExplicitNodeIds.includes(nodeId)
  ) {
    return session;
  }
  const nextVisibleNodeIds = session.workingSet.visibleNodeIds.includes(nodeId)
    ? session.workingSet.visibleNodeIds
    : [...session.workingSet.visibleNodeIds, nodeId];
  const nextPendingNodeIds = session.workingSet.pendingExplicitNodeIds.filter(
    (pendingNodeId) => pendingNodeId !== nodeId
  );

  return withWorkingSet(session, {
    ...session.workingSet,
    visibleNodeIds: nextVisibleNodeIds,
    pendingExplicitNodeIds: nextPendingNodeIds,
  });
}
function removeNode(session: CanvasDraftSession, nodeId: string): CanvasDraftSession {
  return withWorkingSet(session, {
    visibleNodeIds: session.workingSet.visibleNodeIds.filter(
      (visibleNodeId) => visibleNodeId !== nodeId
    ),
    visibleEdges: session.workingSet.visibleEdges.filter(
      (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId
    ),
    pendingExplicitNodeIds: session.workingSet.pendingExplicitNodeIds.filter(
      (pendingNodeId) => pendingNodeId !== nodeId
    ),
  });
}
function replaceEdges(session: CanvasDraftSession, edges: CanvasDraftEdge[]): CanvasDraftSession {
  return withWorkingSet(session, {
    ...session.workingSet,
    visibleEdges: buildVisibleEdges(edges, session.workingSet.visibleNodeIds),
  });
}
// Working-set policy owns aggregate mutation over visible scope and pending nodes.
export const canvasDraftSessionWorkingSet = {
  buildCanonical,
  buildFromDraft,
  reconcileSnapshot,
  queueExplicitNodeIds,
  addExplicitNode,
  removeNode,
  replaceEdges,
} as const;
