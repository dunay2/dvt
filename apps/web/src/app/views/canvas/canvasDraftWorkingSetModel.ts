/** Owned concern: normalize and reconcile the visible working-set value without mutating a session. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import type {
  CanvasDraftEdge,
  CanvasDraftWorkingSet,
  CanonicalSnapshotArgs,
} from './canvasDraftSession.types';
import { canvasDraftEdgeExecutionGate } from './canvasDraftEdgeExecutionGate';
function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function draftEdgesEqual(left: CanvasDraftEdge[], right: CanvasDraftEdge[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (edge, index) =>
        edge.sourceId === right[index]?.sourceId &&
        edge.targetId === right[index]?.targetId &&
        edge.executionGate === right[index]?.executionGate &&
        JSON.stringify(edge.inputBindings) === JSON.stringify(right[index]?.inputBindings)
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
    deduped.push({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      ...(edge.executionGate == null ? {} : { executionGate: edge.executionGate }),
      ...(edge.inputBindings == null ? {} : { inputBindings: edge.inputBindings }),
    });
  }
  return deduped;
}
function buildVisibleEdges(
  edges: ReadonlyArray<CanvasDraftEdge>,
  visibleNodeIds: readonly string[]
): CanvasDraftEdge[] {
  const visibleNodeIdSet = new Set(visibleNodeIds);
  return dedupeEdges(
    edges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    )
  );
}
function buildWorkingSet(
  nodeIds: string[],
  edges: ReadonlyArray<CanvasDraftEdge>
): CanvasDraftWorkingSet {
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
function buildFromDraft(draft: WorkspaceGraphAuthoringDraft): CanvasDraftWorkingSet {
  return buildWorkingSet(
    draft.nodeIds,
    draft.edges.map(canvasDraftEdgeExecutionGate.fromAuthoringEdge)
  );
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
function reconcileSnapshot(
  workingSet: CanvasDraftWorkingSet,
  { canonicalNodeIds, canonicalEdges }: CanonicalSnapshotArgs
): CanvasDraftWorkingSet {
  const knownNodeIds = new Set(dedupeNodeIds(canonicalNodeIds));
  const nextVisibleNodeIds = dedupeNodeIds(workingSet.visibleNodeIds);
  const pendingExplicitNodeIds = dedupeNodeIds(
    workingSet.pendingExplicitNodeIds.filter((nodeId) => !nextVisibleNodeIds.includes(nodeId))
  );
  const promotedExplicitNodeIds = pendingExplicitNodeIds.filter((nodeId) =>
    knownNodeIds.has(nodeId)
  );
  const nextPendingExplicitNodeIds = pendingExplicitNodeIds.filter(
    (nodeId) => !knownNodeIds.has(nodeId)
  );
  const mergedVisibleNodeIds = dedupeNodeIds([...nextVisibleNodeIds, ...promotedExplicitNodeIds]);
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
    ...workingSet.visibleEdges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    ),
    ...promotedCanonicalEdges,
  ]);

  return {
    visibleNodeIds: mergedVisibleNodeIds,
    visibleEdges: nextVisibleEdges,
    pendingExplicitNodeIds: nextPendingExplicitNodeIds,
  };
}
export const canvasDraftWorkingSetModel = {
  buildCanonical,
  buildFromDraft,
  equals: workingSetsEqual,
  reconcileSnapshot,
  arraysEqual,
  dedupeNodeIds,
  buildVisibleEdges,
} as const;
