import { describe, expect, it } from 'vitest';

import example from '../src/contracts/sql-workspace/examples/WorkspaceSqlExecution.example.json' with { type: 'json' };
import {
  ExecuteWorkspaceSqlRequestSchema,
  ExecuteWorkspaceSqlResponseSchema,
  ListWorkspaceSqlExecutionsRequestSchema,
  ListWorkspaceSqlExecutionsResponseSchema,
  WorkspaceSqlExecutionSchema,
} from '../src/contracts/sql-workspace/SqlWorksheet.v1.js';

function execution(): typeof example {
  return { ...example };
}

describe('independent SQL worksheet contract', () => {
  it('accepts a connection and unsaved SQL without file, Canvas or model authority', () => {
    const sql = '  select 1 as answer;\n';
    expect(ExecuteWorkspaceSqlRequestSchema.parse({ connectionId: 'warehouse', sql })).toEqual({
      connectionId: 'warehouse',
      sql,
      limit: 100,
    });
  });

  it.each(['canvasId', 'modelId', 'path', 'credentialRef', 'principalId', 'tenantId'])(
    'rejects client-supplied %s authority',
    (field) => {
      expect(
        ExecuteWorkspaceSqlRequestSchema.safeParse({
          connectionId: 'warehouse',
          sql: 'select 1',
          [field]: 'not-authority',
        }).success
      ).toBe(false);
    }
  );

  it.each([
    { connectionId: '', sql: 'select 1' },
    { connectionId: 'warehouse', sql: ' \n ' },
    { connectionId: 'warehouse', sql: 'x'.repeat(65_537) },
    { connectionId: 'warehouse', sql: 'select 1', limit: 0 },
    { connectionId: 'warehouse', sql: 'select 1', limit: 1001 },
  ])('rejects absent evidence and unbounded output: %j', (request) => {
    expect(ExecuteWorkspaceSqlRequestSchema.safeParse(request).success).toBe(false);
  });

  it('preserves duplicate column positions and nullable display cells', () => {
    const columns = [
      { name: 'answer', type: 'integer', nullable: false },
      { name: 'answer', type: 'text', nullable: true },
    ];
    const response = {
      schemaVersion: 'workspace-sql-execution-response.v1',
      execution: { ...execution(), columns },
      result: { columns, rows: [{ values: ['1', null] }] },
    };
    expect(ExecuteWorkspaceSqlResponseSchema.parse(response)).toEqual(response);
    expect(
      ExecuteWorkspaceSqlResponseSchema.safeParse({
        ...response,
        result: { columns, rows: [{ values: ['1'] }] },
      }).success
    ).toBe(false);
  });

  it('requires actual result facts for success and an explicit failure without rows', () => {
    const success = execution();
    expect(
      ExecuteWorkspaceSqlResponseSchema.safeParse({
        schemaVersion: 'workspace-sql-execution-response.v1',
        execution: success,
      }).success
    ).toBe(false);
    const failed = {
      ...success,
      status: 'failed',
      rowCount: 0,
      columns: [],
      error: { code: 'query_timeout', message: 'The SQL query timed out.' },
    };
    expect(WorkspaceSqlExecutionSchema.parse(failed)).toEqual(failed);
    expect(WorkspaceSqlExecutionSchema.safeParse({ ...failed, error: undefined }).success).toBe(
      false
    );
    expect(
      ExecuteWorkspaceSqlResponseSchema.safeParse({
        schemaVersion: 'workspace-sql-execution-response.v1',
        execution: failed,
        result: { columns: [], rows: [] },
      }).success
    ).toBe(false);
  });

  it('rejects impossible timing, row counts and mixed result metadata', () => {
    const current = execution();
    expect(WorkspaceSqlExecutionSchema.safeParse({ ...current, durationMs: -1 }).success).toBe(
      false
    );
    expect(
      WorkspaceSqlExecutionSchema.safeParse({
        ...current,
        finishedAt: '2026-11-24T23:59:59.999Z',
      }).success
    ).toBe(false);
    expect(WorkspaceSqlExecutionSchema.safeParse({ ...current, rowCount: 101 }).success).toBe(
      false
    );
    expect(
      ExecuteWorkspaceSqlResponseSchema.safeParse({
        schemaVersion: 'workspace-sql-execution-response.v1',
        execution: current,
        result: { columns: [], rows: [{ values: [] }] },
      }).success
    ).toBe(false);
  });

  it('retains SQL and metadata in bounded history without persisting row values', () => {
    expect(ListWorkspaceSqlExecutionsRequestSchema.parse({})).toEqual({ limit: 20 });
    expect(ListWorkspaceSqlExecutionsRequestSchema.safeParse({ limit: 101 }).success).toBe(false);
    const history = {
      schemaVersion: 'workspace-sql-execution-history.v1',
      executions: [execution()],
      nextCursor: null,
    };
    expect(ListWorkspaceSqlExecutionsResponseSchema.parse(history)).toEqual(history);
    expect(
      WorkspaceSqlExecutionSchema.safeParse({ ...execution(), rows: [{ values: ['1'] }] }).success
    ).toBe(false);
  });
});
