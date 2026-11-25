/** Accepted PostgreSQL file-model publication shared by canonical reference proofs. */
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';

export const dbtModelProjection = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  adapterType: 'postgres',
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: 'file-owner',
    authority: { kind: 'dbt-project-files', projectRoot: '.' },
  },
  freshness: 'fresh',
  analysisSha256: 'a'.repeat(64),
  projectRevision: {
    projectRoot: '.',
    projectName: 'demo',
    dbtVersion: '1.10.0',
    contentSetSha256: 'b'.repeat(64),
    analyzedAt: '2026-11-04T00:00:00.000Z',
    analyzerVersion: 'native-dbt',
  },
  nodes: [
    {
      uniqueId: 'model.demo.clientes',
      name: 'clientes',
      resourceType: 'model',
      packageName: 'demo',
      originalFilePath: 'models/clientes.sql',
      columns: [{ name: 'client_id', dataType: 'text' }],
      tags: [],
      visualEditability: { status: 'code_only', reasons: ['file-authority'] },
    },
  ],
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
  executionTarget: {
    provider: 'temporal',
    adapter: 'postgres',
    targetName: 'default',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    },
    resolutionSource: 'environment-default',
    credentialRef: 'env:DBT_PROFILES_DIR',
  },
});
