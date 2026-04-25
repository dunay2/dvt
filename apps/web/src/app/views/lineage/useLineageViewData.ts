/** Owned concern: derive the Lineage route read model from the workspace DBT snapshot. */
import { useMemo, useState } from 'react';

import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import { useWorkspaceGraphForViewQuery } from '../../queries/workspaceQueries';
import type { CanonicalNode } from '../../types/canonical';
import { assignLevels, bfsReachable, buildColumnLineage, groupNodesByLevel } from './lineageModel';

function getNodeColumns(node: CanonicalNode | null): Array<{ name: string }> {
  return (node?.metadata?.columns as Array<{ name: string }> | undefined) ?? [];
}

export function useLineageViewData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [columnLevel, setColumnLevel] = useState(false);
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy('dbt'), []);
  const snapshotQuery = useWorkspaceGraphForViewQuery('lineage', 60_000);

  const { canonicalNodes, canonicalEdges } = useMemo(() => {
    const rawNodes = snapshotQuery.data?.nodes ?? [];
    const rawEdges = snapshotQuery.data?.edges ?? [];
    return {
      canonicalNodes: rawNodes
        .map((node) => graphStrategy.mapNodeToCanonical(node))
        .filter((node): node is CanonicalNode => node !== null),
      canonicalEdges: rawEdges
        .map((edge) => graphStrategy.mapEdgeToCanonical(edge))
        .filter((edge) => edge !== null),
    };
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

  const columnLineage = useMemo(
    () => (focusNode ? buildColumnLineage(focusNode, canonicalNodes, canonicalEdges) : []),
    [focusNode, canonicalNodes, canonicalEdges]
  );

  const upstreamCount = upstream.size;
  const downstreamCount = downstream.size;
  const upstreamNodes = canonicalNodes.filter((node) => upstream.has(node.id));
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
    columnLevel,
    setSearchQuery,
    setColumnLevel,
    isLoadingSnapshot: snapshotQuery.isLoading,
    snapshotError: snapshotQuery.error instanceof Error ? snapshotQuery.error : null,
    focusNodeHasColumnMetadata: getNodeColumns(focusNode).length > 0,
    hasReachableUpstreamNodes: upstreamNodes.length > 0,
    reachableUpstreamHasColumnMetadata: upstreamNodes.some(
      (node) => getNodeColumns(node).length > 0
    ),
    canonicalNodes,
    focusNode,
    nodesByLevel,
    breadcrumbPath,
    columnLineage,
    upstreamCount,
    downstreamCount,
    exposureCount,
  };
}
