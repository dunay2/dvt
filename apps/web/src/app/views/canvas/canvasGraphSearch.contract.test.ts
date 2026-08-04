import { describe, expect, it } from 'vitest';

import {
  CANVAS_GRAPH_SEARCH_FIELDS,
  CANVAS_GRAPH_SEARCH_MATCH_PRIORITY,
  CANVAS_GRAPH_SEARCH_ORDERING,
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
});
