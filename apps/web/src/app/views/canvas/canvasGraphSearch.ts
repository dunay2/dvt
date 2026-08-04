/** Owned concern: execute deterministic read-only search over the Canvas canonical node projection. */
import {
  CANVAS_GRAPH_SEARCH_FIELDS,
  CANVAS_GRAPH_SEARCH_MATCH_PRIORITY,
  createCanvasGraphSearchMatchedResultSet,
  createCanvasGraphSearchRequest,
  type CanvasGraphSearchField,
  type CanvasGraphSearchMatch,
  type CanvasGraphSearchMatchKind,
  type CanvasGraphSearchNode,
  type SearchCanvasGraphQuery,
} from './canvasGraphSearch.contract';

type RankedMatch = Readonly<{
  match: CanvasGraphSearchMatch;
  matchPriority: number;
  fieldPriority: number;
  normalizedName: string;
}>;

function normalizeSearchValue(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function valuesForField(
  node: CanvasGraphSearchNode,
  field: CanvasGraphSearchField
): readonly string[] {
  if (field === 'tags') {
    return node.tags;
  }

  const value = node[field];
  return typeof value === 'string' ? [value] : [];
}

function classifyMatch(value: string, query: string): CanvasGraphSearchMatchKind | null {
  const normalizedValue = normalizeSearchValue(value);
  if (normalizedValue === query) {
    return 'exact';
  }
  if (normalizedValue.startsWith(query)) {
    return 'prefix';
  }
  return normalizedValue.includes(query) ? 'partial' : null;
}

function matchPriority(kind: CanvasGraphSearchMatchKind): number {
  return CANVAS_GRAPH_SEARCH_MATCH_PRIORITY.indexOf(kind);
}

function rankNode(node: CanvasGraphSearchNode, query: string): RankedMatch | null {
  const fieldMatches = CANVAS_GRAPH_SEARCH_FIELDS.flatMap((field, fieldPriority) => {
    const kinds = valuesForField(node, field)
      .map((value) => classifyMatch(value, query))
      .filter((kind): kind is CanvasGraphSearchMatchKind => kind !== null);
    if (kinds.length === 0) {
      return [];
    }

    const bestKind = kinds.reduce((best, current) =>
      matchPriority(current) < matchPriority(best) ? current : best
    );
    return [{ field, fieldPriority, kind: bestKind, matchPriority: matchPriority(bestKind) }];
  });

  if (fieldMatches.length === 0) {
    return null;
  }

  const bestMatchPriority = Math.min(...fieldMatches.map((field) => field.matchPriority));
  const bestFieldPriority = Math.min(
    ...fieldMatches
      .filter((field) => field.matchPriority === bestMatchPriority)
      .map((field) => field.fieldPriority)
  );

  return {
    match: {
      nodeId: node.id,
      matchedFields: fieldMatches.map((field) => field.field),
      bestMatchKind: CANVAS_GRAPH_SEARCH_MATCH_PRIORITY[bestMatchPriority]!,
    },
    matchPriority: bestMatchPriority,
    fieldPriority: bestFieldPriority,
    normalizedName: normalizeSearchValue(node.name),
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareRankedMatches(left: RankedMatch, right: RankedMatch): number {
  return (
    left.matchPriority - right.matchPriority ||
    left.fieldPriority - right.fieldPriority ||
    compareText(left.normalizedName, right.normalizedName) ||
    compareText(left.match.nodeId, right.match.nodeId)
  );
}

export const searchCanvasGraph: SearchCanvasGraphQuery = (
  nodes,
  request,
  previousActiveNodeId = null
) => {
  const normalizedRequest = createCanvasGraphSearchRequest(request.query);
  if (!normalizedRequest.normalizedQuery) {
    return {
      status: 'idle',
      request: normalizedRequest,
      matches: [],
      activeMatchIndex: null,
      activeNodeId: null,
    };
  }

  const matches = nodes
    .map((node) => rankNode(node, normalizedRequest.normalizedQuery))
    .filter((match): match is RankedMatch => match !== null)
    .sort(compareRankedMatches)
    .map((rankedMatch) => rankedMatch.match);

  const [firstMatch] = matches;
  if (!firstMatch) {
    return {
      status: 'no-match',
      request: normalizedRequest,
      matches: [],
      activeMatchIndex: null,
      activeNodeId: null,
    };
  }

  const activeNodeId =
    previousActiveNodeId && matches.some((match) => match.nodeId === previousActiveNodeId)
      ? previousActiveNodeId
      : firstMatch.nodeId;
  return createCanvasGraphSearchMatchedResultSet(normalizedRequest, matches, activeNodeId);
};
