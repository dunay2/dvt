/** Owned concern: define the read-only Canvas graph search query contract and invariants. */
import type { CanonicalNode } from '../../types/canonical';

export const CANVAS_GRAPH_SEARCH_FIELDS = [
  'name',
  'description',
  'path',
  'kind',
  'pluginId',
  'role',
  'tags',
] as const;

export type CanvasGraphSearchField = (typeof CANVAS_GRAPH_SEARCH_FIELDS)[number];

export const CANVAS_GRAPH_SEARCH_MATCH_PRIORITY = ['exact', 'prefix', 'partial'] as const;
export type CanvasGraphSearchMatchKind = (typeof CANVAS_GRAPH_SEARCH_MATCH_PRIORITY)[number];

export const CANVAS_GRAPH_SEARCH_ORDERING = [
  'match-priority',
  'field-priority',
  'normalized-name',
  'node-id',
] as const;

export type CanvasGraphSearchNode = Readonly<
  Pick<CanonicalNode, 'id' | 'name' | 'description' | 'path' | 'kind' | 'pluginId' | 'role'> & {
    tags: readonly string[];
  }
>;

export type CanvasGraphSearchRequest = Readonly<{
  query: string;
  normalizedQuery: string;
}>;

export type CanvasGraphSearchMatch = Readonly<{
  nodeId: string;
  matchedFields: readonly CanvasGraphSearchField[];
  bestMatchKind: CanvasGraphSearchMatchKind;
}>;

type CanvasGraphSearchEmptyResultSet = Readonly<{
  status: 'idle' | 'no-match';
  request: CanvasGraphSearchRequest;
  matches: readonly [];
  activeMatchIndex: null;
  activeNodeId: null;
}>;

type CanvasGraphSearchMatchedResultSet = Readonly<{
  status: 'matched';
  request: CanvasGraphSearchRequest;
  matches: readonly CanvasGraphSearchMatch[];
  activeMatchIndex: number;
  activeNodeId: string;
}>;

export type CanvasGraphSearchResultSet =
  CanvasGraphSearchEmptyResultSet | CanvasGraphSearchMatchedResultSet;

export type SearchCanvasGraphQuery = (
  nodes: readonly CanvasGraphSearchNode[],
  request: CanvasGraphSearchRequest,
  previousActiveNodeId?: string | null
) => CanvasGraphSearchResultSet;

export function createCanvasGraphSearchRequest(query: string): CanvasGraphSearchRequest {
  const trimmedQuery = query.trim().normalize('NFKC');
  return {
    query: trimmedQuery,
    normalizedQuery: trimmedQuery.toLowerCase(),
  };
}
