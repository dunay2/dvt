import type { WorkspaceGraphDraft, WorkspaceGraphSnapshot } from '../../ports/workspace';
import type { CanvasDraftEdge, CanvasDraftSession } from './canvasDraftSession';

export type CanvasDraftLifecycleCanonicalSnapshot = {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};

export type CanvasDraftLifecycleGraphNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
};

export type CanvasDraftLifecycleGraphStrategy = {
  mapNodeToCanonical: (node: { id: string }) => { id: string } | null;
  mapEdgeToCanonical: (edge: { id: string }) => { sourceId: string; targetId: string } | null;
};

export function buildCanonicalSnapshotFromWorkspaceSnapshot(
  graphSnapshot: WorkspaceGraphSnapshot,
  graphStrategy: CanvasDraftLifecycleGraphStrategy
): CanvasDraftLifecycleCanonicalSnapshot {
  const canonicalNodeIds = [
    ...new Set(
      graphSnapshot.nodes.flatMap((node) => {
        const canonicalNode = graphStrategy.mapNodeToCanonical(node);
        return canonicalNode == null ? [] : [canonicalNode.id];
      })
    ),
  ];
  const canonicalNodeIdSet = new Set(canonicalNodeIds);
  const canonicalEdges: CanvasDraftEdge[] = [];
  const seenEdgeSignatures = new Set<string>();

  for (const edge of graphSnapshot.edges) {
    const canonicalEdge = graphStrategy.mapEdgeToCanonical(edge);
    const canProjectCanonicalEdge =
      canonicalEdge != null &&
      canonicalNodeIdSet.has(canonicalEdge.sourceId) &&
      canonicalNodeIdSet.has(canonicalEdge.targetId);
    if (!canProjectCanonicalEdge) {
      continue;
    }

    const signature = `${canonicalEdge.sourceId}::${canonicalEdge.targetId}`;
    if (seenEdgeSignatures.has(signature)) {
      continue;
    }

    seenEdgeSignatures.add(signature);
    canonicalEdges.push({
      sourceId: canonicalEdge.sourceId,
      targetId: canonicalEdge.targetId,
    });
  }

  return {
    canonicalNodeIds,
    canonicalEdges,
  };
}

export function buildCurrentDraftPayload(
  graphNodes: CanvasDraftLifecycleGraphNode[],
  draftSession: CanvasDraftSession
): WorkspaceGraphDraft {
  const currentNodePositions = Object.fromEntries(
    graphNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
  );
  const visibleNodeIds = draftSession.workingSet.visibleNodeIds.filter(
    (nodeId) => currentNodePositions[nodeId] != null
  );
  const visibleNodeIdSet = new Set(visibleNodeIds);
  const nodePositions: Record<string, { x: number; y: number }> = {};

  for (const nodeId of visibleNodeIds) {
    const position = currentNodePositions[nodeId];
    if (position != null) {
      nodePositions[nodeId] = position;
    }
  }

  return {
    nodeIds: visibleNodeIds,
    nodePositions,
    edges: draftSession.workingSet.visibleEdges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    ),
  };
}

export function isCurrentDraftProjectable(
  currentDraftPayload: WorkspaceGraphDraft,
  draftSession: CanvasDraftSession
): boolean {
  return (
    currentDraftPayload.nodeIds.length === draftSession.workingSet.visibleNodeIds.length &&
    currentDraftPayload.edges.length === draftSession.workingSet.visibleEdges.length
  );
}
