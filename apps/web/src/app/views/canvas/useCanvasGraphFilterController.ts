/** Owned concern: own ephemeral Canvas graph filter state and query execution. */
import type { Node } from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';

import {
  CANONICAL_NODE_STATUSES,
  CORE_NODE_ROLES,
  type CanonicalNodeStatus,
  type CoreNodeRole,
  type PluginNodeKind,
} from '../../types/canonical';
import {
  CANVAS_GRAPH_FILTER_DIMENSIONS,
  createCanvasGraphFilterQuery,
  type CanvasGraphFilterComposition,
  type CanvasGraphFilterDimension,
  type CanvasGraphFilterNode,
  type CanvasGraphFilterPredicate,
  type CanvasGraphFilterPresentationMode,
} from './canvasGraphFilter.contract';
import { filterCanvasGraph } from './canvasGraphFilter';

export type CanvasGraphFilterOptionGroup = Readonly<{
  dimension: CanvasGraphFilterDimension;
  values: readonly string[];
}>;

export type CanvasGraphFilterControlModel = Readonly<{
  open: boolean;
  predicates: readonly CanvasGraphFilterPredicate[];
  composition: CanvasGraphFilterComposition;
  presentation: CanvasGraphFilterPresentationMode;
  status: 'idle' | 'matched' | 'no-match';
  matchCount: number;
  totalCount: number;
  draftDimension: CanvasGraphFilterDimension;
  draftValue: string;
  optionGroups: readonly CanvasGraphFilterOptionGroup[];
}>;

export type CanvasGraphFilterController = Readonly<{
  model: CanvasGraphFilterControlModel;
  result: ReturnType<typeof filterCanvasGraph>;
  setOpen: (open: boolean) => void;
  selectDimension: (dimension: CanvasGraphFilterDimension) => void;
  selectValue: (value: string) => void;
  addDraftPredicate: () => void;
  removePredicate: (predicate: CanvasGraphFilterPredicate) => void;
  setComposition: (composition: CanvasGraphFilterComposition) => void;
  setPresentation: (presentation: CanvasGraphFilterPresentationMode) => void;
  clear: () => void;
}>;

export function useCanvasGraphFilterController({
  nodes,
}: Readonly<{ nodes: readonly Node[] }>): CanvasGraphFilterController {
  const [open, setOpen] = useState(false);
  const [predicates, setPredicates] = useState<readonly CanvasGraphFilterPredicate[]>([]);
  const [composition, setComposition] = useState<CanvasGraphFilterComposition>('and');
  const [presentation, setPresentation] = useState<CanvasGraphFilterPresentationMode>('dim');
  const [draftDimension, setDraftDimension] = useState<CanvasGraphFilterDimension>('role');
  const filterNodes = useMemo(() => nodes.map(toFilterNode), [nodes]);
  const optionGroups = useMemo(() => buildOptionGroups(filterNodes), [filterNodes]);
  const initialDraftValue = resolveFirstOption(optionGroups, draftDimension);
  const [draftValue, setDraftValue] = useState(initialDraftValue);
  const resolvedDraftValue = optionGroups
    .find((group) => group.dimension === draftDimension)
    ?.values.includes(draftValue)
    ? draftValue
    : initialDraftValue;
  const query = useMemo(
    () => createCanvasGraphFilterQuery({ predicates, composition, presentation }),
    [composition, predicates, presentation]
  );
  const result = useMemo(() => filterCanvasGraph(filterNodes, query), [filterNodes, query]);

  const selectDimension = useCallback(
    (dimension: CanvasGraphFilterDimension) => {
      setDraftDimension(dimension);
      setDraftValue(resolveFirstOption(optionGroups, dimension));
    },
    [optionGroups]
  );
  const addDraftPredicate = useCallback(() => {
    if (resolvedDraftValue.length === 0) {
      return;
    }
    setPredicates(
      (current) =>
        createCanvasGraphFilterQuery({
          predicates: [...current, { dimension: draftDimension, value: resolvedDraftValue }],
        }).predicates
    );
  }, [draftDimension, resolvedDraftValue]);
  const removePredicate = useCallback((predicate: CanvasGraphFilterPredicate) => {
    setPredicates((current) =>
      current.filter(
        (candidate) =>
          candidate.dimension !== predicate.dimension || candidate.value !== predicate.value
      )
    );
  }, []);
  const clear = useCallback(() => {
    setPredicates([]);
    setComposition('and');
    setPresentation('dim');
  }, []);

  return {
    model: {
      open,
      predicates,
      composition,
      presentation,
      status: result.status,
      matchCount: result.matchingNodeIds.length,
      totalCount: filterNodes.length,
      draftDimension,
      draftValue: resolvedDraftValue,
      optionGroups,
    },
    result,
    setOpen,
    selectDimension,
    selectValue: setDraftValue,
    addDraftPredicate,
    removePredicate,
    setComposition,
    setPresentation,
    clear,
  };
}

function toFilterNode(node: Node): CanvasGraphFilterNode {
  const data = node.data as Record<string, unknown>;
  return {
    id: node.id,
    pluginId: asNonEmptyString(data.pluginId) ?? 'unknown',
    kind: asPluginNodeKind(data.pluginKind),
    role: asNodeRole(data.role),
    status: asNodeStatus(data.status),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  };
}

function buildOptionGroups(
  nodes: readonly CanvasGraphFilterNode[]
): CanvasGraphFilterOptionGroup[] {
  const valuesByDimension: Record<CanvasGraphFilterDimension, Set<string>> = {
    pluginId: new Set(),
    kind: new Set(),
    role: new Set(),
    status: new Set(),
    tag: new Set(),
  };
  for (const node of nodes) {
    valuesByDimension.pluginId.add(node.pluginId);
    valuesByDimension.kind.add(node.kind);
    valuesByDimension.role.add(node.role);
    valuesByDimension.status.add(node.status);
    node.tags.forEach((tag) => valuesByDimension.tag.add(tag));
  }

  return CANVAS_GRAPH_FILTER_DIMENSIONS.flatMap((dimension) => {
    const values = [...valuesByDimension[dimension]].sort((left, right) =>
      left.localeCompare(right)
    );
    return values.length === 0 ? [] : [{ dimension, values }];
  });
}

function resolveFirstOption(
  optionGroups: readonly CanvasGraphFilterOptionGroup[],
  dimension: CanvasGraphFilterDimension
): string {
  return optionGroups.find((group) => group.dimension === dimension)?.values[0] ?? '';
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asPluginNodeKind(value: unknown): PluginNodeKind {
  return typeof value === 'string' && value.includes(':')
    ? (value as PluginNodeKind)
    : 'dvt:unknown';
}

function asNodeRole(value: unknown): CoreNodeRole {
  return typeof value === 'string' && CORE_NODE_ROLES.includes(value as CoreNodeRole)
    ? (value as CoreNodeRole)
    : 'control';
}

function asNodeStatus(value: unknown): CanonicalNodeStatus {
  return typeof value === 'string' && CANONICAL_NODE_STATUSES.includes(value as CanonicalNodeStatus)
    ? (value as CanonicalNodeStatus)
    : 'idle';
}
