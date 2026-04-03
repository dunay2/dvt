import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';

export interface ArtifactTabDescriptor {
  title: string;
  path: string;
  kind: 'json' | 'log' | 'diff';
  language: string;
  value?: string;
  originalValue?: string;
  description?: string;
  badge?: string;
}

function tryString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildNodeEditorTab(node: CanonicalNode) {
  const sql =
    tryString(node.metadata?.compiledSql) ??
    tryString(node.metadata?.sql) ??
    `-- No compiled SQL is available yet for ${node.name}
-- This placeholder keeps the Monaco editor useful during mock/API transitions.
select *
from {{ ref('${node.name}') }}
;`;

  const yaml = `version: 2
models:
  - name: ${node.name}
    description: ${JSON.stringify(node.description ?? 'No description')}
    config:
      owner: ${JSON.stringify(node.metadata?.owner ?? 'analytics')}
      pluginId: ${JSON.stringify(node.pluginId)}
    meta:
      role: ${JSON.stringify(node.role)}
      kind: ${JSON.stringify(node.kind)}
`;

  const usesYaml =
    node.path?.endsWith('.yml') || node.path?.endsWith('.yaml') || node.kind.includes(':source');

  return {
    id: `node:${node.id}:${usesYaml ? 'yaml' : 'sql'}`,
    kind: usesYaml ? ('yaml' as const) : ('sql' as const),
    title: node.name,
    path: node.path ?? `${node.kind}/${node.name}`,
    language: usesYaml ? 'yaml' : 'sql',
    value: usesYaml ? yaml : sql,
    description: usesYaml ? 'Schema/config surface' : 'Compiled SQL',
    readOnly: true,
    closable: true,
    nodeId: node.id,
    badge: node.pluginId,
  };
}

export function buildNodeDiffTab(node: CanonicalNode) {
  const compiled =
    tryString(node.metadata?.compiledSql) ??
    tryString(node.metadata?.sql) ??
    `select *
from {{ ref('${node.name}') }}
;`;

  const original = compiled
    .split('\n')
    .filter((line, index) => !(index === 0 && line.toLowerCase().includes('select')))
    .join('\n')
    .replace(/\s+;/, '\n')
    .trim();

  return {
    id: `node:${node.id}:diff`,
    kind: 'diff' as const,
    title: `${node.name} · Diff`,
    path: `${node.path ?? node.name}.diff`,
    language: 'sql',
    value: compiled,
    originalValue:
      original.length > 0
        ? `select
  -- previous revision
${original}`
        : `select
  -- previous revision
  *
from ${node.name};`,
    description: 'Current vs baseline compiled SQL',
    readOnly: true,
    closable: true,
    nodeId: node.id,
    badge: 'diff',
  };
}

export function buildManifestArtifact(
  nodes: CanonicalNode[],
  edges: CanonicalEdge[]
): ArtifactTabDescriptor {
  return {
    title: 'manifest.json',
    path: 'target/manifest.json',
    kind: 'json',
    language: 'json',
    value: prettyJson({
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'dvt-web-workbench',
      },
      nodes: Object.fromEntries(
        nodes.map((node) => [
          node.id,
          {
            name: node.name,
            pluginId: node.pluginId,
            kind: node.kind,
            role: node.role,
            path: node.path,
            tags: node.tags,
          },
        ])
      ),
      childMap: edges.reduce<Record<string, string[]>>((acc, edge) => {
        acc[edge.sourceId] ??= [];
        acc[edge.sourceId]?.push(edge.targetId);
        return acc;
      }, {}),
    }),
    description: 'Generated from current graph snapshot',
    badge: 'generated',
  };
}

export function buildCatalogArtifact(nodes: CanonicalNode[]): ArtifactTabDescriptor {
  return {
    title: 'catalog.json',
    path: 'target/catalog.json',
    kind: 'json',
    language: 'json',
    value: prettyJson({
      generatedAt: new Date().toISOString(),
      stats: {
        nodeCount: nodes.length,
        plugins: Array.from(new Set(nodes.map((node) => node.pluginId))).sort(),
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        name: node.name,
        kind: node.kind,
        status: node.status,
        path: node.path,
        lastDuration: node.lastDuration,
        lastCost: node.lastCost,
        columns: node.metadata?.columns ?? [],
      })),
    }),
    description: 'Generated catalog preview',
    badge: 'generated',
  };
}

export function buildRunResultsArtifact(
  nodes: CanonicalNode[],
  activeRunId: string | null
): ArtifactTabDescriptor {
  return {
    title: 'run_results.json',
    path: 'target/run_results.json',
    kind: 'json',
    language: 'json',
    value: prettyJson({
      runId: activeRunId,
      generatedAt: new Date().toISOString(),
      results: nodes.map((node) => ({
        unique_id: node.id,
        name: node.name,
        status: node.status,
        execution_time: node.lastDuration ?? null,
        adapter_response: node.lastCost != null ? { costUsd: node.lastCost } : {},
      })),
    }),
    description: 'Result snapshot for the active or latest run',
    badge: activeRunId ? 'active' : 'idle',
  };
}

export function buildPlanArtifact(plan: ExecutionPlan | null): ArtifactTabDescriptor {
  return {
    title: 'plan.json',
    path: 'plans/current-plan.json',
    kind: 'json',
    language: 'json',
    value: prettyJson(
      plan ?? {
        note: 'No execution plan is available yet.',
        hint: 'Use the Plan action in the graph toolbar to populate this tab.',
      }
    ),
    description: plan ? 'Current immutable execution plan' : 'No plan available',
    badge: plan ? 'plan' : 'empty',
  };
}

export function buildRunLog(
  activeRunId: string | null,
  nodes: CanonicalNode[]
): ArtifactTabDescriptor {
  const lines = [
    `[${new Date().toISOString()}] boot workbench`,
    activeRunId
      ? `[${new Date().toISOString()}] active run: ${activeRunId}`
      : '[idle] no active run',
    ...nodes
      .slice(0, 12)
      .map(
        (node, index) =>
          `[step ${index + 1}] ${node.name} status=${node.status} duration=${node.lastDuration ?? 'n/a'}`
      ),
  ];

  return {
    title: 'Run Log',
    path: 'logs/current-run.log',
    kind: 'log',
    language: 'plaintext',
    value: lines.join('\n'),
    description: 'Workbench log preview',
    badge: activeRunId ? 'run' : 'idle',
  };
}
