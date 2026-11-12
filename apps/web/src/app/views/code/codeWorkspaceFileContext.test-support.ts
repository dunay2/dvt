/** Shared, schema-validated Code file/project evidence for unit and browser consumers. */
import {
  DbtProjectGraphProjectionSchema,
  DbtSelectedModelAnalysisSchema,
  type DbtProjectGraphProjection,
  type DbtSelectedModelAnalysis,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import type { FileContent } from '../../ports/workspace';

/** The same authorized file-model evidence is used by unit and native browser command tests. */
export function executableContextFixture(
  sql = 'select 1 as id'
): ReturnType<typeof contextFixture> {
  const fixture = contextFixture(sql);
  return {
    ...fixture,
    project: DbtProjectGraphProjectionSchema.parse({
      ...fixture.project,
      adapterType: 'postgres',
      projectRevision: { ...fixture.project.projectRevision, dbtVersion: '1.10.0' },
      capabilities: { ...fixture.project.capabilities, canPreview: true, canRun: true },
      executionTarget: {
        provider: 'temporal',
        adapter: 'postgres',
        targetName: 'dev',
        resolutionSource: 'environment-default',
        credentialRef: 'env:DBT_PROFILES_DIR',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse',
          provider: 'postgres',
        },
      },
    }),
  };
}

export function contextFixture(
  sql = "select * from {{ ref('clientes') }} join {{ ref('pedidos') }} on true",
  root = 'inline_code_demo'
): { project: DbtProjectGraphProjection; analysis: DbtSelectedModelAnalysis; file: FileContent } {
  const binding = {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: `canvas-${root}`,
    authority: { kind: 'dbt-project-files', projectRoot: root },
  };
  const nodes = ['ventas', 'clientes', 'pedidos'].map((name) => ({
    uniqueId: `model.demo.${name}`,
    resourceType: 'model',
    name,
    packageName: 'demo',
    originalFilePath: `models/${name}.sql`,
    columns: [],
    tags: [],
    visualEditability: { status: 'code_only', reasons: ['reference-only'] },
  }));
  const project = DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    freshness: 'fresh',
    authorityBinding: binding,
    projectRevision: {
      projectRoot: root,
      projectName: 'demo',
      contentSetSha256: sha256HexUtf8(sql),
      analyzedAt: '2026-10-30T04:00:00.000Z',
      analyzerVersion: 'dbt-cli-v1',
    },
    analysisSha256: sha256HexUtf8(`analysis:${sql}`),
    nodes,
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 3 },
  });
  const analysis = DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'ready',
    authorityBinding: binding,
    projectRevision: project.projectRevision,
    analysisSha256: project.analysisSha256,
    selectedAnalysisSha256: sha256HexUtf8(`selected:${sql}`),
    selectedUniqueId: 'model.demo.ventas',
    capabilitySet: {
      analyzerVersion: 'dbt-cli-v1',
      supportedRegionKinds: ['ref'],
      capabilitySetSha256: sha256HexUtf8('capabilities'),
    },
    files: ['clientes', 'pedidos', 'ventas'].map((name) => ({
      path: `models/${name}.sql`,
      kind: 'model',
      revisionSha256: sha256HexUtf8(name === 'ventas' ? sql : 'select 1'),
      byteLength: new TextEncoder().encode(name === 'ventas' ? sql : 'select 1').length,
    })),
    identities: [...nodes]
      .sort((a, b) => a.uniqueId.localeCompare(b.uniqueId))
      .map(({ uniqueId, resourceType, name, packageName, originalFilePath }) => ({
        uniqueId,
        resourceType,
        name,
        packageName,
        originalFilePath,
        relationToSelection: name === 'ventas' ? 'selected' : 'upstream',
      })),
    dependencies: [],
    diagnostics: [],
    regions: ['clientes', 'pedidos'].flatMap((name, i) => {
      const source = `{{ ref('${name}') }}`;
      const start = sql.indexOf(source);
      if (start < 0) return [];
      return [
        {
          regionId: `region-${i}`,
          path: 'models/ventas.sql',
          kind: 'ref',
          classification: 'supported',
          targetUniqueId: `model.demo.${name}`,
          range: {
            startByte: new TextEncoder().encode(sql.slice(0, start)).length,
            endByte: new TextEncoder().encode(sql.slice(0, start + source.length)).length,
          },
          sourceSha256: sha256HexUtf8(source),
        },
      ];
    }),
  });
  return {
    project,
    analysis,
    file: {
      path: `${root}/models/ventas.sql`,
      name: 'ventas.sql',
      language: 'sql',
      content: sql,
      contentSha256: sha256HexUtf8(sql),
      lastModified: '2026-10-30T04:00:00.000Z',
      authoringAuthority: { kind: 'resolved' as const, binding: project.authorityBinding },
    },
  };
}
