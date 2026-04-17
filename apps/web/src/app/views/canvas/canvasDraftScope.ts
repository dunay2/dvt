import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDraftEdge, CanvasDraftSession } from './canvasDraftSession';

export type VisibleCanvasScope = {
  visibleNodeIds: string[];
  visibleEdges: CanvasDraftEdge[];
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  unresolvedNodeIds: string[];
  unresolvedEdges: CanvasDraftEdge[];
  isProjectionComplete: boolean;
};

export type ExecutionCanvasScope = {
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
};

export type CanvasUiScope = {
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
};

type DeriveVisibleScopeArgs = {
  draftSession: Pick<CanvasDraftSession, 'workingSet'>;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
};

type DeriveExecutionScopeArgs = {
  visibleScope: VisibleCanvasScope;
  selectedNodeIds: string[];
};

type ReconcileUiScopeArgs = {
  visibleScope: VisibleCanvasScope;
  pendingExplicitNodeIds: string[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
};

function edgeSignature(edge: CanvasDraftEdge | CanonicalEdge): string {
  return `${edge.sourceId}::${edge.targetId}`;
}

function buildDraftVisibleEdgeId(sourceId: string, targetId: string): string {
  return `draft_edge_${sourceId}_${targetId}`;
}

function dedupeNodeIds(nodeIds: string[]): string[] {
  return [...new Set(nodeIds)];
}

function dedupeEdges(edges: CanvasDraftEdge[]): CanvasDraftEdge[] {
  const seen = new Set<string>();
  const deduped: CanvasDraftEdge[] = [];

  for (const edge of edges) {
    const signature = edgeSignature(edge);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(edge);
  }

  return deduped;
}

function filterNodeIds(nodeIds: string[], allowedNodeIds: ReadonlySet<string>): string[] {
  return dedupeNodeIds(nodeIds.filter((nodeId) => allowedNodeIds.has(nodeId)));
}

export function areNodeIdsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function deriveVisibleScope({
  draftSession,
  canonicalNodes,
  canonicalEdges,
}: DeriveVisibleScopeArgs): VisibleCanvasScope {
  const canonicalNodesById = new Map(canonicalNodes.map((node) => [node.id, node]));
  const allowedNodeIds = new Set(canonicalNodesById.keys());
  const visibleNodeIds = filterNodeIds(draftSession.workingSet.visibleNodeIds, allowedNodeIds);
  const unresolvedNodeIds = dedupeNodeIds(
    draftSession.workingSet.visibleNodeIds.filter((nodeId) => !allowedNodeIds.has(nodeId))
  );
  const visibleNodeIdSet = new Set(visibleNodeIds);
  const canonicalEdgesBySignature = new Map(
    canonicalEdges.map((edge) => [edgeSignature(edge), edge])
  );
  const visibleEdges = dedupeEdges(
    draftSession.workingSet.visibleEdges.filter(
        (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    )
  );
  const unresolvedEdges = dedupeEdges(
    draftSession.workingSet.visibleEdges.filter(
      (edge) => !visibleNodeIdSet.has(edge.sourceId) || !visibleNodeIdSet.has(edge.targetId)
    )
  );

  return {
    visibleNodeIds,
    visibleEdges,
    canonicalNodes: visibleNodeIds
      .map((nodeId) => canonicalNodesById.get(nodeId))
      .filter((node): node is CanonicalNode => node != null),
    canonicalEdges: visibleEdges.map(
      (edge) =>
        canonicalEdgesBySignature.get(edgeSignature(edge)) ?? {
          id: buildDraftVisibleEdgeId(edge.sourceId, edge.targetId),
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          relation: 'lineage',
        }
    ),
    unresolvedNodeIds,
    unresolvedEdges,
    isProjectionComplete: unresolvedNodeIds.length === 0 && unresolvedEdges.length === 0,
  };
}

export function deriveExecutionScope({
  visibleScope,
  selectedNodeIds,
}: DeriveExecutionScopeArgs): ExecutionCanvasScope {
  const visibleNodeIdSet = new Set(visibleScope.visibleNodeIds);

  return {
    selectedNodeIds: filterNodeIds(selectedNodeIds, visibleNodeIdSet),
    workspaceNodeIds: visibleScope.visibleNodeIds,
  };
}

export function reconcileUiScope({
  visibleScope,
  pendingExplicitNodeIds,
  selectedNodeIds,
  inspectorNodeId,
}: ReconcileUiScopeArgs): CanvasUiScope {
  const allowedNodeIds = new Set([...visibleScope.visibleNodeIds, ...pendingExplicitNodeIds]);

  return {
    selectedNodeIds: filterNodeIds(selectedNodeIds, allowedNodeIds),
    inspectorNodeId:
      inspectorNodeId != null && allowedNodeIds.has(inspectorNodeId) ? inspectorNodeId : null,
  };
}
