import { buildRelationalSourceObjectId, type RelationalSourceObjectLocator } from '@dvt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pgMock = vi.hoisted(() => {
  const connect = vi.fn<() => Promise<void>>();
  const end = vi.fn<() => Promise<void>>();
  const query = vi.fn<
    (sql: string) => Promise<{
      rows: readonly Record<string, unknown>[];
      fields?: readonly { name: string; dataTypeID?: number }[];
    }>
  >();
  const Client = vi.fn(() => ({ connect, end, query }));

  return { Client, connect, end, query };
});

vi.mock('pg', () => ({
  Client: pgMock.Client,
}));

import { WorkspaceWarehouseConnectionProbe } from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';

function expectedRelationIdentity(
  name: string,
  relationType: 'table' | 'view' = 'table'
): Readonly<{
  objectId: string;
  displayName: string;
  locator: RelationalSourceObjectLocator;
}> {
  const locator = {
    kind: 'relation' as const,
    catalog: 'dvt',
    schema: 'public',
    name,
    relationType,
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: name,
    locator,
  };
}

describe('WorkspaceWarehouseConnectionProbe', () => {
  beforeEach(() => {
    pgMock.Client.mockClear();
    pgMock.connect.mockReset();
    pgMock.end.mockReset();
    pgMock.query.mockReset();
    pgMock.connect.mockResolvedValue(undefined);
    pgMock.end.mockResolvedValue(undefined);
  });

  it('returns Postgres relation metrics and column metadata as source objects', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: '128',
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
            constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
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
      })
      .mockResolvedValueOnce({ rows: [{ byte_size: '4096000' }] });

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
        credentialRef: 'postgres:warehouse',
      })
    ).resolves.toEqual({
      status: 'passed',
      checkedAt: '2026-06-27T12:00:00.000Z',
      sourceObjects: [
        {
          ...expectedRelationIdentity('orders'),
          metricEvidence: {
            observedAt: '2026-06-27T12:00:00.000Z',
            observationScope: { kind: 'snapshot' },
            rowCount: {
              value: 128,
              provenance: 'estimated',
              method: 'provider-statistics',
              confidence: 'medium',
            },
            byteSize: {
              value: 4096000,
              provenance: 'measured',
              method: 'provider-storage-metadata',
              confidence: 'exact',
              basis: 'physical-allocation',
            },
          },
          columns: [
            {
              name: 'order_id',
              type: 'integer',
              nullable: false,
            },
            {
              name: 'customer',
              type: 'text',
              nullable: true,
            },
          ],
          constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
        },
      ],
    });
    expect(pgMock.query).toHaveBeenCalledTimes(3);
    expect(pgMock.query.mock.calls[0]?.[0]).not.toContain('pg_total_relation_size(relation.oid)');
    expect(pgMock.query.mock.calls[0]?.[0]).toContain('pg_stat_get_live_tuples(relation.oid)');
    expect(pgMock.query.mock.calls[1]?.[0]).toContain('with discovered_relations as');
    expect(pgMock.query.mock.calls[0]?.[0]).not.toContain('limit ');
    expect(pgMock.query.mock.calls[1]?.[0]).not.toContain('limit ');
    expect(pgMock.query.mock.calls[2]?.[0]).toContain('pg_total_relation_size');
    expect(pgMock.end).toHaveBeenCalledTimes(1);
  });

  it('keeps quoted Postgres identifiers distinct when they differ only by case', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'Orders',
            relation_kind: 'r',
            row_count: '2',
          },
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: '3',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'Orders',
            column_name: 'QuotedId',
            data_type: 'integer',
            is_nullable: 'NO',
            primary_key: false,
            unique_column: false,
          },
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            column_name: 'id',
            data_type: 'integer',
            is_nullable: 'NO',
            primary_key: false,
            unique_column: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ byte_size: '128' }] })
      .mockResolvedValueOnce({ rows: [{ byte_size: '192' }] });
    const probe = new WorkspaceWarehouseConnectionProbe({
      credentialResolver: { resolveCredential: async () => 'postgres://warehouse.local/dvt' },
      now: () => new Date('2026-06-27T12:00:00.000Z'),
    });

    const result = await probe.inspectConnection({
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:warehouse',
    });

    expect(result.status).toBe('passed');
    if (result.status !== 'passed') return;
    expect(result.sourceObjects.map((sourceObject) => sourceObject.objectId)).toEqual([
      'relation/dvt/public/Orders',
      'relation/dvt/public/orders',
    ]);
    expect(result.sourceObjects[0]?.columns?.map((column) => column.name)).toEqual(['QuotedId']);
    expect(result.sourceObjects[1]?.columns?.map((column) => column.name)).toEqual(['id']);
  });

  it('preserves composite constraints without claiming per-column uniqueness', async () => {
    const compositeConstraint = {
      name: 'orders_pkey',
      kind: 'primary-key',
      columns: ['tenant_id', 'order_id'],
    };
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: '12',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            column_name: 'tenant_id',
            data_type: 'uuid',
            is_nullable: 'NO',
            primary_key: true,
            unique_column: false,
            constraints: [compositeConstraint],
          },
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            column_name: 'order_id',
            data_type: 'bigint',
            is_nullable: 'NO',
            primary_key: true,
            unique_column: false,
            constraints: [compositeConstraint],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ byte_size: '8192' }] });

    const probe = new WorkspaceWarehouseConnectionProbe({
      credentialResolver: { resolveCredential: async () => 'postgres://warehouse.local/dvt' },
      now: () => new Date('2026-07-11T10:00:00.000Z'),
    });

    const result = await probe.inspectConnection({
      scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' },
      name: 'Local Postgres',
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:warehouse',
    });

    expect(result).toMatchObject({
      status: 'passed',
      sourceObjects: [
        {
          columns: [{ name: 'tenant_id' }, { name: 'order_id' }],
          constraints: [compositeConstraint],
        },
      ],
    });
    expect(pgMock.query.mock.calls[1]?.[0]).not.toContain('as primary_key');
    expect(pgMock.query.mock.calls[1]?.[0]).not.toContain('as unique_column');
  });

  it('estimates object weight when relation-size metadata is not authorized', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: '10',
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
        ],
      })
      .mockRejectedValueOnce(new Error('permission denied for function pg_total_relation_size'));

    const probe = new WorkspaceWarehouseConnectionProbe({
      credentialResolver: { resolveCredential: async () => 'postgres://warehouse.local/dvt' },
      now: () => new Date('2026-06-27T12:00:00.000Z'),
    });

    const result = await probe.inspectConnection({
      scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' },
      name: 'Local Postgres',
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:warehouse',
    });

    expect(result).toMatchObject({
      status: 'passed',
      sourceObjects: [
        {
          metricEvidence: {
            byteSize: {
              value: 290,
              provenance: 'estimated',
              method: 'schema-width',
              confidence: 'low',
            },
          },
        },
      ],
    });
    expect(pgMock.query.mock.calls[2]?.[0]).toContain('pg_total_relation_size');
  });

  it('estimates byte size when Postgres exposes rows and columns but not relation bytes', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders_view',
            relation_kind: 'v',
            row_count: '128',
            byte_size: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders_view',
            column_name: 'order_id',
            data_type: 'integer',
            is_nullable: 'NO',
            primary_key: false,
            unique_column: false,
          },
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders_view',
            column_name: 'customer',
            data_type: 'text',
            is_nullable: 'YES',
            primary_key: false,
            unique_column: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ byte_size: null }] });

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
        credentialRef: 'postgres:warehouse',
      })
    ).resolves.toEqual({
      status: 'passed',
      checkedAt: '2026-06-27T12:00:00.000Z',
      sourceObjects: [
        {
          ...expectedRelationIdentity('orders_view', 'view'),
          metricEvidence: {
            observedAt: '2026-06-27T12:00:00.000Z',
            observationScope: { kind: 'snapshot' },
            rowCount: {
              value: 128,
              provenance: 'estimated',
              method: 'provider-statistics',
              confidence: 'medium',
            },
            byteSize: {
              value: 11904,
              provenance: 'estimated',
              method: 'schema-width',
              confidence: 'low',
              basis: 'provider-row-storage',
            },
          },
          columns: [
            { name: 'order_id', type: 'integer', nullable: false },
            { name: 'customer', type: 'text', nullable: true },
          ],
        },
      ],
    });
  });

  it('falls back to authorized table reads when Postgres row-count statistics are unavailable', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: null,
            byte_size: null,
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
            primary_key: false,
            unique_column: false,
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
      })
      .mockResolvedValueOnce({
        rows: [{ 'QUERY PLAN': [{ Plan: { 'Plan Rows': 128 } }] }],
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
        credentialRef: 'postgres:warehouse',
      })
    ).resolves.toEqual({
      status: 'passed',
      checkedAt: '2026-06-27T12:00:00.000Z',
      sourceObjects: [
        {
          ...expectedRelationIdentity('orders'),
          metricEvidence: {
            observedAt: '2026-06-27T12:00:00.000Z',
            observationScope: { kind: 'snapshot' },
            rowCount: {
              value: 128,
              provenance: 'estimated',
              method: 'query-plan',
              confidence: 'low',
            },
            byteSize: {
              value: 11904,
              provenance: 'estimated',
              method: 'schema-width',
              confidence: 'low',
              basis: 'provider-row-storage',
            },
          },
          columns: [
            { name: 'order_id', type: 'integer', nullable: false },
            { name: 'customer', type: 'text', nullable: true },
          ],
        },
      ],
    });
    expect(pgMock.query.mock.calls[2]?.[0]).toBe(
      'explain (format json) select * from "public"."orders"'
    );
    expect(pgMock.query.mock.calls.flat().join(' ')).not.toContain('count(*)');
  });

  it('falls back to driver column metadata when catalog column metadata is unavailable', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: null,
            byte_size: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [],
        fields: [
          { name: 'order_id', dataTypeID: 23 },
          { name: 'payload', dataTypeID: 3802 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ 'QUERY PLAN': [{ Plan: { 'Plan Rows': 10 } }] }],
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
        credentialRef: 'postgres:warehouse',
      })
    ).resolves.toEqual({
      status: 'passed',
      checkedAt: '2026-06-27T12:00:00.000Z',
      sourceObjects: [
        {
          ...expectedRelationIdentity('orders'),
          metricEvidence: {
            observedAt: '2026-06-27T12:00:00.000Z',
            observationScope: { kind: 'snapshot' },
            rowCount: {
              value: 10,
              provenance: 'estimated',
              method: 'query-plan',
              confidence: 'low',
            },
            byteSize: {
              value: 2850,
              provenance: 'estimated',
              method: 'schema-width',
              confidence: 'low',
              basis: 'provider-row-storage',
            },
          },
          columns: [
            { name: 'order_id', type: 'integer', nullable: true },
            { name: 'payload', type: 'jsonb', nullable: true },
          ],
        },
      ],
    });
    expect(pgMock.query.mock.calls[2]?.[0]).toBe('select * from "public"."orders" limit 0');
    expect(pgMock.query.mock.calls[3]?.[0]).toBe(
      'explain (format json) select * from "public"."orders"'
    );
  });

  it('falls back to driver column metadata when catalog metadata is not authorized', async () => {
    const permissionError = Object.assign(new Error('permission denied for information_schema'), {
      code: '42501',
    });
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders',
            relation_kind: 'r',
            row_count: '10',
          },
        ],
      })
      .mockRejectedValueOnce(permissionError)
      .mockResolvedValueOnce({
        rows: [],
        fields: [
          { name: 'order_id', dataTypeID: 23 },
          { name: 'payload', dataTypeID: 3802 },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ byte_size: '4096' }] });

    const probe = new WorkspaceWarehouseConnectionProbe({
      credentialResolver: { resolveCredential: async () => 'postgres://warehouse.local/dvt' },
      now: () => new Date('2026-07-10T21:00:00.000Z'),
    });

    const result = await probe.inspectConnection({
      scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' },
      name: 'Local Postgres',
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:warehouse',
    });

    expect(result).toMatchObject({
      status: 'passed',
      sourceObjects: [
        {
          columns: [
            { name: 'order_id', type: 'integer', nullable: true },
            { name: 'payload', type: 'jsonb', nullable: true },
          ],
        },
      ],
    });
    expect(pgMock.query.mock.calls[2]?.[0]).toBe('select * from "public"."orders" limit 0');
  });

  it('tests connectivity without loading source metrics or scanning source data', async () => {
    pgMock.query.mockResolvedValueOnce({ rows: [{ object_count: '2' }] });

    const probe = new WorkspaceWarehouseConnectionProbe({
      credentialResolver: { resolveCredential: async () => 'postgres://warehouse.local/dvt' },
      now: () => new Date('2026-07-10T21:00:00.000Z'),
    });

    await expect(
      probe.testConnection({
        id: 'local-postgres',
        name: 'Local Postgres',
        type: 'postgres',
        database: 'dvt',
        credentialRef: 'postgres:warehouse',
        sourceObjects: [],
      })
    ).resolves.toEqual({
      connectionId: 'local-postgres',
      status: 'passed',
      checkedAt: '2026-07-10T21:00:00.000Z',
      objectCount: 2,
    });
    expect(pgMock.query).toHaveBeenCalledTimes(1);
    expect(pgMock.query.mock.calls[0]?.[0]).toContain('from pg_class relation');
    expect(pgMock.query.mock.calls[0]?.[0]).not.toContain('pg_total_relation_size');
    expect(pgMock.query.mock.calls[0]?.[0]).toContain('select count(*)::bigint as object_count');
    expect(pgMock.query.mock.calls[0]?.[0]).not.toContain('limit ');
  });

  it('measures rows through the authorized data plane when metadata and plan estimates are unavailable', async () => {
    pgMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders_view',
            relation_kind: 'v',
            row_count: null,
            byte_size: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            table_catalog: 'dvt',
            table_schema: 'public',
            table_name: 'orders_view',
            column_name: 'order_id',
            data_type: 'integer',
            is_nullable: 'NO',
            primary_key: false,
            unique_column: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ row_count: '7' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ byte_size: null }] });

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
        credentialRef: 'postgres:warehouse',
      })
    ).resolves.toEqual({
      status: 'passed',
      checkedAt: '2026-06-27T12:00:00.000Z',
      sourceObjects: [
        {
          ...expectedRelationIdentity('orders_view', 'view'),
          metricEvidence: {
            observedAt: '2026-06-27T12:00:00.000Z',
            observationScope: { kind: 'snapshot' },
            rowCount: {
              value: 7,
              provenance: 'measured',
              method: 'data-scan',
              confidence: 'exact',
            },
            byteSize: {
              value: 203,
              provenance: 'estimated',
              method: 'schema-width',
              confidence: 'low',
              basis: 'provider-row-storage',
            },
          },
          columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        },
      ],
    });
    expect(pgMock.query.mock.calls[3]?.[0]).toBe("set statement_timeout = '2000ms'");
    expect(pgMock.query.mock.calls[4]?.[0]).toBe(
      'select count(*)::bigint as row_count from "public"."orders_view"'
    );
    expect(pgMock.query.mock.calls[5]?.[0]).toBe('reset statement_timeout');
  });
});
