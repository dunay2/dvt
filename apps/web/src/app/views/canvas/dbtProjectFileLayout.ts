/** Owned concern: derive a stable, non-overlapping initial layout for file-backed dbt graphs. */
import dagre from 'dagre';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export const DBT_PROJECT_FILE_LAYOUT_NODE_SIZE = Object.freeze({
  width: 400,
  height: 200,
});

const DBT_PROJECT_FILE_LAYOUT_GAP = Object.freeze({
  rank: 160,
  node: 88,
});

export type DbtProjectFileNodePositions = Record<string, { x: number; y: number }>;

export function buildDbtProjectFileInitialNodePositions(
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): DbtProjectFileNodePositions {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'LR',
    ranksep: DBT_PROJECT_FILE_LAYOUT_GAP.rank,
    nodesep: DBT_PROJECT_FILE_LAYOUT_GAP.node,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { ...DBT_PROJECT_FILE_LAYOUT_NODE_SIZE });
  }
  for (const edge of edges) {
    graph.setEdge(edge.sourceId, edge.targetId);
  }

  dagre.layout(graph);

  return Object.fromEntries(
    nodes.map((node) => {
      const position = graph.node(node.id) as { x: number; y: number } | undefined;
      if (position == null) {
        throw new Error(`dbt project layout omitted node ${node.id}`);
      }

      return [
        node.id,
        {
          x: position.x - DBT_PROJECT_FILE_LAYOUT_NODE_SIZE.width / 2,
          y: position.y - DBT_PROJECT_FILE_LAYOUT_NODE_SIZE.height / 2,
        },
      ];
    })
  );
}

export function mergeDbtProjectFileNodePositions(
  initialPositions: DbtProjectFileNodePositions,
  persistedPositions: DbtProjectFileNodePositions
): DbtProjectFileNodePositions {
  return { ...initialPositions, ...persistedPositions };
}
