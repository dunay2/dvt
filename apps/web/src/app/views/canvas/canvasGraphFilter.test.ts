import { describe, expect, it } from 'vitest';

import {
  createCanvasGraphFilterQuery,
  type CanvasGraphFilterNode,
} from './canvasGraphFilter.contract';
import { filterCanvasGraph } from './canvasGraphFilter';

const nodes: readonly CanvasGraphFilterNode[] = [
  {
    id: 'orders-source',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'success',
    tags: ['finance', 'critical'],
  },
  {
    id: 'orders-model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'failed',
    tags: ['finance'],
  },
  {
    id: 'warehouse-source',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['raw'],
  },
];

describe('filterCanvasGraph', () => {
  it('composes predicates with explicit AND semantics', () => {
    const result = filterCanvasGraph(
      nodes,
      createCanvasGraphFilterQuery({
        composition: 'and',
        predicates: [
          { dimension: 'pluginId', value: 'dvt' },
          { dimension: 'role', value: 'transform' },
          { dimension: 'tag', value: 'finance' },
        ],
      })
    );

    expect(result.status).toBe('matched');
    expect(result.matchingNodeIds).toEqual(['orders-model']);
    expect(result.nonMatchingNodeIds).toEqual(['orders-source', 'warehouse-source']);
  });

  it('composes predicates with explicit OR semantics', () => {
    const result = filterCanvasGraph(
      nodes,
      createCanvasGraphFilterQuery({
        composition: 'or',
        predicates: [
          { dimension: 'status', value: 'failed' },
          { dimension: 'pluginId', value: 'dvt.warehouse-source' },
        ],
      })
    );

    expect(result.matchingNodeIds).toEqual(['orders-model', 'warehouse-source']);
  });

  it('returns the complete graph for a cleared query without mutating input nodes', () => {
    const before = structuredClone(nodes);
    const result = filterCanvasGraph(nodes, createCanvasGraphFilterQuery());

    expect(result).toMatchObject({
      status: 'idle',
      matchingNodeIds: ['orders-source', 'orders-model', 'warehouse-source'],
      nonMatchingNodeIds: [],
    });
    expect(nodes).toEqual(before);
  });
});
