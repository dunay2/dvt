import { describe, expect, it } from 'vitest';

import {
  CANVAS_GRAPH_SEARCH_FIELDS,
  CANVAS_GRAPH_SEARCH_MATCH_PRIORITY,
  CANVAS_GRAPH_SEARCH_ORDERING,
  createCanvasGraphSearchMatchedResultSet,
  createCanvasGraphSearchRequest,
} from './canvasGraphSearch.contract';

describe('Canvas graph search contract', () => {
  it('limits text search to stable canonical node identity and descriptive fields', () => {
    expect(CANVAS_GRAPH_SEARCH_FIELDS).toEqual([
      'name',
      'description',
      'path',
      'kind',
      'pluginId',
      'role',
      'tags',
    ]);
  });

  it('normalizes requests deterministically without locale-specific matching', () => {
    expect(createCanvasGraphSearchRequest('  ORDERS  ')).toEqual({
      query: 'ORDERS',
      normalizedQuery: 'orders',
    });
    expect(createCanvasGraphSearchRequest('')).toEqual({ query: '', normalizedQuery: '' });
  });

  it('declares relevance and tie-break ordering explicitly', () => {
    expect(CANVAS_GRAPH_SEARCH_MATCH_PRIORITY).toEqual(['exact', 'prefix', 'partial']);
    expect(CANVAS_GRAPH_SEARCH_ORDERING).toEqual([
      'match-priority',
      'field-priority',
      'normalized-name',
      'node-id',
    ]);
  });

  it('constructs matched results with a coherent active identity', () => {
    const request = createCanvasGraphSearchRequest('orders');
    const matches = [
      {
        nodeId: 'orders-source',
        matchedFields: ['name'] as const,
        bestMatchKind: 'exact' as const,
      },
      {
        nodeId: 'orders-model',
        matchedFields: ['name'] as const,
        bestMatchKind: 'prefix' as const,
      },
    ];

    expect(createCanvasGraphSearchMatchedResultSet(request, matches, 'orders-model')).toEqual({
      status: 'matched',
      request,
      matches,
      activeMatchIndex: 1,
      activeNodeId: 'orders-model',
    });
  });

  it('rejects contradictory matched result states', () => {
    const request = createCanvasGraphSearchRequest('orders');
    const matches = [
      {
        nodeId: 'orders-source',
        matchedFields: ['name'] as const,
        bestMatchKind: 'exact' as const,
      },
    ];

    expect(() => createCanvasGraphSearchMatchedResultSet(request, [], 'orders-source')).toThrow(
      'requires at least one match'
    );
    expect(() => createCanvasGraphSearchMatchedResultSet(request, matches, 'missing-node')).toThrow(
      'must belong to the result set'
    );
  });
});
