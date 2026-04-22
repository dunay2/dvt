/** Owned concern: compose semantic authoring truth from protected draft semantics and explicit route-local additions. */
import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

type CanvasAuthoringVisibleEdge = {
  sourceId: string;
  targetId: string;
};
type CanvasAuthoringEdgeRef = Pick<CanvasAuthoringVisibleEdge, 'sourceId' | 'targetId'>;

type BuildCanvasAuthoringGraphProjectionArgs = {
  visibleNodeIds: readonly string[];
  visibleEdges: readonly CanvasAuthoringVisibleEdge[];
  draftSemanticGraph: WorkspaceGraphDraftSemanticGraph | null;
  localCanonicalNodes: readonly CanonicalNode[];
};

export type CanvasAuthoringGraphProjection = {
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  canonicalNodesById: Map<string, CanonicalNode>;
  canonicalEdgeIdBySignature: Map<string, string>;
};

function buildVisibleEdgeId(edge: CanvasAuthoringEdgeRef): string {
  return `draft_edge_${edge.sourceId}_${edge.targetId}`;
}

function edgeSignature(edge: CanvasAuthoringEdgeRef): string {
  return `${edge.sourceId}::${edge.targetId}`;
}

function mergeDraftSemanticNodes(args: {
  draftSemanticGraph: WorkspaceGraphDraftSemanticGraph | null;
  localCanonicalNodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const { draftSemanticGraph, localCanonicalNodes, scopedNodeIds } = args;
  const mergedNodes = new Map(
    (draftSemanticGraph?.canonicalNodes ?? []).map((node) => [node.id, node])
  );
  const localNodesById = new Map(localCanonicalNodes.map((node) => [node.id, node]));

  for (const nodeId of scopedNodeIds) {
    if (mergedNodes.has(nodeId)) {
      continue;
    }

    const localNode = localNodesById.get(nodeId);
    if (localNode != null) {
      mergedNodes.set(nodeId, localNode);
    }
  }

  return [...mergedNodes.values()];
}

function hasKnownCanvasAuthoringEdgeNodes(args: {
  edge: CanvasAuthoringEdgeRef;
  knownNodeIds: ReadonlySet<string>;
}): boolean {
  const { edge, knownNodeIds } = args;

  return knownNodeIds.has(edge.sourceId) && knownNodeIds.has(edge.targetId);
}

function buildVisibleFallbackCanonicalEdge(edge: CanvasAuthoringVisibleEdge): CanonicalEdge {
  return {
    id: buildVisibleEdgeId(edge),
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: 'lineage',
  };
}

function appendProtectedSemanticEdges(args: {
  mergedEdges: Map<string, CanonicalEdge>;
  draftSemanticGraph: WorkspaceGraphDraftSemanticGraph | null;
  knownNodeIds: ReadonlySet<string>;
}): void {
  const { mergedEdges, draftSemanticGraph, knownNodeIds } = args;

  for (const edge of draftSemanticGraph?.canonicalEdges ?? []) {
    if (!hasKnownCanvasAuthoringEdgeNodes({ edge, knownNodeIds })) {
      continue;
    }

    mergedEdges.set(edgeSignature(edge), edge);
  }
}

function appendVisibleFallbackEdges(args: {
  mergedEdges: Map<string, CanonicalEdge>;
  visibleEdges: readonly CanvasAuthoringVisibleEdge[];
  knownNodeIds: ReadonlySet<string>;
}): void {
  const { mergedEdges, visibleEdges, knownNodeIds } = args;

  for (const edge of visibleEdges) {
    if (!hasKnownCanvasAuthoringEdgeNodes({ edge, knownNodeIds })) {
      continue;
    }

    const signature = edgeSignature(edge);
    if (mergedEdges.has(signature)) {
      continue;
    }

    mergedEdges.set(signature, buildVisibleFallbackCanonicalEdge(edge));
  }
}

function mergeDraftSemanticEdges(args: {
  draftSemanticGraph: WorkspaceGraphDraftSemanticGraph | null;
  visibleEdges: readonly CanvasAuthoringVisibleEdge[];
  knownNodeIds: ReadonlySet<string>;
}): CanonicalEdge[] {
  const { draftSemanticGraph, visibleEdges, knownNodeIds } = args;
  const mergedEdges = new Map<string, CanonicalEdge>();

  appendProtectedSemanticEdges({
    mergedEdges,
    draftSemanticGraph,
    knownNodeIds,
  });
  appendVisibleFallbackEdges({
    mergedEdges,
    visibleEdges,
    knownNodeIds,
  });

  return [...mergedEdges.values()];
}

export function buildCanvasAuthoringGraphProjection({
  visibleNodeIds,
  visibleEdges,
  draftSemanticGraph,
  localCanonicalNodes,
}: BuildCanvasAuthoringGraphProjectionArgs): CanvasAuthoringGraphProjection {
  const scopedNodeIds = [...new Set(visibleNodeIds)];
  const canonicalNodes = mergeDraftSemanticNodes({
    draftSemanticGraph,
    localCanonicalNodes,
    scopedNodeIds,
  });
  const knownNodeIds = new Set(canonicalNodes.map((node) => node.id));
  const canonicalEdges = mergeDraftSemanticEdges({
    draftSemanticGraph,
    visibleEdges,
    knownNodeIds,
  });

  return {
    canonicalNodes,
    canonicalEdges,
    canonicalNodesById: new Map(canonicalNodes.map((node) => [node.id, node])),
    canonicalEdgeIdBySignature: new Map(
      canonicalEdges.map((edge) => [edgeSignature(edge), edge.id])
    ),
  };
}

export function resolveCanvasAuthoringVisibleEdgeId(args: {
  edge: CanvasAuthoringEdgeRef;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
}): string {
  const { edge, canonicalEdgeIdBySignature } = args;

  return canonicalEdgeIdBySignature.get(edgeSignature(edge)) ?? buildVisibleEdgeId(edge);
}
