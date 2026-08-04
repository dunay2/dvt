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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCanvasGraphSearchRequest(value: unknown): value is CanvasGraphSearchRequest {
  if (!isRecord(value) || typeof value.query !== 'string') {
    return false;
  }

  const canonicalRequest = createCanvasGraphSearchRequest(value.query);
  return (
    value.query === canonicalRequest.query &&
    value.normalizedQuery === canonicalRequest.normalizedQuery
  );
}

function isCanvasGraphSearchMatch(value: unknown): value is CanvasGraphSearchMatch {
  if (
    !isRecord(value) ||
    typeof value.nodeId !== 'string' ||
    value.nodeId.length === 0 ||
    !Array.isArray(value.matchedFields) ||
    value.matchedFields.length === 0 ||
    !CANVAS_GRAPH_SEARCH_MATCH_PRIORITY.includes(value.bestMatchKind as CanvasGraphSearchMatchKind)
  ) {
    return false;
  }

  const fields = value.matchedFields as unknown[];
  return fields.every(
    (field, index) =>
      CANVAS_GRAPH_SEARCH_FIELDS.includes(field as CanvasGraphSearchField) &&
      fields.indexOf(field) === index
  );
}

export function isCanvasGraphSearchResultSet(value: unknown): value is CanvasGraphSearchResultSet {
  if (
    !isRecord(value) ||
    !isCanvasGraphSearchRequest(value.request) ||
    !Array.isArray(value.matches)
  ) {
    return false;
  }

  if (value.status === 'idle') {
    return (
      value.request.normalizedQuery.length === 0 &&
      value.matches.length === 0 &&
      value.activeMatchIndex === null &&
      value.activeNodeId === null
    );
  }

  if (value.status === 'no-match') {
    return (
      value.request.normalizedQuery.length > 0 &&
      value.matches.length === 0 &&
      value.activeMatchIndex === null &&
      value.activeNodeId === null
    );
  }

  if (
    value.status !== 'matched' ||
    value.request.normalizedQuery.length === 0 ||
    value.matches.length === 0 ||
    !value.matches.every(isCanvasGraphSearchMatch) ||
    !Number.isInteger(value.activeMatchIndex) ||
    typeof value.activeNodeId !== 'string'
  ) {
    return false;
  }

  const activeMatch = value.matches[value.activeMatchIndex as number];
  return activeMatch?.nodeId === value.activeNodeId;
}
