import { expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import type { IDbtSelectedModelAnalysisQueryPort } from '../../ports/dbtSelectedModelAnalysis';
import { buildSqlWorksheetDbtAnalysis, SQL_DBT_REFERENCE } from './sqlWorksheet.test-fixtures';
import { materializeSqlWorksheetDbtModel } from './sqlWorksheetDbtModels';

const model: CanonicalNode = {
  id: 'file-definition',
  name: 'Orders label is not a table',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { dbtModelReference: SQL_DBT_REFERENCE },
};
const connection = {
  id: 'warehouse',
  name: 'Warehouse',
  type: 'postgres' as const,
  database: 'analytics',
};

function query(): {
  analyzeSelectedModel: ReturnType<
    typeof vi.fn<IDbtSelectedModelAnalysisQueryPort['analyzeSelectedModel']>
  >;
} {
  return {
    analyzeSelectedModel: vi
      .fn<IDbtSelectedModelAnalysisQueryPort['analyzeSelectedModel']>()
      .mockResolvedValue(buildSqlWorksheetDbtAnalysis('SELECT 1 AS id')),
  };
}

it('inserts canonical compiled file Model SQL with real reference and independent provenance digests', async () => {
  const port = query();
  const insertion = await materializeSqlWorksheetDbtModel(model, connection, port);
  expect(insertion.kind).toBe('dbt-model');
  expect(insertion.reference).toEqual(SQL_DBT_REFERENCE);
  expect(insertion.fragment).toBe(`(\nSELECT 1 AS id\n) AS "${insertion.alias}"`);
  expect(insertion.binding).toMatchObject({ kind: 'compiled' });
  expect(insertion).not.toHaveProperty('semanticPlanSha256');
  expect(port.analyzeSelectedModel).toHaveBeenCalledExactlyOnceWith(
    { canvasId: 'files' },
    SQL_DBT_REFERENCE.uniqueId,
    {}
  );
});

it('uses a known catalogue revision in the same single GET without a preliminary analysis', async () => {
  const port = query();
  await materializeSqlWorksheetDbtModel(model, connection, port, 'a'.repeat(64));
  expect(port.analyzeSelectedModel).toHaveBeenCalledExactlyOnceWith(
    { canvasId: 'files' },
    SQL_DBT_REFERENCE.uniqueId,
    { expectedProjectRevision: 'a'.repeat(64) }
  );
});

it('denies cross-connection Model insertion before any analysis IO', async () => {
  const port = query();
  await expect(
    materializeSqlWorksheetDbtModel(model, { ...connection, id: 'other' }, port)
  ).rejects.toThrow();
  expect(port.analyzeSelectedModel).not.toHaveBeenCalled();
});

it('rejects unavailable compiled SQL without falling back to a label or Jinja file', async () => {
  const port = query();
  port.analyzeSelectedModel.mockResolvedValue(buildSqlWorksheetDbtAnalysis());
  await expect(materializeSqlWorksheetDbtModel(model, connection, port)).rejects.toThrow();
});

it('rejects a substituted SQL hash even if its referenced Model identity is valid', async () => {
  const port = query();
  const response = buildSqlWorksheetDbtAnalysis('SELECT 2 AS id');
  response.executionSql!.sql = 'SELECT 99 AS id';
  port.analyzeSelectedModel.mockResolvedValueOnce(response);
  await expect(materializeSqlWorksheetDbtModel(model, connection, port)).rejects.toThrow();
});
