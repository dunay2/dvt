import { useQuery } from '@tanstack/react-query';
import { useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo } from 'react';

import { queryKeys } from '../../queries/queryKeys';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

const EMPTY_WORKSPACE_NODES: Array<{ id: string }> = [];
const EMPTY_WORKSPACE_EDGES: Array<{ id: string }> = [];

function isCanonicalNode(value: CanonicalNode | null): value is CanonicalNode {
  return value !== null;
}

function isCanonicalEdge(value: CanonicalEdge | null): value is CanonicalEdge {
  return value !== null;
}

function draftEdgesEqual(left: Edge[], right: Edge[]): boolean {
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

function buildVisibleEdgeId(sourceId: string, targetId: string): string {
  return `draft_edge_${sourceId}_${targetId}`;
}

function resolveVisibleEdgeId(
  sourceId: string,
  targetId: string,
  canonicalEdgeIdBySignature: Map<string, string>
): string {
  return canonicalEdgeIdBySignature.get(`${sourceId}::${targetId}`) ?? buildVisibleEdgeId(sourceId, targetId);
}

type UseCanvasGraphModelArgs = {
  workspaceLayoutKey: string;
  visibleNodeIds: string[];
  visibleEdges: Array<{ sourceId: string; targetId: string }>;
  workspaceService: {
    getGraphSnapshot: () => Promise<{ nodes: Array<{ id: string }>; edges: Array<{ id: string }> }>;
  };
  graphStrategy: {
    mapNodeToCanonical: (node: { id: string }) => CanonicalNode | null;
    mapEdgeToCanonical: (edge: { id: string }) => CanonicalEdge | null;
  };
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
};

export function useCanvasGraphModel({
  workspaceLayoutKey,
  visibleNodeIds,
  visibleEdges,
  workspaceService,
  graphStrategy,
  columnLevelLineageEnabled,
  persistedNodePositions,
}: UseCanvasGraphModelArgs) {
  const graphSnapshotQuery = useQuery({
    queryKey: queryKeys.workspace.graph(workspaceLayoutKey),
    queryFn: () => workspaceService.getGraphSnapshot(),
  });

  const workspaceNodes = graphSnapshotQuery.data?.nodes ?? EMPTY_WORKSPACE_NODES;
  const workspaceEdges = graphSnapshotQuery.data?.edges ?? EMPTY_WORKSPACE_EDGES;

  const canonicalNodes = useMemo(
    () =>
      workspaceNodes
        .map((workspaceNode) => graphStrategy.mapNodeToCanonical(workspaceNode))
        .filter(isCanonicalNode),
    [workspaceNodes, graphStrategy]
  );

  const canonicalEdges = useMemo(
    () =>
      workspaceEdges
        .map((workspaceEdge) => graphStrategy.mapEdgeToCanonical(workspaceEdge))
        .filter(isCanonicalEdge),
    [workspaceEdges, graphStrategy]
  );

  const canonicalNodesById = useMemo(
    () => new Map(canonicalNodes.map((node) => [node.id, node])),
    [canonicalNodes]
  );
  const canonicalEdgeIdBySignature = useMemo(
    () =>
      new Map(
        canonicalEdges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge.id])
      ),
    [canonicalEdges]
  );

  const initialNodes: Node[] = useMemo(
    () =>
      visibleNodeIds
        .map((nodeId) => canonicalNodesById.get(nodeId))
        .filter((node): node is CanonicalNode => node != null)
        .map((node, index) =>
          mapCanonicalNodeToCanvasNode(
            node,
            index,
            columnLevelLineageEnabled,
            undefined,
            persistedNodePositions[node.id]
          )
        ),
    [canonicalNodesById, columnLevelLineageEnabled, persistedNodePositions, visibleNodeIds]
  );

  const initialEdges: Edge[] = useMemo(() => {
    const visibleNodeIdSet = new Set(visibleNodeIds);

    return visibleEdges
      .filter(
        (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
      )
      .map((edge) => ({
        id: resolveVisibleEdgeId(edge.sourceId, edge.targetId, canonicalEdgeIdBySignature),
        source: edge.sourceId,
        target: edge.targetId,
      }));
  }, [canonicalEdgeIdBySignature, visibleEdges, visibleNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      const nextNodes = visibleNodeIds
        .map((nodeId) => canonicalNodesById.get(nodeId))
        .filter((node): node is CanonicalNode => node != null)
        .map((node, index) =>
          mapCanonicalNodeToCanvasNode(
            node,
            index,
            columnLevelLineageEnabled,
            undefined,
            persistedNodePositions[node.id] ?? currentNodesById.get(node.id)?.position
          )
        );

      const isSameNodeLayout =
        currentNodes.length === nextNodes.length &&
        currentNodes.every((node, index) => {
          const nextNode = nextNodes[index];

          return (
            nextNode != null &&
            node.id === nextNode.id &&
            node.position.x === nextNode.position.x &&
            node.position.y === nextNode.position.y &&
            node.data.showColumns === nextNode.data.showColumns
          );
        });

      return isSameNodeLayout ? currentNodes : nextNodes;
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
      const allowedNodeIds = new Set(nodes.map((node) => node.id));
      const nextEdges = visibleEdges
        .filter(
          (edge) => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId)
        )
        .map((edge) => ({
          id: resolveVisibleEdgeId(edge.sourceId, edge.targetId, canonicalEdgeIdBySignature),
          source: edge.sourceId,
          target: edge.targetId,
        }));

      return draftEdgesEqual(currentEdges, nextEdges) ? currentEdges : nextEdges;
    });
  }, [canonicalEdgeIdBySignature, nodes, setEdges, visibleEdges]);

  return {
    graphSnapshotQuery,
    workspaceNodes,
    canonicalNodes,
    canonicalEdges,
    canonicalNodesById,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
  };
}
