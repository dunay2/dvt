import { describe, expect, it } from 'vitest';

import {
  createCanvasGraphSearchRequest,
  type CanvasGraphSearchField,
  type CanvasGraphSearchNode,
} from './canvasGraphSearch.contract';
import { searchCanvasGraph } from './canvasGraphSearch';

function node(
  id: string,
  name: string,
  overrides: Partial<CanvasGraphSearchNode> = {}
): CanvasGraphSearchNode {
  return {
    id,
    name,
    description: undefined,
    path: undefined,
    kind: 'dvt:transform',
    pluginId: 'dvt',
    role: 'transform',
    tags: [],
    ...overrides,
  };
}

describe('searchCanvasGraph', () => {
  it('matches canonical fields case-insensitively and reports field evidence', () => {
    const nodes = [
      node('source-orders', 'Raw Orders', {
        description: 'Warehouse order source',
        path: 'models/sources/orders.yml',
        kind: 'dvt:source',
        role: 'input',
        tags: ['Finance', 'raw'],
      }),
      node('model-orders', 'Orders Mart'),
    ];

    expect(searchCanvasGraph(nodes, createCanvasGraphSearchRequest('RAW')).matches).toEqual([
      {
        nodeId: 'source-orders',
        matchedFields: ['name', 'tags'],
        bestMatchKind: 'exact',
      },
    ]);
    expect(searchCanvasGraph(nodes, createCanvasGraphSearchRequest('orders')).matches).toEqual([
      {
        nodeId: 'model-orders',
        matchedFields: ['name'],
        bestMatchKind: 'prefix',
      },
      {
        nodeId: 'source-orders',
        matchedFields: ['name', 'path'],
        bestMatchKind: 'partial',
      },
    ]);
  });

  it.each<[CanvasGraphSearchField, string]>([
    ['description', 'Warehouse order source'],
    ['path', 'models/sources/orders.yml'],
    ['kind', 'custom:source'],
    ['pluginId', 'warehouse-plugin'],
    ['role', 'input'],
    ['tags', 'Finance'],
  ])('searches the canonical %s field', (field, query) => {
    const candidate = node('source-orders', 'Neutral node', {
      description: 'Warehouse order source',
      path: 'models/sources/orders.yml',
      kind: 'custom:source',
      pluginId: 'warehouse-plugin',
      role: 'input',
      tags: ['Finance'],
    });

    expect(searchCanvasGraph([candidate], createCanvasGraphSearchRequest(query)).matches).toEqual([
      { nodeId: 'source-orders', matchedFields: [field], bestMatchKind: 'exact' },
    ]);
  });

  it('orders ties deterministically by field priority, normalized name, and node id', () => {
    const nodes = [
      node('z-node', 'beta', { description: 'sales' }),
      node('b-node', 'Alpha', { description: 'sales' }),
      node('a-node', 'Alpha', { description: 'sales' }),
      node('name-match', 'Sales ledger'),
    ];

    const result = searchCanvasGraph(nodes, createCanvasGraphSearchRequest('sales'));

    expect(result.matches.map((match) => match.nodeId)).toEqual([
      'a-node',
      'b-node',
      'z-node',
      'name-match',
    ]);
  });

  it('represents empty and no-match queries explicitly', () => {
    const nodes = [node('orders', 'Orders')];

    expect(searchCanvasGraph(nodes, createCanvasGraphSearchRequest(''))).toEqual({
      status: 'idle',
      request: createCanvasGraphSearchRequest(''),
      matches: [],
      activeMatchIndex: null,
      activeNodeId: null,
    });
    expect(searchCanvasGraph(nodes, createCanvasGraphSearchRequest('customers'))).toEqual({
      status: 'no-match',
      request: createCanvasGraphSearchRequest('customers'),
      matches: [],
      activeMatchIndex: null,
      activeNodeId: null,
    });
  });

  it('preserves a valid active result and replaces a stale one after graph changes', () => {
    const request = createCanvasGraphSearchRequest('orders');
    const initialNodes = [node('orders-a', 'Orders A'), node('orders-b', 'Orders B')];
    const initialResult = searchCanvasGraph(initialNodes, request, 'orders-b');

    expect(initialResult.activeNodeId).toBe('orders-b');
    expect(initialResult.activeMatchIndex).toBe(1);

    const changedResult = searchCanvasGraph(
      [initialNodes[0]!],
      request,
      initialResult.activeNodeId
    );

    expect(changedResult.activeNodeId).toBe('orders-a');
    expect(changedResult.activeMatchIndex).toBe(0);
  });

  it('does not mutate nodes and returns the same ordering for repeated evaluation', () => {
    const nodes = [node('orders-b', 'Orders B'), node('orders-a', 'Orders A')];
    const originalOrder = nodes.map((candidate) => candidate.id);
    const request = createCanvasGraphSearchRequest('orders');

    const first = searchCanvasGraph(nodes, request);
    const second = searchCanvasGraph(nodes, request);

    expect(first).toEqual(second);
    expect(nodes.map((candidate) => candidate.id)).toEqual(originalOrder);
  });
});
