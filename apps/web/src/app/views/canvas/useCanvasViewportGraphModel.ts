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
    mapCanonicalNodeToCanvasNode({
      canonicalNode: node,
      index,
      showColumns: columnLevelLineageEnabled,
      persistedPosition: persistedNodePositions[node.id] ?? fallbackPositionsById?.get(node.id),
    })
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
  return orderedArraysEqual(left, right, viewportEdgeEqual);
}

function viewportNodesEqual(left: Node[], right: Node[]): boolean {
  return orderedArraysEqual(left, right, viewportNodeEqual);
}

function orderedArraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
  areEqual: (leftItem: T, rightItem: T) => boolean
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => areEqual(item, right[index] as T));
}

function viewportEdgeEqual(left: Edge, right: Edge): boolean {
  return left.id === right.id && left.source === right.source && left.target === right.target;
}

function viewportNodeEqual(left: Node, right: Node): boolean {
  return (
    left.id === right.id &&
    viewportNodePositionEqual(left, right) &&
    viewportNodeDataEqual(left.data, right.data)
  );
}

function viewportNodePositionEqual(left: Node, right: Node): boolean {
  return left.position.x === right.position.x && left.position.y === right.position.y;
}

function viewportNodeDataEqual(left: Node['data'], right: Node['data']): boolean {
  return (
    left.showColumns === right.showColumns &&
    left.name === right.name &&
    left.description === right.description &&
    left.path === right.path &&
    left.status === right.status
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
