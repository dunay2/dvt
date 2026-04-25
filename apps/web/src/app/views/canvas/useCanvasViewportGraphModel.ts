/** Owned concern: project semantic authoring truth into React Flow viewport state only. */
import { useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo } from 'react';

import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { resolveCanvasAuthoringVisibleEdgeId } from './canvasAuthoringGraphProjection';

type UseCanvasViewportGraphModelArgs = {
  visibleNodeIds: string[];
  visibleEdges: Array<{ sourceId: string; targetId: string }>;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
};

type VisibleViewportEdge = UseCanvasViewportGraphModelArgs['visibleEdges'][number];
type PersistedNodePositions = UseCanvasViewportGraphModelArgs['persistedNodePositions'];

function resolveVisibleCanonicalNodes(
  visibleNodeIds: readonly string[],
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): CanonicalNode[] {
  return visibleNodeIds
    .map((nodeId) => canonicalNodesById.get(nodeId))
    .filter((node): node is CanonicalNode => node != null);
}

function projectViewportNodes(args: {
  visibleNodeIds: readonly string[];
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: PersistedNodePositions;
  fallbackPositionsById?: ReadonlyMap<string, Node['position']>;
}): Node[] {
  const {
    visibleNodeIds,
    canonicalNodesById,
    columnLevelLineageEnabled,
    persistedNodePositions,
    fallbackPositionsById,
  } = args;

  return resolveVisibleCanonicalNodes(visibleNodeIds, canonicalNodesById).map((node, index) =>
    mapCanonicalNodeToCanvasNode(
      node,
      index,
      columnLevelLineageEnabled,
      undefined,
      persistedNodePositions[node.id] ?? fallbackPositionsById?.get(node.id)
    )
  );
}

function projectViewportEdges(args: {
  visibleEdges: readonly VisibleViewportEdge[];
  allowedNodeIds: ReadonlySet<string>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
}): Edge[] {
  const { visibleEdges, allowedNodeIds, canonicalEdgeIdBySignature } = args;

  return visibleEdges
    .filter((edge) => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId))
    .map((edge) => ({
      id: resolveCanvasAuthoringVisibleEdgeId({
        edge,
        canonicalEdgeIdBySignature,
      }),
      source: edge.sourceId,
      target: edge.targetId,
    }));
}

function viewportEdgesEqual(left: Edge[], right: Edge[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (edge, index) =>
        edge.id === right[index]?.id &&
        edge.source === right[index]?.source &&
        edge.target === right[index]?.target
    )
  );
}

function viewportNodesEqual(left: Node[], right: Node[]): boolean {
  return (
    left.length === right.length &&
    left.every((node, index) => {
      const nextNode = right[index];

      return (
        nextNode != null &&
        node.id === nextNode.id &&
        node.position.x === nextNode.position.x &&
        node.position.y === nextNode.position.y &&
        node.data.showColumns === nextNode.data.showColumns &&
        node.data.name === nextNode.data.name &&
        node.data.description === nextNode.data.description &&
        node.data.path === nextNode.data.path &&
        node.data.status === nextNode.data.status
      );
    })
  );
}

export function useCanvasViewportGraphModel({
  visibleNodeIds,
  visibleEdges,
  canonicalNodesById,
  canonicalEdgeIdBySignature,
  columnLevelLineageEnabled,
  persistedNodePositions,
}: UseCanvasViewportGraphModelArgs) {
  const initialNodes: Node[] = useMemo(
    () =>
      projectViewportNodes({
        visibleNodeIds,
        canonicalNodesById,
        columnLevelLineageEnabled,
        persistedNodePositions,
      }),
    [canonicalNodesById, columnLevelLineageEnabled, persistedNodePositions, visibleNodeIds]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      projectViewportEdges({
        visibleEdges,
        allowedNodeIds: new Set(visibleNodeIds),
        canonicalEdgeIdBySignature,
      }),
    [canonicalEdgeIdBySignature, visibleEdges, visibleNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((currentNodes) => {
      const nextNodes = projectViewportNodes({
        visibleNodeIds,
        canonicalNodesById,
        columnLevelLineageEnabled,
        persistedNodePositions,
        fallbackPositionsById: new Map(currentNodes.map((node) => [node.id, node.position])),
      });

      return viewportNodesEqual(currentNodes, nextNodes) ? currentNodes : nextNodes;
    });
  }, [
    canonicalNodesById,
    columnLevelLineageEnabled,
    persistedNodePositions,
    setNodes,
    visibleNodeIds,
  ]);

  useEffect(() => {
    setEdges((currentEdges) => {
      const nextEdges = projectViewportEdges({
        visibleEdges,
        allowedNodeIds: new Set(nodes.map((node) => node.id)),
        canonicalEdgeIdBySignature,
      });

      return viewportEdgesEqual(currentEdges, nextEdges) ? currentEdges : nextEdges;
    });
  }, [canonicalEdgeIdBySignature, nodes, setEdges, visibleEdges]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
  };
}
