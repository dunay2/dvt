import { useQuery } from '@tanstack/react-query';
import { useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo, useRef } from 'react';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
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
  draftHydrationRecord: WorkspaceGraphDraftRecord | null;
  draftModeEnabled: boolean;
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
  draftHydrationRecord,
  draftModeEnabled,
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
  const lastHydratedDraftRevisionRef = useRef<string | null>(null);
  const hydratedDraftGraph = useMemo(() => {
    if (draftHydrationRecord == null) {
      return null;
    }

    const knownNodeIds = new Set(canonicalNodes.map((node) => node.id));
    const visibleNodeIds = draftHydrationRecord.draft.nodeIds.filter((nodeId) =>
      knownNodeIds.has(nodeId)
    );
    const allowedNodeIds = new Set(visibleNodeIds);
    const visibleNodes = visibleNodeIds
      .map((nodeId) => canonicalNodesById.get(nodeId))
      .filter((node): node is CanonicalNode => node != null);

    return {
      nodes: visibleNodes.map((node, index) =>
        mapCanonicalNodeToCanvasNode(
          node,
          index,
          columnLevelLineageEnabled,
          undefined,
          draftHydrationRecord.draft.nodePositions[node.id] ?? persistedNodePositions[node.id]
        )
      ),
      edges: draftHydrationRecord.draft.edges
        .filter(
          (edge) => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId)
        )
        .map((edge, index) => ({
          id: `draft_edge_${index}_${edge.sourceId}_${edge.targetId}`,
          source: edge.sourceId,
          target: edge.targetId,
        })),
    };
  }, [
    canonicalNodes,
    canonicalNodesById,
    columnLevelLineageEnabled,
    draftHydrationRecord,
    persistedNodePositions,
  ]);

  const initialNodes: Node[] = useMemo(
    () =>
      hydratedDraftGraph?.nodes ??
      canonicalNodes.map((node, i) =>
        mapCanonicalNodeToCanvasNode(
          node,
          i,
          columnLevelLineageEnabled,
          undefined,
          persistedNodePositions[node.id]
        )
      ),
    [canonicalNodes, columnLevelLineageEnabled, hydratedDraftGraph, persistedNodePositions]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      hydratedDraftGraph?.edges ??
      canonicalEdges.map((canonicalEdge) => mapCanonicalEdgeToCanvasEdge(canonicalEdge)),
    [canonicalEdges, hydratedDraftGraph]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (draftHydrationRecord == null) {
      return;
    }
    if (lastHydratedDraftRevisionRef.current === draftHydrationRecord.revision) {
      return;
    }

    if (hydratedDraftGraph == null) {
      return;
    }

    setNodes(hydratedDraftGraph.nodes);
    setEdges(hydratedDraftGraph.edges);
    lastHydratedDraftRevisionRef.current = draftHydrationRecord.revision;
  }, [
    draftHydrationRecord,
    hydratedDraftGraph,
    setEdges,
    setNodes,
  ]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      const nextVisibleNodes = draftModeEnabled
        ? currentNodes
            .map((node) => canonicalNodesById.get(node.id))
            .filter((node): node is CanonicalNode => node != null)
        : canonicalNodes;
      const nextNodes = nextVisibleNodes.map((node, index) => {
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
  }, [
    canonicalNodes,
    canonicalNodesById,
    columnLevelLineageEnabled,
    draftModeEnabled,
    nodes,
    persistedNodePositions,
    setNodes,
  ]);

  useEffect(() => {
    setEdges((currentEdges) => {
      const allowedNodeIds = new Set(nodes.map((node) => node.id));
      const nextEdges = draftModeEnabled
        ? currentEdges.filter(
            (edge) =>
              allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target)
          )
        : initialEdges;
      const isSameEdgeLayout =
        currentEdges.length === nextEdges.length &&
        currentEdges.every((edge, index) => {
          const nextEdge = nextEdges[index];

          return (
            nextEdge != null &&
            edge.id === nextEdge.id &&
            edge.source === nextEdge.source &&
            edge.target === nextEdge.target
          );
        });

      return isSameEdgeLayout ? currentEdges : nextEdges;
    });
  }, [initialEdges, draftModeEnabled, nodes, setEdges]);

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
