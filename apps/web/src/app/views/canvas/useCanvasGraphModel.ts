import { useQuery } from '@tanstack/react-query';
import { useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo } from 'react';

import { queryKeys } from '../../queries/queryKeys';
import { mapCanonicalEdgeToCanvasEdge, mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

const EMPTY_WORKSPACE_NODES: Array<{ id: string }> = [];
const EMPTY_WORKSPACE_EDGES: Array<{ id: string }> = [];

function isCanonicalNode(value: CanonicalNode | null): value is CanonicalNode {
  return value !== null;
}

function isCanonicalEdge(value: CanonicalEdge | null): value is CanonicalEdge {
  return value !== null;
}

type UseCanvasGraphModelArgs = {
  workspaceLayoutKey: string;
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

  const initialNodes: Node[] = useMemo(
    () =>
      canonicalNodes.map((node, i) =>
        mapCanonicalNodeToCanvasNode(
          node,
          i,
          columnLevelLineageEnabled,
          undefined,
          persistedNodePositions[node.id]
        )
      ),
    [canonicalNodes, columnLevelLineageEnabled, persistedNodePositions]
  );

  const initialEdges: Edge[] = useMemo(
    () => canonicalEdges.map((canonicalEdge) => mapCanonicalEdgeToCanvasEdge(canonicalEdge)),
    [canonicalEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      const nextNodes = canonicalNodes.map((node, index) => {
        const currentNode = currentNodesById.get(node.id);
        const persisted = persistedNodePositions[node.id];

        return mapCanonicalNodeToCanvasNode(
          node,
          index,
          columnLevelLineageEnabled,
          undefined,
          persisted ?? currentNode?.position
        );
      });

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
    setEdges(initialEdges);
  }, [
    canonicalNodes,
    columnLevelLineageEnabled,
    initialEdges,
    persistedNodePositions,
    setEdges,
    setNodes,
  ]);

  return {
    graphSnapshotQuery,
    workspaceNodes,
    canonicalNodes,
    canonicalNodesById,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
  };
}
