import { beforeEach, describe, expect, it, vi } from 'vitest';

const pgMock = vi.hoisted(() => {
  const connect = vi.fn<() => Promise<void>>();
  const end = vi.fn<() => Promise<void>>();
  const query = vi.fn<(sql: string) => Promise<{ rows: readonly Record<string, unknown>[] }>>();
  const Client = vi.fn(() => ({ connect, end, query }));

  return { Client, connect, end, query };
});

vi.mock('pg', () => ({
  Client: pgMock.Client,
}));

import { WorkspaceWarehouseConnectionProbe } from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';

describe('WorkspaceWarehouseConnectionProbe', () => {
  beforeEach(() => {
    pgMock.Client.mockClear();
    pgMock.connect.mockReset();
    pgMock.end.mockReset();
    pgMock.query.mockReset();
    pgMock.connect.mockResolvedValue(undefined);
    pgMock.end.mockResolvedValue(undefined);
  });

  it('returns Postgres table row counts and column metadata for source import discovery', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            row_count: '128',
            byte_size: '4096000',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            column_name: 'order_id',
            data_type: 'integer',
            is_nullable: 'NO',
            primary_key: true,
            unique_column: true,
          },
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            column_name: 'customer',
            data_type: 'text',
            is_nullable: 'YES',
            primary_key: false,
            unique_column: false,
          },
        ],
      });

    const probe = new WorkspaceWarehouseConnectionProbe({
      credentialResolver: { resolveCredential: async () => 'postgres://warehouse.local/dvt' },
      now: () => new Date('2026-06-27T12:00:00.000Z'),
    });

    await expect(
      probe.inspectConnection({
        scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' },
        name: 'Local Postgres',
        type: 'postgres',
        database: 'dvt',
        credentialRef: 'env:DVT_WAREHOUSE_URL',
      })
    ).resolves.toEqual({
      status: 'passed',
      checkedAt: '2026-06-27T12:00:00.000Z',
      tables: [
        {
          database: 'dvt',
          schema: 'public',
          table: 'orders',
          rowCount: 128,
          byteSize: 4096000,
          columns: [
            {
              name: 'order_id',
              type: 'integer',
              nullable: false,
              primaryKey: true,
              unique: true,
            },
            {
              name: 'customer',
              type: 'text',
              nullable: true,
            },
          ],
        },
      ],
    });
    expect(pgMock.query).toHaveBeenCalledTimes(2);
    expect(pgMock.query.mock.calls[0]?.[0]).toContain('pg_total_relation_size(relation.oid)');
    expect(pgMock.end).toHaveBeenCalledTimes(1);
  });
});
