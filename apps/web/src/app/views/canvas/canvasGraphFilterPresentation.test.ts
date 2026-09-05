import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { createCanvasGraphFilterQuery } from './canvasGraphFilter.contract';
import { filterCanvasGraph } from './canvasGraphFilter';
import { projectCanvasGraphFilterPresentation } from './canvasGraphFilterPresentation';

const nodes: Node[] = [
  { id: 'source', position: { x: 0, y: 0 }, className: 'domain-source', data: {} },
  { id: 'model', position: { x: 100, y: 0 }, className: 'domain-model', data: {} },
  { id: 'test', position: { x: 200, y: 0 }, className: 'domain-test', data: {} },
];
const edges: Edge[] = [
  { id: 'source-model', source: 'source', target: 'model', className: 'domain-edge-a' },
  { id: 'model-test', source: 'model', target: 'test', className: 'domain-edge-b' },
];
const filterNodes = [
  {
    id: 'source',
    pluginId: 'dvt',
    kind: 'dvt:source' as const,
    role: 'input' as const,
    status: 'success' as const,
    tags: [],
  },
  {
    id: 'model',
    pluginId: 'dvt',
    kind: 'dvt:transform' as const,
    role: 'transform' as const,
    status: 'failed' as const,
    tags: [],
  },
  {
    id: 'test',
    pluginId: 'dbt',
    kind: 'dbt:test' as const,
    role: 'check' as const,
    status: 'idle' as const,
    tags: [],
  },
];

describe('projectCanvasGraphFilterPresentation', () => {
  it('de-emphasizes non-matches and their edges in dim mode', () => {
    const result = filterCanvasGraph(
      filterNodes,
      createCanvasGraphFilterQuery({ predicates: [{ dimension: 'role', value: 'transform' }] })
    );
    const projection = projectCanvasGraphFilterPresentation({ nodes, edges, result });

    expect(projection.nodes.find((node) => node.id === 'source')?.className).toContain(
      'canvas-graph-filter-dimmed-node'
    );
    expect(projection.nodes.find((node) => node.id === 'model')?.className).toBe('domain-model');
    expect(
      projection.edges.every((edge) => edge.className?.includes('canvas-graph-filter-dimmed-edge'))
    ).toBe(true);
  });

  it('removes non-matching nodes and disconnected edges in hide mode', () => {
    const result = filterCanvasGraph(
      filterNodes,
      createCanvasGraphFilterQuery({
        presentation: 'hide',
        predicates: [{ dimension: 'pluginId', value: 'missing' }],
      })
    );
    const projection = projectCanvasGraphFilterPresentation({ nodes, edges, result });

    expect(projection).toEqual({ nodes: [], edges: [] });
  });
});
