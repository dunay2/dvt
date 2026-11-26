import type { QueryArrayConfig } from 'pg';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { PostgresWorkspaceSqlExecutor } from '../../../src/infrastructure/sqlWorksheet/PostgresWorkspaceSqlExecutor.js';

type QueryResult = {
  fields: { name: string; dataTypeID: number }[];
  rows: (number | string | null)[][];
};
type ClientFixture = {
  connect: Mock<() => Promise<undefined>>;
  end: Mock<() => Promise<undefined>>;
  query: Mock<(input: string | QueryArrayConfig) => Promise<QueryResult>>;
};

function fixture(): ClientFixture &
  Readonly<{
    executor: PostgresWorkspaceSqlExecutor;
    resolveCredential: Mock<() => Promise<string>>;
    createClient: Mock<() => ClientFixture>;
  }> {
  const connect = vi.fn(async () => undefined);
  const end = vi.fn(async () => undefined);
  const query = vi.fn(async (input: string | QueryArrayConfig) =>
    typeof input === 'string'
      ? { fields: [], rows: [] }
      : {
          fields: [
            { name: 'same', dataTypeID: 23 },
            { name: 'same', dataTypeID: 25 },
          ],
          rows: [
            [1, 'first'],
            [2, null],
          ],
        }
  );
  const resolveCredential = vi.fn(async () => 'postgres://fixture');
  const createClient = vi.fn(() => ({ connect, query, end }));
  const executor = new PostgresWorkspaceSqlExecutor({
    credentialResolver: { resolveCredential },
    createClient,
  });
  return { executor, connect, query, end, resolveCredential, createClient };
}

const input = {
  type: 'postgres' as const,
  credentialRef: 'postgres:warehouse',
  sql: 'select 1 as same, 2 as same',
  limit: 1,
};

describe('independent PostgreSQL worksheet transport', () => {
  it('uses a dedicated bounded read-only transaction and preserves duplicate column positions', async () => {
    const state = fixture();
    const outcome = await state.executor.execute(input);
    expect(outcome).toEqual({
      result: {
        columns: [
          { name: 'same', type: 'integer', nullable: true },
          { name: 'same', type: 'text', nullable: true },
        ],
        rows: [{ values: ['1', 'first'] }],
      },
      truncated: true,
    });
    expect(state.resolveCredential).toHaveBeenCalledWith('postgres:warehouse');
    expect(state.query).toHaveBeenCalledWith('begin transaction read only');
    expect(state.query).toHaveBeenCalledWith('set local statement_timeout = 3000');
    expect(state.query).toHaveBeenCalledWith(
      expect.objectContaining({
        rowMode: 'array',
        queryMode: 'extended',
        text: expect.stringMatching(/limit 2\s*$/iu),
      })
    );
    expect(state.query).toHaveBeenLastCalledWith('commit');
    expect(state.end).toHaveBeenCalledTimes(1);
  });

  it.each([
    'delete from orders',
    'select 1; select 2',
    'with changed as (delete from orders returning *) select * from changed',
    'select * into copied_orders from orders',
    'select * from orders for update',
  ])('rejects non-read-only SQL before credential or connection IO: %s', async (sql) => {
    const state = fixture();
    await expect(state.executor.execute({ ...input, sql })).rejects.toMatchObject({
      failure: { code: 'sql_invalid' },
    });
    expect(state.resolveCredential).not.toHaveBeenCalled();
    expect(state.createClient).not.toHaveBeenCalled();
  });

  it('rejects unsupported providers and unavailable credentials explicitly', async () => {
    const state = fixture();
    await expect(state.executor.execute({ ...input, type: 'snowflake' })).rejects.toMatchObject({
      failure: { code: 'provider_unsupported' },
    });
    expect(state.resolveCredential).not.toHaveBeenCalled();
    state.resolveCredential.mockRejectedValue(new Error('postgres://secret@private'));
    await expect(state.executor.execute(input)).rejects.toMatchObject({
      failure: { code: 'connection_unavailable' },
    });
    expect(state.createClient).not.toHaveBeenCalled();
  });

  it('rolls back, closes and classifies a timeout without exposing driver secrets', async () => {
    const state = fixture();
    state.query.mockImplementation(async (query) => {
      if (typeof query !== 'string')
        throw Object.assign(new Error('postgres://secret@private'), { code: '57014' });
      return { fields: [], rows: [] };
    });
    await expect(state.executor.execute(input)).rejects.toMatchObject({
      failure: { code: 'query_timeout', message: 'The SQL query timed out.' },
    });
    expect(state.query).toHaveBeenLastCalledWith('rollback');
    expect(state.end).toHaveBeenCalledTimes(1);
  });

  it('closes a failed connection and retains a safe connection outcome', async () => {
    const state = fixture();
    state.connect.mockRejectedValue(
      Object.assign(new Error('secret connection'), { code: 'ECONNREFUSED' })
    );
    await expect(state.executor.execute(input)).rejects.toMatchObject({
      failure: { code: 'connection_unavailable' },
    });
    expect(state.query).not.toHaveBeenCalled();
    expect(state.end).toHaveBeenCalledTimes(1);
  });
});
