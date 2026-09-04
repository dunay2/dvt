/** Owned concern: compose semantic authoring truth from protected draft semantics and explicit route-local additions. */
import type { CanvasAuthoringSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { reconcileDvtSourceSemanticColumnOrder } from './canvasDvtSourceSemanticAuthoring';

type CanvasAuthoringVisibleEdge = {
  sourceId: string;
  targetId: string;
};
type CanvasAuthoringEdgeRef = Pick<CanvasAuthoringVisibleEdge, 'sourceId' | 'targetId'>;

type BuildCanvasAuthoringGraphProjectionArgs = {
  visibleNodeIds: readonly string[];
  visibleEdges: readonly CanvasAuthoringVisibleEdge[];
  draftSemanticGraph: CanvasAuthoringSemanticGraph | null;
  localCanonicalNodes: readonly CanonicalNode[];
};

export type CanvasAuthoringGraphProjection = {
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  canonicalNodesById: Map<string, CanonicalNode>;
  canonicalEdgeIdBySignature: Map<string, string>;
  canonicalEdgeBySignature: Map<string, CanonicalEdge>;
};

function buildVisibleEdgeId(edge: CanvasAuthoringEdgeRef): string {
  return `draft_edge_${edge.sourceId}_${edge.targetId}`;
}

function edgeSignature(edge: CanvasAuthoringEdgeRef): string {
  return `${edge.sourceId}::${edge.targetId}`;
}

function mergeDraftSemanticNodes(args: {
  draftSemanticGraph: CanvasAuthoringSemanticGraph | null;
  localCanonicalNodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const { draftSemanticGraph, localCanonicalNodes, scopedNodeIds } = args;
  const scopedNodeIdSet = new Set(scopedNodeIds);
  const mergedNodes = indexScopedDraftSemanticNodes({
    draftSemanticGraph,
    scopedNodeIdSet,
  });

  overlayRouteLocalNodes({
    mergedNodes,
    localCanonicalNodes,
    scopedNodeIds,
  });

  return selectScopedMergedNodes({ mergedNodes, scopedNodeIds });
}

function indexScopedDraftSemanticNodes(args: {
  draftSemanticGraph: CanvasAuthoringSemanticGraph | null;
  scopedNodeIdSet: ReadonlySet<string>;
}): Map<string, CanonicalNode> {
  const { draftSemanticGraph, scopedNodeIdSet } = args;
  const nodesById = new Map<string, CanonicalNode>();

  for (const node of draftSemanticGraph?.canonicalNodes ?? []) {
    if (scopedNodeIdSet.has(node.id)) {
      nodesById.set(node.id, node);
    }
  }

  return nodesById;
}

function overlayRouteLocalNodes(args: {
  mergedNodes: Map<string, CanonicalNode>;
  localCanonicalNodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): void {
  const { mergedNodes, localCanonicalNodes, scopedNodeIds } = args;
  const localNodesById = new Map(localCanonicalNodes.map((node) => [node.id, node]));

  for (const nodeId of scopedNodeIds) {
    const localNode = localNodesById.get(nodeId);
    if (localNode != null) {
      mergedNodes.set(nodeId, localNode);
    }
  }
}

function selectScopedMergedNodes(args: {
  mergedNodes: ReadonlyMap<string, CanonicalNode>;
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const { mergedNodes, scopedNodeIds } = args;

  return scopedNodeIds
    .map((nodeId) => mergedNodes.get(nodeId))
    .filter((node): node is CanonicalNode => node != null)
    .map(reconcileDvtSourceSemanticColumnOrder);
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
  draftSemanticGraph: CanvasAuthoringSemanticGraph | null;
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
  draftSemanticGraph: CanvasAuthoringSemanticGraph | null;
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
    canonicalEdgeBySignature: new Map(canonicalEdges.map((edge) => [edgeSignature(edge), edge])),
  };
}

export function resolveCanvasAuthoringVisibleEdgeId(args: {
  edge: CanvasAuthoringEdgeRef;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
}): string {
  const { edge, canonicalEdgeIdBySignature } = args;

  return canonicalEdgeIdBySignature.get(edgeSignature(edge)) ?? buildVisibleEdgeId(edge);
}
