import { describe, expect, it, vi } from 'vitest';

import { PostgresCanvasTransformDataSampleProbe } from '../../../src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';

function harness(rows: readonly Readonly<Record<string, unknown>>[] = [{ order_id: 1 }]): Readonly<{
  probe: PostgresCanvasTransformDataSampleProbe;
  query: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  resolveCredential: ReturnType<typeof vi.fn>;
}> {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith('select * from (')) {
      return {
        rows,
        fields: [{ name: 'order_id', dataTypeID: 23 }],
      };
    }
    return { rows: [], fields: [] };
  });
  const connect = vi.fn(async () => undefined);
  const end = vi.fn(async () => undefined);
  const resolveCredential = vi.fn(async () => 'postgres://server-owned');
  const probe = new PostgresCanvasTransformDataSampleProbe({
    credentialResolver: { resolveCredential },
    now: () => new Date('2026-09-15T10:00:00.000Z'),
    createClient: () => ({ connect, query, end }) as never,
  });
  return { probe, query, connect, end, resolveCredential };
}

describe('PostgresCanvasTransformDataSampleProbe', () => {
  it('runs canonical SQL in a bounded read-only transaction', async () => {
    const { probe, query } = harness([{ order_id: 1 }, { order_id: 2 }, { order_id: 3 }]);

    await expect(
      probe.previewTransformRows({
        type: 'postgres',
        credentialRef: 'postgres:local',
        sql: 'select order_id from raw.orders;',
        limit: 2,
      })
    ).resolves.toEqual({
      columns: [{ name: 'order_id', type: 'integer', nullable: true }],
      rows: [{ values: ['1'] }, { values: ['2'] }],
      truncated: true,
      sampledAt: '2026-09-15T10:00:00.000Z',
    });
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'begin transaction isolation level repeatable read read only',
      "set local statement_timeout = '3000ms'",
      'select * from (\nselect order_id from raw.orders\n) as dvt_transform_preview limit 3',
      'commit',
    ]);
  });

  it('rolls back and returns a stable failure without leaking the database error', async () => {
    const { probe, query, end } = harness();
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('select * from (')) throw new Error('secret database detail');
      return { rows: [], fields: [] };
    });

    await expect(
      probe.previewTransformRows({
        type: 'postgres',
        credentialRef: 'postgres:local',
        sql: 'select order_id from raw.orders',
        limit: 20,
      })
    ).rejects.toMatchObject({ reason: 'query_failed' });
    expect(query).toHaveBeenCalledWith('rollback');
    expect(end).toHaveBeenCalledOnce();
  });
});
