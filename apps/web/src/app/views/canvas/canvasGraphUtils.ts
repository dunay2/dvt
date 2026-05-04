import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

type LayoutOptions = Readonly<{
  gridSize?: number;
  snapToGrid?: boolean;
}>;

function snapCoordinate(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function resolveLayoutPosition(
  position: { x: number; y: number },
  options: LayoutOptions
): { x: number; y: number } {
  if (options.snapToGrid !== true) {
    return position;
  }

  const gridSize = Math.max(1, options.gridSize ?? 20);
  return {
    x: snapCoordinate(position.x, gridSize),
    y: snapCoordinate(position.y, gridSize),
  };
}

export function getLayoutedElements(nodes: Node[], edges: Edge[], options: LayoutOptions = {}) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: resolveLayoutPosition(
        {
          x: nodeWithPosition.x - 100,
          y: nodeWithPosition.y - 40,
        },
        options
      ),
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function createsCycle(edges: Edge[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) {
    return true;
  }

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source) ?? [];
    neighbors.push(edge.target);
    adjacency.set(edge.source, neighbors);
  }

  const stack = [targetId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }
    if (current === sourceId) {
      return true;
    }
    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      stack.push(neighbor);
    }
  }

  return false;
}
