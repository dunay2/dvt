import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

type LayoutOptions = Readonly<{
  gridSize?: number;
  snapToGrid?: boolean;
  nodeSize?: Readonly<{ width: number; height: number }>;
  rankdir?: 'LR' | 'RL' | 'TB' | 'BT';
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  ranksep?: number;
  nodesep?: number;
  marginx?: number;
  marginy?: number;
}>;

const DEFAULT_NODE_SIZE = Object.freeze({ width: 200, height: 80 });

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

export function getLayoutedElements<TNode extends Node, TEdge extends Edge>(
  nodes: TNode[],
  edges: TEdge[],
  options: LayoutOptions = {}
): { nodes: TNode[]; edges: TEdge[] } {
  const nodeSize = options.nodeSize ?? DEFAULT_NODE_SIZE;
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: options.rankdir ?? 'LR',
    ranker: options.ranker ?? 'longest-path',
    ranksep: options.ranksep ?? 150,
    nodesep: options.nodesep ?? 100,
    ...(options.marginx == null ? {} : { marginx: options.marginx }),
    ...(options.marginy == null ? {} : { marginy: options.marginy }),
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeSize.width, height: nodeSize.height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: TNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id) as { x: number; y: number };
    return {
      ...node,
      position: resolveLayoutPosition(
        {
          x: nodeWithPosition.x - nodeSize.width / 2,
          y: nodeWithPosition.y - nodeSize.height / 2,
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
