/** Schema-valid completed execution facts shared by client and worksheet proofs. */
import {
  DbtSelectedModelAnalysisSchema,
  WorkspaceDbtModelReferenceSchema,
  ExecuteWorkspaceSqlResponseSchema,
  WorkspaceSqlExecutionSchema,
  type ExecuteWorkspaceSqlRequest,
  type ExecuteWorkspaceSqlResponse,
  type WorkspaceSqlExecution,
  type DbtSelectedModelAnalysis,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

export const SQL_TEST_EXECUTION_ID = `1795478400000-${'a'.repeat(32)}-00000000-0000-4000-8000-000000000001`;
export const SQL_TEST_REQUEST: ExecuteWorkspaceSqlRequest = {
  connectionId: 'warehouse',
  sql: 'SELECT 1 AS total',
  limit: 100,
};

export function buildSqlWorksheetTestExecution(
  input: ExecuteWorkspaceSqlRequest = SQL_TEST_REQUEST
): WorkspaceSqlExecution {
  return WorkspaceSqlExecutionSchema.parse({
    schemaVersion: 'workspace-sql-execution.v1',
    executionId: SQL_TEST_EXECUTION_ID,
    status: 'succeeded',
    sql: input.sql,
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: input.connectionId,
      provider: 'postgres',
    },
    connectionName: 'Warehouse',
    principalId: 'principal',
    startedAt: '2026-11-24T12:00:00.000Z',
    finishedAt: '2026-11-24T12:00:00.125Z',
    durationMs: 125,
    limit: input.limit,
    rowCount: 1,
    truncated: false,
    columns: [{ name: 'total', type: 'integer', nullable: false }],
  });
}

export function buildSqlWorksheetTestResponse(
  input: ExecuteWorkspaceSqlRequest = SQL_TEST_REQUEST
): ExecuteWorkspaceSqlResponse {
  const execution = buildSqlWorksheetTestExecution(input);
  return ExecuteWorkspaceSqlResponseSchema.parse({
    schemaVersion: 'workspace-sql-execution-response.v1',
    execution,
    result: { columns: execution.columns, rows: [{ values: ['1'] }] },
  });
}

export const SQL_DBT_REFERENCE = WorkspaceDbtModelReferenceSchema.parse({
  schemaVersion: 'workspace-dbt-model-reference.v1',
  canvasId: 'files',
  uniqueId: 'model.demo.orders',
  relationId: 'relation-1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse',
    provider: 'postgres',
  },
  fields: [{ fieldId: 'field-1', name: 'id', dataType: 'integer', nullable: true }],
});

export function buildSqlWorksheetDbtAnalysis(sql?: string): DbtSelectedModelAnalysis {
  return DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'ready',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: SQL_DBT_REFERENCE.canvasId,
      authority: { kind: 'dbt-project-files', projectRoot: 'models-project' },
    },
    projectRevision: {
      projectRoot: 'models-project',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-11-25T00:00:00.000Z',
      analyzerVersion: 'native',
    },
    analysisSha256: 'b'.repeat(64),
    selectedAnalysisSha256: 'c'.repeat(64),
    capabilitySet: {
      analyzerVersion: 'native',
      supportedRegionKinds: ['ref', 'source'],
      capabilitySetSha256: 'd'.repeat(64),
    },
    selectedUniqueId: SQL_DBT_REFERENCE.uniqueId,
    files: [],
    dependencies: [],
    regions: [],
    diagnostics: [],
    identities: [
      {
        uniqueId: SQL_DBT_REFERENCE.uniqueId,
        resourceType: 'model',
        name: 'orders',
        packageName: 'demo',
        relationToSelection: 'selected',
      },
    ],
    ...(sql == null
      ? {}
      : {
          executionSql: {
            schemaVersion: 'dbt-selected-model-execution-sql.v1',
            reference: SQL_DBT_REFERENCE,
            projectRevisionSha256: 'a'.repeat(64),
            analysisSha256: 'e'.repeat(64),
            sqlSha256: sha256HexUtf8(sql),
            sql,
          },
        }),
  });
}
