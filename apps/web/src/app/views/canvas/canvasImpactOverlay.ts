import type { Edge, Node } from '@xyflow/react';

type NodeActionHandlers = {
  onInspectNode: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
};

type BuildNodesWithImpactParams = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  handlers: NodeActionHandlers;
};

function getImpactSets(
  edges: Edge[],
  selectedNodeId: string
): { upstream: Set<string>; downstream: Set<string> } {
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  const upstreamQueue = [selectedNodeId];
  const visitedUpstream = new Set<string>();

  while (upstreamQueue.length > 0) {
    const current = upstreamQueue.shift();
    if (!current || visitedUpstream.has(current)) {
      continue;
    }
    visitedUpstream.add(current);

    edges.forEach((edge) => {
      if (edge.target === current && edge.source !== selectedNodeId) {
        upstream.add(edge.source);
        upstreamQueue.push(edge.source);
      }
    });
  }

  const downstreamQueue = [selectedNodeId];
  const visitedDownstream = new Set<string>();

  while (downstreamQueue.length > 0) {
    const current = downstreamQueue.shift();
    if (!current || visitedDownstream.has(current)) {
      continue;
    }
    visitedDownstream.add(current);

    edges.forEach((edge) => {
      if (edge.source === current && edge.target !== selectedNodeId) {
        downstream.add(edge.target);
        downstreamQueue.push(edge.target);
      }
    });
  }

  return { upstream, downstream };
}

export function buildNodesWithImpact({
  nodes,
  edges,
  selectedNodeIds,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  handlers,
}: BuildNodesWithImpactParams): Node[] {
  if (!impactOverlayEnabled || selectedNodeIds.length === 0) {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        showColumns: columnLevelLineageEnabled,
        onInspectNode: handlers.onInspectNode,
        onRemoveNode: handlers.onRemoveNode,
        onToggleNodeSelection: handlers.onToggleNodeSelection,
      },
    }));
  }

  const selectedNodeId = selectedNodeIds[0];
  if (!selectedNodeId) {
    return nodes;
  }
  const { upstream, downstream } = getImpactSets(edges, selectedNodeId);

  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isHighlighted: selectedNodeIds.includes(node.id),
      impactLevel: upstream.has(node.id)
        ? 'upstream'
        : downstream.has(node.id)
          ? 'downstream'
          : 'none',
      showColumns: columnLevelLineageEnabled,
      onInspectNode: handlers.onInspectNode,
      onRemoveNode: handlers.onRemoveNode,
      onToggleNodeSelection: handlers.onToggleNodeSelection,
    },
  }));
}
