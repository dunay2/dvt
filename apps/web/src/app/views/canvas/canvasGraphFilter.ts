/** Owned concern: execute the FilterCanvasGraph query without mutating graph state. */
import {
  createCanvasGraphFilterQuery,
  type CanvasGraphFilterNode,
  type CanvasGraphFilterPredicate,
  type CanvasGraphFilterQuery,
  type CanvasGraphFilterResult,
} from './canvasGraphFilter.contract';

export function filterCanvasGraph(
  nodes: readonly CanvasGraphFilterNode[],
  query: CanvasGraphFilterQuery
): CanvasGraphFilterResult {
  const normalizedQuery = createCanvasGraphFilterQuery(query);
  if (normalizedQuery.predicates.length === 0) {
    return {
      query: normalizedQuery,
      status: 'idle',
      matchingNodeIds: nodes.map((node) => node.id),
      nonMatchingNodeIds: [],
    };
  }

  const matches = (node: CanvasGraphFilterNode): boolean => {
    const predicateResults = normalizedQuery.predicates.map((predicate) =>
      matchesPredicate(node, predicate)
    );
    return normalizedQuery.composition === 'and'
      ? predicateResults.every(Boolean)
      : predicateResults.some(Boolean);
  };
  const matchingNodeIds = nodes.filter(matches).map((node) => node.id);
  const matchingNodeIdSet = new Set(matchingNodeIds);

  return {
    query: normalizedQuery,
    status: matchingNodeIds.length === 0 ? 'no-match' : 'matched',
    matchingNodeIds,
    nonMatchingNodeIds: nodes
      .filter((node) => !matchingNodeIdSet.has(node.id))
      .map((node) => node.id),
  };
}

function matchesPredicate(
  node: CanvasGraphFilterNode,
  predicate: CanvasGraphFilterPredicate
): boolean {
  switch (predicate.dimension) {
    case 'pluginId':
      return node.pluginId === predicate.value;
    case 'kind':
      return node.kind === predicate.value;
    case 'role':
      return node.role === predicate.value;
    case 'status':
      return node.status === predicate.value;
    case 'tag':
      return node.tags.includes(predicate.value);
  }
}
