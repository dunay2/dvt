/** Owned concern: derive the Lineage route read model from the workspace DBT snapshot. */
import { useMemo, useState } from 'react';

import { mapDbtTypeToKind } from '../../plugins/nodeTypeCatalog.dbt';
import { useWorkspaceGraphForViewQuery } from '../../queries/workspaceQueries';
import type { CanonicalEdge, CanonicalNode, CoreNodeRole } from '../../types/canonical';
import type { DbtEdge, DbtNode, DbtNodeType } from '../../types/dbt';
import { assignLevels, bfsReachable, groupNodesByLevel } from './lineageModel';

type LineageGraphProjection = Readonly<{
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  projectionError: Error | null;
}>;

export function projectLineageGraph(
  rawNodes: readonly DbtNode[],
  rawEdges: readonly DbtEdge[]
): LineageGraphProjection {
  const roleByDbtType: Record<DbtNodeType, CoreNodeRole> = {
    SOURCE: 'input',
    MODEL: 'transform',
    SEED: 'input',
    SNAPSHOT: 'transform',
    TEST: 'check',
    EXPOSURE: 'output',
    METRIC: 'output',
    MACRO: 'control',
  };
  const relationByDbtEdgeType: Record<DbtEdge['type'], CanonicalEdge['relation']> = {
    source: 'lineage',
    ref: 'lineage',
    test: 'validation',
    exposure: 'consumption',
    metric: 'metric',
  };

  try {
    return {
      canonicalNodes: rawNodes.map((node) => ({
        id: node.id,
        name: node.name,
        pluginId: node.type === 'SOURCE' || node.type === 'MODEL' ? 'dvt' : 'dbt',
        kind: mapDbtTypeToKind(node.type),
        role: roleByDbtType[node.type],
        status: node.status,
        tags: node.tags,
        path: node.path,
        description: node.description,
        lastDuration: node.lastDuration,
        lastCost: node.lastCost,
        metadata: {
          ...node.metadata,
          package: node.package,
          dependencies: node.dependencies,
          compiledSql: node.compiledSql,
          config: node.config,
          columns: node.columns,
        },
      })),
      canonicalEdges: rawEdges.map((edge) => ({
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        relation: relationByDbtEdgeType[edge.type],
      })),
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
  const snapshotQuery = useWorkspaceGraphForViewQuery('lineage', 60_000);

  const { canonicalNodes, canonicalEdges, projectionError } = useMemo(() => {
    const rawNodes = snapshotQuery.data?.nodes ?? [];
    const rawEdges = snapshotQuery.data?.edges ?? [];
    return projectLineageGraph(rawNodes, rawEdges);
  }, [snapshotQuery.data?.edges, snapshotQuery.data?.nodes]);

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
