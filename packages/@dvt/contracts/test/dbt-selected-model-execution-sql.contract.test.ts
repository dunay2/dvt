import { describe, expect, it } from 'vitest';

import {
  DbtSelectedModelExecutionSqlSchema,
  DbtSelectedModelExecutionSqlSelectionSchema,
} from '../src/contracts/dbt-project/DbtSelectedModelExecutionSql.v1.js';

const reference = {
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
};
const receipt = {
  schemaVersion: 'dbt-selected-model-execution-sql.v1',
  reference,
  projectRevisionSha256: 'a'.repeat(64),
  analysisSha256: 'b'.repeat(64),
  sqlSha256: 'c'.repeat(64),
  sql: 'SELECT id FROM public.orders',
};

describe('selected file Model executable SQL read contract', () => {
  it('admits one explicit SQL read without a prior revision request', () => {
    expect(DbtSelectedModelExecutionSqlSelectionSchema.parse({})).toEqual({});
  });
  it('retains canonical reference and separate project, analysis and SQL digests', () => {
    expect(DbtSelectedModelExecutionSqlSchema.parse(receipt)).toEqual(receipt);
    expect(
      DbtSelectedModelExecutionSqlSelectionSchema.parse({
        expectedProjectRevision: receipt.projectRevisionSha256,
      })
    ).toEqual({ expectedProjectRevision: receipt.projectRevisionSha256 });
  });
  it.each(['projectRevisionSha256', 'analysisSha256', 'sqlSha256'])(
    'rejects a malformed %s observation',
    (key) => {
      expect(
        DbtSelectedModelExecutionSqlSchema.safeParse({ ...receipt, [key]: 'not-a-digest' }).success
      ).toBe(false);
    }
  );
  it.each(['', 'x'.repeat(65_537)])('rejects empty or oversized SQL without truncation', (sql) => {
    expect(DbtSelectedModelExecutionSqlSchema.safeParse({ ...receipt, sql }).success).toBe(false);
  });
  it('rejects competing semantic authority and caller-selected project roots', () => {
    expect(
      DbtSelectedModelExecutionSqlSchema.safeParse({
        ...receipt,
        semanticPlanSha256: 'a'.repeat(64),
      }).success
    ).toBe(false);
    expect(
      DbtSelectedModelExecutionSqlSelectionSchema.safeParse({
        expectedProjectRevision: receipt.projectRevisionSha256,
        projectRoot: '../other',
      }).success
    ).toBe(false);
  });
});
