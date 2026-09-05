/** Owned concern: project authored dbt canvas state into deterministic workspace files. */
import { OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata, isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import {
  normalizeDbtArtifactIdentifier,
  projectDbtModelArtifact,
  type DbtModelArtifactProjection,
  type DbtModelArtifactSource,
} from './canvasDbtModelArtifactProjection';
import { createGraphDraftMarkedDbtModelSql } from './dbtGraphModelSqlPublicationPolicy';
import {
  projectDbtTestArtifact,
  type DbtTestArtifactProjection,
} from './canvasDbtTestArtifactProjection';

export type DbtWorkspaceArtifact = Readonly<{
  path: string;
  content: string;
  language: 'sql' | 'yaml';
}>;

export type DbtWorkspaceArtifactsResult =
  | Readonly<{
      ok: true;
      artifacts: readonly DbtWorkspaceArtifact[];
      modelSelectors: readonly string[];
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

type DbtModelProjection = Readonly<{
  node: CanonicalNode;
  artifact: DbtModelArtifactProjection;
}>;

function resolveScopedModelNodes(args: {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const scopedNodeIdSet =
    args.scopedNodeIds.length > 0
      ? new Set(args.scopedNodeIds)
      : new Set(args.nodes.map((node) => node.id));

  return args.nodes.filter((node) => scopedNodeIdSet.has(node.id) && isDbtCompatibleModel(node));
}

function resolveScopedTestNodes(args: {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const scopedNodeIdSet =
    args.scopedNodeIds.length > 0
      ? new Set(args.scopedNodeIds)
      : new Set(args.nodes.map((node) => node.id));

  return args.nodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && node.pluginId === 'dbt' && node.kind === 'dbt:test'
  );
}

function appendSourceYaml(lines: string[], sources: readonly DbtModelArtifactSource[]): void {
  const uniqueSources = new Map<string, DbtModelArtifactSource>();
  for (const source of sources) {
    uniqueSources.set(`${source.sourceName}.${source.tableName}`, source);
  }

  lines.push('sources:');
  for (const source of [...uniqueSources.values()].sort((a, b) =>
    `${a.sourceName}.${a.tableName}`.localeCompare(`${b.sourceName}.${b.tableName}`)
  )) {
    lines.push(`  - name: ${source.sourceName}`);
    lines.push(
      source.schemaBinding === 'object-file-postgres-scope'
        ? `    schema: "{{ env_var('${OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV}', '${source.schemaName}') }}"`
        : `    schema: ${source.schemaName}`
    );
    lines.push('    tables:');
    lines.push(`      - name: ${source.tableName}`);
  }
}

function serializeYamlString(value: string): string {
  return JSON.stringify(value);
}

function appendModelTests(
  lines: string[],
  modelId: string,
  tests: readonly DbtTestArtifactProjection[]
): void {
  const modelTests = tests
    .filter((test) => test.targetModelId === modelId)
    .slice()
    .sort((a, b) => `${a.columnName}.${a.selector}`.localeCompare(`${b.columnName}.${b.selector}`));
  if (modelTests.length === 0) return;

  const testsByColumn = new Map<string, DbtTestArtifactProjection[]>();
  for (const test of modelTests) {
    const columnTests = testsByColumn.get(test.columnName) ?? [];
    columnTests.push(test);
    testsByColumn.set(test.columnName, columnTests);
  }

  lines.push('    columns:');
  for (const [columnName, columnTests] of testsByColumn) {
    lines.push(`      - name: ${columnName}`);
    lines.push('        data_tests:');
    for (const test of columnTests) {
      lines.push(`          - ${test.testType}:`);
      lines.push(`              name: ${test.selector}`);
      lines.push('              config:');
      lines.push(`                severity: ${test.severity}`);
    }
  }
}

function buildSchemaYaml(
  models: readonly DbtModelProjection[],
  tests: readonly DbtTestArtifactProjection[]
): string {
  const lines = ['version: 2', ''];
  const sources = models
    .map((model) => model.artifact.source)
    .filter((source): source is DbtModelArtifactSource => source !== undefined);

  if (sources.length > 0) {
    appendSourceYaml(lines, sources);
    lines.push('');
  }

  lines.push('models:');
  for (const model of models) {
    lines.push(`  - name: ${model.artifact.name}`);
    const description = model.node.description ?? `Generated from canvas node ${model.node.id}`;
    lines.push(`    description: ${serializeYamlString(description)}`);
    appendModelTests(lines, model.node.id, tests);
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
  const testNodes = resolveScopedTestNodes({
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
    const projection = projectDbtModelArtifact({
      modelNode,
      nodes: args.nodes,
      edges: args.edges,
    });
    if (!projection.ok) {
      return {
        ok: false,
        message: projection.message,
      };
    }
    models.push({
      node: modelNode,
      artifact: projection.artifact,
    });
  }

  const tests: DbtTestArtifactProjection[] = [];
  const scopedModelIds = new Set(modelNodes.map((node) => node.id));
  for (const testNode of testNodes) {
    const projection = projectDbtTestArtifact({
      testNode,
      nodes: args.nodes,
      edges: args.edges,
    });
    if (!projection.ok) {
      return projection;
    }
    if (!scopedModelIds.has(projection.artifact.targetModelId)) {
      return {
        ok: false,
        message: `DBT test "${testNode.name}" requires its target model in execution scope.`,
      };
    }
    tests.push(projection.artifact);
  }

  const firstPackageName = createDbtNodeAuthoringMetadata(modelNodes[0]!).packageName;
  const artifacts: DbtWorkspaceArtifact[] = [
    {
      path: 'dbt_project.yml',
      content: buildDbtProjectYaml(normalizeDbtArtifactIdentifier(firstPackageName, 'analytics')),
      language: 'yaml',
    },
    ...models
      .slice()
      .sort((a, b) => a.artifact.name.localeCompare(b.artifact.name))
      .map((model) => ({
        path: model.artifact.path,
        content: createGraphDraftMarkedDbtModelSql(model.artifact.content),
        language: 'sql' as const,
      })),
    {
      path: 'models/schema.yml',
      content: buildSchemaYaml(models, tests),
      language: 'yaml',
    },
  ];

  return {
    ok: true,
    artifacts,
    modelSelectors: models
      .map((model) => model.artifact.name)
      .sort((left, right) => left.localeCompare(right)),
  };
}
