/** Owned concern: project authored dbt canvas state into deterministic workspace files. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';

export type DbtWorkspaceArtifact = Readonly<{
  path: string;
  content: string;
  language: 'sql' | 'yaml';
}>;

export type DbtWorkspaceArtifactsResult =
  | Readonly<{
      ok: true;
      artifacts: readonly DbtWorkspaceArtifact[];
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

type DbtModelProjection = Readonly<{
  node: CanonicalNode;
  name: string;
  materialized: string;
  originSql: string;
  source?: DbtSourceProjection;
}>;

type DbtSourceProjection = Readonly<{
  sourceName: string;
  schemaName: string;
  tableName: string;
}>;

function normalizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

function resolveScopedModelNodes(args: {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const scopedNodeIdSet =
    args.scopedNodeIds.length > 0
      ? new Set(args.scopedNodeIds)
      : new Set(args.nodes.map((node) => node.id));

  return args.nodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && node.pluginId === 'dbt' && node.kind === 'dbt:model'
  );
}

function resolveIncomingNodes(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): CanonicalNode[] {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  return args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter((node): node is CanonicalNode => node !== undefined);
}

function isDbtSourceOrigin(node: CanonicalNode): boolean {
  return node.pluginId === 'dbt' && node.kind === 'dbt:source';
}

function isDvtWarehouseSourceOrigin(node: CanonicalNode): boolean {
  return node.pluginId === 'dvt.warehouse-source' && node.kind === 'dvt:source';
}

function isDbtModelOrigin(node: CanonicalNode): boolean {
  return node.pluginId === 'dbt' && node.kind === 'dbt:model';
}

function buildDbtSourceOriginProjection(
  origin: CanonicalNode
):
  | Readonly<{ ok: true; originSql: string; source: DbtSourceProjection }>
  | Readonly<{ ok: false; message: string }> {
  if (isDbtSourceOrigin(origin)) {
    const sourceMetadata = createDbtNodeAuthoringMetadata(origin);
    return {
      ok: true,
      originSql: `{{ source('${sourceMetadata.sourceName}', '${sourceMetadata.tableName}') }}`,
      source: {
        sourceName: sourceMetadata.sourceName,
        schemaName: sourceMetadata.schemaName,
        tableName: sourceMetadata.tableName,
      },
    };
  }

  const sourceMetadata = createDvtNodeAuthoringMetadata(origin);
  if (sourceMetadata?.kind !== 'source') {
    return {
      ok: false,
      message: `DBT source origin "${origin.name}" does not expose warehouse source metadata.`,
    };
  }

  return {
    ok: true,
    originSql: `{{ source('${sourceMetadata.alias}', '${sourceMetadata.table}') }}`,
    source: {
      sourceName: sourceMetadata.alias,
      schemaName: sourceMetadata.schema,
      tableName: sourceMetadata.table,
    },
  };
}

function resolveModelOrigin(args: {
  modelNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}):
  | Readonly<{ ok: true; originSql: string; source?: DbtSourceProjection }>
  | Readonly<{ ok: false; message: string }> {
  const modelMetadata = createDbtNodeAuthoringMetadata(args.modelNode);
  const incomingNodes = resolveIncomingNodes({
    node: args.modelNode,
    nodes: args.nodes,
    edges: args.edges,
  });
  const selectedOrigin =
    modelMetadata.selectedSourceId.length > 0
      ? incomingNodes.find((node) => node.id === modelMetadata.selectedSourceId)
      : undefined;
  const origin =
    selectedOrigin ??
    incomingNodes.find(isDbtSourceOrigin) ??
    incomingNodes.find(isDvtWarehouseSourceOrigin) ??
    incomingNodes.find(isDbtModelOrigin);

  if (origin == null) {
    return {
      ok: false,
      message: `DBT model "${args.modelNode.name}" must be connected to a source or model origin.`,
    };
  }

  if (isDbtSourceOrigin(origin) || isDvtWarehouseSourceOrigin(origin)) {
    return buildDbtSourceOriginProjection(origin);
  }

  if (isDbtModelOrigin(origin)) {
    return {
      ok: true,
      originSql: `{{ ref('${normalizeIdentifier(origin.name, origin.id)}') }}`,
    };
  }

  return {
    ok: false,
    message: `DBT model "${args.modelNode.name}" must be connected to a source or model origin.`,
  };
}

function buildModelSql(model: DbtModelProjection): string {
  return [
    `{{ config(materialized='${model.materialized}') }}`,
    '',
    'select *',
    `from ${model.originSql}`,
    '',
  ].join('\n');
}

function appendSourceYaml(lines: string[], sources: readonly DbtSourceProjection[]): void {
  const uniqueSources = new Map<string, DbtSourceProjection>();
  for (const source of sources) {
    uniqueSources.set(`${source.sourceName}.${source.tableName}`, source);
  }

  lines.push('sources:');
  for (const source of [...uniqueSources.values()].sort((a, b) =>
    `${a.sourceName}.${a.tableName}`.localeCompare(`${b.sourceName}.${b.tableName}`)
  )) {
    lines.push(`  - name: ${source.sourceName}`);
    lines.push(`    schema: ${source.schemaName}`);
    lines.push('    tables:');
    lines.push(`      - name: ${source.tableName}`);
  }
}

function serializeYamlString(value: string): string {
  return JSON.stringify(value);
}

function buildSchemaYaml(models: readonly DbtModelProjection[]): string {
  const lines = ['version: 2', ''];
  const sources = models
    .map((model) => model.source)
    .filter((source): source is DbtSourceProjection => source !== undefined);

  if (sources.length > 0) {
    appendSourceYaml(lines, sources);
    lines.push('');
  }

  lines.push('models:');
  for (const model of models) {
    lines.push(`  - name: ${model.name}`);
    const description = model.node.description ?? `Generated from canvas node ${model.node.id}`;
    lines.push(`    description: ${serializeYamlString(description)}`);
  }
  lines.push('');

  return lines.join('\n');
}

function buildDbtProjectYaml(projectName: string): string {
  return [
    `name: ${projectName}`,
    "version: '1.0.0'",
    'config-version: 2',
    '',
    'profile: default',
    '',
    'model-paths:',
    '  - models',
    '',
  ].join('\n');
}

export function buildDbtWorkspaceArtifacts(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
}): DbtWorkspaceArtifactsResult {
  const modelNodes = resolveScopedModelNodes({
    nodes: args.nodes,
    scopedNodeIds: args.scopedNodeIds,
  });

  if (modelNodes.length === 0) {
    return {
      ok: false,
      message: 'DBT artifact generation requires at least one model node.',
    };
  }

  const models: DbtModelProjection[] = [];
  for (const modelNode of modelNodes) {
    const modelMetadata = createDbtNodeAuthoringMetadata(modelNode);
    const origin = resolveModelOrigin({
      modelNode,
      nodes: args.nodes,
      edges: args.edges,
    });
    if (!origin.ok) {
      return origin;
    }
    models.push({
      node: modelNode,
      name: normalizeIdentifier(modelNode.name, modelNode.id),
      materialized: modelMetadata.materialized,
      originSql: origin.originSql,
      ...(origin.source ? { source: origin.source } : {}),
    });
  }

  const firstPackageName = createDbtNodeAuthoringMetadata(modelNodes[0]!).packageName;
  const artifacts: DbtWorkspaceArtifact[] = [
    {
      path: 'dbt_project.yml',
      content: buildDbtProjectYaml(normalizeIdentifier(firstPackageName, 'analytics')),
      language: 'yaml',
    },
    ...models
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((model) => ({
        path: `models/${model.name}.sql`,
        content: buildModelSql(model),
        language: 'sql' as const,
      })),
    {
      path: 'models/schema.yml',
      content: buildSchemaYaml(models),
      language: 'yaml',
    },
  ];

  return {
    ok: true,
    artifacts,
  };
}
