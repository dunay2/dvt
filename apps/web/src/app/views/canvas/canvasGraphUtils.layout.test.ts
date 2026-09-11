import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';

import { getLayoutedElements } from './canvasGraphUtils';

function graph(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: 'source', position: { x: 0, y: 0 }, data: {} },
      { id: 'target', position: { x: 0, y: 0 }, data: {} },
    ],
    edges: [{ id: 'source-target', source: 'source', target: 'target' }],
  };
}

describe('getLayoutedElements', () => {
  it('preserves the existing Canvas defaults', () => {
    const { nodes, edges } = graph();
    const layout = getLayoutedElements(nodes, edges);

    expect(layout.nodes[0]?.position).toEqual({ x: 0, y: 0 });
    expect(layout.nodes[1]?.position).toEqual({ x: 350, y: 0 });
    expect(layout.edges).toBe(edges);
  });

  it('accepts bounded semantic-workbench Dagre options without another layout helper', () => {
    const first = graph();
    const second = graph();
    const options = {
      nodeSize: { width: 184, height: 58 },
      ranker: 'network-simplex' as const,
      ranksep: 92,
      nodesep: 34,
      marginx: 24,
      marginy: 24,
    };

    const layout = getLayoutedElements(first.nodes, first.edges, options);
    const repeated = getLayoutedElements(second.nodes, second.edges, options);

    expect(layout.nodes.map((node) => node.position)).toEqual([
      { x: 24, y: 24 },
      { x: 300, y: 24 },
    ]);
    expect(repeated.nodes.map((node) => node.position)).toEqual(
      layout.nodes.map((node) => node.position)
    );
  });
});
