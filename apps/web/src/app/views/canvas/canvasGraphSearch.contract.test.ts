import { describe, expect, it } from 'vitest';

import {
  CANVAS_GRAPH_SEARCH_FIELDS,
  CANVAS_GRAPH_SEARCH_MATCH_PRIORITY,
  CANVAS_GRAPH_SEARCH_ORDERING,
  createCanvasGraphSearchRequest,
  isCanvasGraphSearchResultSet,
  type CanvasGraphSearchResultSet,
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

  it('accepts coherent idle, no-match, and matched result states', () => {
    const states: readonly CanvasGraphSearchResultSet[] = [
      {
        status: 'idle',
        request: { query: '', normalizedQuery: '' },
        matches: [],
        activeMatchIndex: null,
        activeNodeId: null,
      },
      {
        status: 'no-match',
        request: { query: 'missing', normalizedQuery: 'missing' },
        matches: [],
        activeMatchIndex: null,
        activeNodeId: null,
      },
      {
        status: 'matched',
        request: { query: 'orders', normalizedQuery: 'orders' },
        matches: [
          {
            nodeId: 'model.orders',
            matchedFields: ['name'],
            bestMatchKind: 'exact',
          },
        ],
        activeMatchIndex: 0,
        activeNodeId: 'model.orders',
      },
    ];

    for (const state of states) {
      expect(isCanvasGraphSearchResultSet(state)).toBe(true);
    }
  });

  it('rejects result states with stale active identity or query-state contradictions', () => {
    expect(
      isCanvasGraphSearchResultSet({
        status: 'matched',
        request: { query: 'orders', normalizedQuery: 'orders' },
        matches: [
          {
            nodeId: 'model.orders',
            matchedFields: ['name'],
            bestMatchKind: 'exact',
          },
        ],
        activeMatchIndex: 0,
        activeNodeId: 'model.missing',
      })
    ).toBe(false);

    expect(
      isCanvasGraphSearchResultSet({
        status: 'no-match',
        request: { query: '', normalizedQuery: '' },
        matches: [],
        activeMatchIndex: null,
        activeNodeId: null,
      })
    ).toBe(false);
  });
});
