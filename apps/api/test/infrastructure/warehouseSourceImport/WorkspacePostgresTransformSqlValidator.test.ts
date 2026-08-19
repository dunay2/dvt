import { describe, expect, it, vi } from 'vitest';

import { WorkspacePostgresTransformSqlValidator } from '../../../src/infrastructure/warehouseSourceImport/WorkspacePostgresTransformSqlValidator.js';

function buildClient(query: ReturnType<typeof vi.fn>): {
  connect: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    query,
    end: vi.fn().mockResolvedValue(undefined),
  };
}

describe('WorkspacePostgresTransformSqlValidator', () => {
  it('plans valid SQL in a read-only transaction and always rolls it back', async () => {
    const client = buildClient(vi.fn().mockResolvedValue({ rows: [] }));
    const clientFactory = vi.fn().mockReturnValue(client);
    const validator = new WorkspacePostgresTransformSqlValidator({
      credentialResolver: { resolveCredential: vi.fn().mockResolvedValue('postgresql://resolved') },
      clientFactory,
    });

    await expect(
      validator.validate({
        credentialRef: 'postgres:warehouse-a',
        sql: 'select * from public.source_1',
      })
    ).resolves.toEqual({ status: 'valid' });

    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
      'begin transaction read only',
      "set local statement_timeout = '3000ms'",
      'explain (format json) select * from public.source_1',
      'rollback',
    ]);
    expect(clientFactory).toHaveBeenCalledWith({
      connectionString: 'postgresql://resolved',
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
    });
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it('returns a positioned PostgreSQL column diagnostic and rolls back', async () => {
    const postgresError = Object.assign(new Error('column "missing" does not exist'), {
      code: '42703',
      position: String('explain (format json) '.length + 8),
    });
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(postgresError)
      .mockResolvedValueOnce({ rows: [] });
    const client = buildClient(query);
    const validator = new WorkspacePostgresTransformSqlValidator({
      credentialResolver: { resolveCredential: vi.fn().mockResolvedValue('postgresql://resolved') },
      clientFactory: vi.fn().mockReturnValue(client),
    });

    await expect(
      validator.validate({ credentialRef: 'postgres:warehouse-a', sql: 'select missing' })
    ).resolves.toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'undefined_column', source: 'postgres', startOffset: 7 }],
    });
    expect(client.query).toHaveBeenLastCalledWith('rollback');
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an unavailable connection from invalid SQL', async () => {
    const client = buildClient(vi.fn());
    client.connect.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    );
    const validator = new WorkspacePostgresTransformSqlValidator({
      credentialResolver: { resolveCredential: vi.fn().mockResolvedValue('postgresql://resolved') },
      clientFactory: vi.fn().mockReturnValue(client),
    });

    await expect(
      validator.validate({ credentialRef: 'postgres:warehouse-a', sql: 'select 1' })
    ).resolves.toEqual({
      status: 'unavailable',
      diagnostics: [
        {
          code: 'connection_unavailable',
          source: 'connection',
          message: 'The governed PostgreSQL connection is unavailable.',
        },
      ],
    });
    expect(client.query).not.toHaveBeenCalled();
    expect(client.end).toHaveBeenCalledTimes(1);
  });
});
