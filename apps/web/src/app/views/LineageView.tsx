import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Columns, GitGraph, Pin, Search, Table } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { resolveCanvasGraphStrategy } from '../plugins/graphStrategyRegistry';
import { resolveDataSource } from '../services/config/dataSource';
import { createWorkspaceService } from '../services/workspace/workspaceService';
import type { CanonicalEdge, CanonicalNode } from '../types/canonical';

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

/** BFS from startId following edges in the given direction. */
function bfsReachable(
  startId: string,
  edges: CanonicalEdge[],
  direction: 'upstream' | 'downstream'
): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const [from, to] =
      direction === 'downstream' ? [e.sourceId, e.targetId] : [e.targetId, e.sourceId];
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push(to);
  }
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adj.get(current) ?? []) queue.push(neighbor);
  }
  visited.delete(startId);
  return visited;
}

/** Assign a topological depth level to each node. Sources = 0. */
function assignLevels(nodes: CanonicalNode[], edges: CanonicalEdge[]): Map<string, number> {
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const children = new Map<string, string[]>();

  for (const e of edges) {
    inDegree.set(e.targetId, (inDegree.get(e.targetId) ?? 0) + 1);
    if (!children.has(e.sourceId)) children.set(e.sourceId, []);
    children.get(e.sourceId)!.push(e.targetId);
  }

  const levels = new Map<string, number>();
  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  for (const id of queue) levels.set(id, 0);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const currentLevel = levels.get(id) ?? 0;
    for (const childId of children.get(id) ?? []) {
      const next = Math.max(levels.get(childId) ?? 0, currentLevel + 1);
      levels.set(childId, next);
      queue.push(childId);
    }
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Kind display helpers (mirrors DBT_NODE_KINDS colors without importing them)
// ---------------------------------------------------------------------------

const KIND_STYLE: Record<string, { bg: string; border: string; badge: string }> = {
  'dbt:source': { bg: 'bg-purple-900/30', border: 'border-purple-500', badge: 'SOURCE' },
  'dbt:seed': { bg: 'bg-green-900/20', border: 'border-green-500', badge: 'SEED' },
  'dbt:model': { bg: 'bg-blue-900/30', border: 'border-blue-500', badge: 'MODEL' },
  'dbt:snapshot': { bg: 'bg-yellow-900/20', border: 'border-yellow-500', badge: 'SNAPSHOT' },
  'dbt:test': { bg: 'bg-red-900/20', border: 'border-red-500', badge: 'TEST' },
  'dbt:exposure': { bg: 'bg-pink-900/30', border: 'border-pink-500', badge: 'EXPOSURE' },
  'dbt:metric': { bg: 'bg-orange-900/20', border: 'border-orange-500', badge: 'METRIC' },
  'dbt:macro': { bg: 'bg-slate-800', border: 'border-slate-500', badge: 'MACRO' },
};

function kindStyle(kind: string) {
  return (
    KIND_STYLE[kind] ?? {
      bg: 'bg-slate-800',
      border: 'border-slate-500',
      badge: kind.split(':')[1]?.toUpperCase() ?? kind,
    }
  );
}

// ---------------------------------------------------------------------------
// Column lineage — derived from metadata.columns + depends_on
// ---------------------------------------------------------------------------

type ColumnLineageEntry = { from: string; to: string };

function buildColumnLineage(
  focusNode: CanonicalNode,
  nodes: CanonicalNode[],
  edges: CanonicalEdge[]
): ColumnLineageEntry[] {
  const focusColumns = (focusNode.metadata?.columns as Array<{ name: string }> | undefined) ?? [];
  if (focusColumns.length === 0) return [];

  const upstreamIds = bfsReachable(focusNode.id, edges, 'upstream');
  const upstreamNodes = nodes.filter((n) => upstreamIds.has(n.id));

  const entries: ColumnLineageEntry[] = [];
  for (const col of focusColumns) {
    for (const upstream of upstreamNodes) {
      const upCols = (upstream.metadata?.columns as Array<{ name: string }> | undefined) ?? [];
      if (upCols.some((c) => c.name === col.name)) {
        entries.push({ from: `${upstream.name}.${col.name}`, to: `${focusNode.name}.${col.name}` });
      }
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function LineageView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [columnLevel, setColumnLevel] = useState(false);

  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy(), []);
  const workspaceService = useMemo(() => createWorkspaceService(resolveDataSource()), []);

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['workspace', 'graph'],
    queryFn: () => workspaceService.getGraphSnapshot(),
    staleTime: 60_000,
  });

  const { canonicalNodes, canonicalEdges } = useMemo(() => {
    const rawNodes = snapshot?.nodes ?? [];
    const rawEdges = snapshot?.edges ?? [];
    return {
      canonicalNodes: rawNodes
        .map((n) => graphStrategy.mapNodeToCanonical(n))
        .filter((n): n is CanonicalNode => n !== null),
      canonicalEdges: rawEdges
        .map((e) => graphStrategy.mapEdgeToCanonical(e))
        .filter((e): e is CanonicalEdge => e !== null),
    };
  }, [snapshot, graphStrategy]);

  const levels = useMemo(
    () => assignLevels(canonicalNodes, canonicalEdges),
    [canonicalNodes, canonicalEdges]
  );

  const focusNode = useMemo(() => {
    if (!searchQuery.trim()) return canonicalNodes[0] ?? null;
    const q = searchQuery.toLowerCase();
    return canonicalNodes.find((n) => n.name.toLowerCase().includes(q)) ?? null;
  }, [canonicalNodes, searchQuery]);

  const { upstream, downstream } = useMemo(() => {
    if (!focusNode) return { upstream: new Set<string>(), downstream: new Set<string>() };
    return {
      upstream: bfsReachable(focusNode.id, canonicalEdges, 'upstream'),
      downstream: bfsReachable(focusNode.id, canonicalEdges, 'downstream'),
    };
  }, [focusNode, canonicalEdges]);

  // All nodes in scope: upstream + focus + downstream
  const scopeNodes = useMemo(() => {
    if (!focusNode) return canonicalNodes;
    const scopeIds = new Set([...upstream, focusNode.id, ...downstream]);
    return canonicalNodes.filter((n) => scopeIds.has(n.id));
  }, [focusNode, upstream, downstream, canonicalNodes]);

  // Group by level
  const byLevel = useMemo(() => {
    const map = new Map<number, CanonicalNode[]>();
    for (const node of scopeNodes) {
      const level = levels.get(node.id) ?? 0;
      if (!map.has(level)) map.set(level, []);
      map.get(level)!.push(node);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [scopeNodes, levels]);

  const columnLineage = useMemo(
    () => (focusNode ? buildColumnLineage(focusNode, canonicalNodes, canonicalEdges) : []),
    [focusNode, canonicalNodes, canonicalEdges]
  );

  const upstreamCount = upstream.size;
  const downstreamCount = downstream.size;
  const exposureCount = [...downstream]
    .map((id) => canonicalNodes.find((n) => n.id === id))
    .filter((n) => n?.kind === 'dbt:exposure').length;

  // Breadcrumb path: one representative upstream → focus → one downstream
  const breadcrumbPath = useMemo(() => {
    if (!focusNode) return [];
    const firstUpstream = canonicalNodes.find(
      (n) => upstream.has(n.id) && (levels.get(n.id) ?? 0) === 0
    );
    const firstDownstream = canonicalNodes.find((n) => downstream.has(n.id));
    return [firstUpstream, focusNode, firstDownstream].filter(Boolean) as CanonicalNode[];
  }, [focusNode, upstream, downstream, canonicalNodes, levels]);

  const LEVEL_LABELS: Record<number, string> = {
    0: 'SOURCES & SEEDS',
    1: 'STAGING & DIMENSIONS',
    2: 'FACTS',
    3: 'EXPOSURES & METRICS',
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="mb-4 flex items-center gap-3">
          <GitGraph className="size-6 text-purple-400" />
          <h1 className="text-xl font-semibold">Lineage Analysis</h1>
          {isLoading && <span className="text-xs text-slate-400">Loading…</span>}
          {!isLoading && (
            <span className="text-xs text-slate-500">{canonicalNodes.length} nodes</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by model name…"
              className="border-slate-600 bg-slate-950 pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="column-level" checked={columnLevel} onCheckedChange={setColumnLevel} />
            <Label htmlFor="column-level" className="cursor-pointer text-sm">
              Column-level lineage
            </Label>
          </div>

          <Button variant="outline" size="sm" disabled>
            <Pin className="mr-2 size-4" />
            Pin to Canvas
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumbPath.length > 0 && (
        <div className="border-b border-slate-700 bg-slate-900 px-6 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-300">Path:</span>
            {breadcrumbPath.map((node, i) => (
              <span key={node.id} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="size-3 text-slate-400" />}
                <code
                  className={
                    node.id === focusNode?.id
                      ? 'font-semibold text-green-400'
                      : node.kind === 'dbt:exposure' || node.kind === 'dbt:metric'
                        ? 'text-pink-400'
                        : 'text-blue-400'
                  }
                >
                  {node.name}
                </code>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-6 pb-10">
          <div className="mx-auto max-w-4xl space-y-4">
            {!focusNode && !isLoading && (
              <p className="text-sm text-slate-400">No nodes loaded. Check workspace connection.</p>
            )}

            {!columnLevel ? (
              <>
                <Card className="border-slate-700 bg-slate-900 p-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Table className="size-5" />
                    {focusNode ? `Model lineage: ${focusNode.name}` : 'Full graph'}
                  </h2>

                  <div className="space-y-8">
                    {byLevel.map(([level, nodes], idx) => (
                      <div key={level}>
                        {idx > 0 && (
                          <div className="mb-6 flex justify-center">
                            <ArrowRight className="size-6 rotate-90 text-slate-400" />
                          </div>
                        )}
                        <div className="mb-3 text-xs text-slate-400">
                          LEVEL {level} — {LEVEL_LABELS[level] ?? `LAYER ${level}`}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {nodes.map((node) => {
                            const ks = kindStyle(node.kind);
                            const isFocus = node.id === focusNode?.id;
                            return (
                              <Card
                                key={node.id}
                                className={`${ks.bg} ${ks.border} p-3 flex-1 min-w-[140px] ${isFocus ? 'border-2' : ''}`}
                              >
                                {isFocus && (
                                  <Badge className="mb-2 bg-green-600 text-xs">FOCUS</Badge>
                                )}
                                {!isFocus && (
                                  <Badge variant="secondary" className="mb-2 text-xs">
                                    {ks.badge}
                                  </Badge>
                                )}
                                <div className="truncate font-mono text-sm">{node.name}</div>
                                {node.description && (
                                  <div className="mt-1 truncate text-xs text-slate-300">
                                    {node.description}
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Impact Summary */}
                <Card className="border-slate-700 bg-slate-900 p-4">
                  <h3 className="mb-3 font-semibold">Impact Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-300">Upstream Dependencies</div>
                      <div className="mt-1 text-xl font-semibold">{upstreamCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-300">Downstream Consumers</div>
                      <div className="mt-1 text-xl font-semibold">{downstreamCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-300">Exposures Affected</div>
                      <div className="mt-1 text-xl font-semibold">{exposureCount}</div>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Columns className="size-5" />
                  {focusNode ? `Column lineage: ${focusNode.name}` : 'Column-level lineage'}
                </h2>

                {columnLineage.length > 0 ? (
                  <div className="space-y-3">
                    {columnLineage.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded border border-slate-700 bg-slate-950 p-3"
                      >
                        <code className="text-sm text-blue-400">{entry.from}</code>
                        <ArrowRight className="size-4 shrink-0 text-slate-400" />
                        <code className="text-sm text-green-400">{entry.to}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    {focusNode
                      ? 'No column metadata available for this node. Add columns to the manifest to enable column-level lineage.'
                      : 'Select a node to see column-level lineage.'}
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
