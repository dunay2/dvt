/** Owned concern: define the published language for read-only Canvas graph filtering. */
import type { CanonicalNodeStatus, CoreNodeRole, PluginNodeKind } from '../../types/canonical';

export const CANVAS_GRAPH_FILTER_DIMENSIONS = [
  'pluginId',
  'kind',
  'role',
  'status',
  'tag',
] as const;
export type CanvasGraphFilterDimension = (typeof CANVAS_GRAPH_FILTER_DIMENSIONS)[number];

export const CANVAS_GRAPH_FILTER_COMPOSITIONS = ['and', 'or'] as const;
export type CanvasGraphFilterComposition = (typeof CANVAS_GRAPH_FILTER_COMPOSITIONS)[number];

export const CANVAS_GRAPH_FILTER_PRESENTATIONS = ['dim', 'hide'] as const;
export type CanvasGraphFilterPresentationMode = (typeof CANVAS_GRAPH_FILTER_PRESENTATIONS)[number];

export type CanvasGraphFilterPredicate = Readonly<{
  dimension: CanvasGraphFilterDimension;
  value: string;
}>;

export type CanvasGraphFilterNode = Readonly<{
  id: string;
  pluginId: string;
  kind: PluginNodeKind;
  role: CoreNodeRole;
  status: CanonicalNodeStatus;
  tags: readonly string[];
}>;

export type CanvasGraphFilterQuery = Readonly<{
  predicates: readonly CanvasGraphFilterPredicate[];
  composition: CanvasGraphFilterComposition;
  presentation: CanvasGraphFilterPresentationMode;
}>;

export type CanvasGraphFilterResult = Readonly<{
  query: CanvasGraphFilterQuery;
  status: 'idle' | 'matched' | 'no-match';
  matchingNodeIds: readonly string[];
  nonMatchingNodeIds: readonly string[];
}>;

type CanvasGraphFilterQueryInput = Partial<CanvasGraphFilterQuery>;

export function createCanvasGraphFilterQuery(
  input: CanvasGraphFilterQueryInput = {}
): CanvasGraphFilterQuery {
  const seenPredicates = new Set<string>();
  const predicates = (input.predicates ?? []).flatMap((predicate) => {
    const value = predicate.value.trim();
    const identity = `${predicate.dimension}\u0000${value}`;
    if (value.length === 0 || seenPredicates.has(identity)) {
      return [];
    }
    seenPredicates.add(identity);
    return [{ dimension: predicate.dimension, value }];
  });

  return {
    predicates,
    composition: input.composition ?? 'and',
    presentation: input.presentation ?? 'dim',
  };
}
