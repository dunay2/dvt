/** Owned concern: derive the Lineage route read model from the workspace DBT snapshot. */
import { useMemo, useState } from 'react';

import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import { useWorkspaceGraphForViewQuery } from '../../queries/workspaceQueries';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { assignLevels, bfsReachable, groupNodesByLevel } from './lineageModel';

type LineageGraphProjection = Readonly<{
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  projectionError: Error | null;
}>;

export function projectLineageGraph(
  rawNodes: readonly unknown[],
  rawEdges: readonly unknown[],
  graphStrategy: CanvasGraphStrategy
): LineageGraphProjection {
  try {
    return {
      canonicalNodes: rawNodes
        .map((node) => graphStrategy.mapNodeToCanonical(node))
        .filter((node): node is CanonicalNode => node !== null),
      canonicalEdges: rawEdges
        .map((edge) => graphStrategy.mapEdgeToCanonical(edge))
        .filter((edge): edge is CanonicalEdge => edge !== null),
      projectionError: null,
    };
  } catch (error) {
    return {
      canonicalNodes: [],
      canonicalEdges: [],
      projectionError: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function useLineageViewData() {
  const [searchQuery, setSearchQuery] = useState('');
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy('dbt'), []);
  const snapshotQuery = useWorkspaceGraphForViewQuery('lineage', 60_000);

  const { canonicalNodes, canonicalEdges, projectionError } = useMemo(() => {
    const rawNodes = snapshotQuery.data?.nodes ?? [];
    const rawEdges = snapshotQuery.data?.edges ?? [];
    return projectLineageGraph(rawNodes, rawEdges, graphStrategy);
  }, [graphStrategy, snapshotQuery.data?.edges, snapshotQuery.data?.nodes]);

  const levels = useMemo(
    () => assignLevels(canonicalNodes, canonicalEdges),
    [canonicalNodes, canonicalEdges]
  );

  const focusNode = useMemo(() => {
    if (!searchQuery.trim()) {
      return canonicalNodes[0] ?? null;
    }
    const query = searchQuery.toLowerCase();
    return canonicalNodes.find((node) => node.name.toLowerCase().includes(query)) ?? null;
  }, [canonicalNodes, searchQuery]);

  const upstream = useMemo(
    () => (focusNode ? bfsReachable(focusNode.id, canonicalEdges, 'upstream') : new Set<string>()),
    [canonicalEdges, focusNode]
  );
  const downstream = useMemo(
    () =>
      focusNode ? bfsReachable(focusNode.id, canonicalEdges, 'downstream') : new Set<string>(),
    [canonicalEdges, focusNode]
  );

  const scopeNodes = useMemo(() => {
    if (!focusNode) {
      return canonicalNodes;
    }
    const ids = new Set([...upstream, focusNode.id, ...downstream]);
    return canonicalNodes.filter((node) => ids.has(node.id));
  }, [canonicalNodes, downstream, focusNode, upstream]);

  const nodesByLevel = useMemo(() => groupNodesByLevel(scopeNodes, levels), [scopeNodes, levels]);
  const upstreamCount = upstream.size;
  const downstreamCount = downstream.size;
  const exposureCount = [...downstream]
    .map((id) => canonicalNodes.find((node) => node.id === id))
    .filter((node) => node?.kind === 'dbt:exposure').length;

  const breadcrumbPath = useMemo(() => {
    if (!focusNode) {
      return [];
    }
    const firstUpstream = canonicalNodes.find(
      (node) => upstream.has(node.id) && (levels.get(node.id) ?? 0) === 0
    );
    const firstDownstream = canonicalNodes.find((node) => downstream.has(node.id));
    return [firstUpstream, focusNode, firstDownstream].filter(Boolean) as CanonicalNode[];
  }, [canonicalNodes, downstream, focusNode, levels, upstream]);

  return {
    searchQuery,
    setSearchQuery,
    isLoadingSnapshot: snapshotQuery.isLoading,
    snapshotError:
      projectionError ?? (snapshotQuery.error instanceof Error ? snapshotQuery.error : null),
    canonicalNodes,
    focusNode,
    nodesByLevel,
    breadcrumbPath,
    upstreamCount,
    downstreamCount,
    exposureCount,
  };
}
