import { expect } from 'vitest';

import type { WorkspaceWarehouseConnectionProbe } from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';

import { expectedRelationIdentity, pgMock } from './warehouseConnectionProbe.test.fixtures.js';
/** Owned concern: prepare provider metadata responses for warehouse probe scenarios. */

const metricResponses = {
  globalNameSearch: [
    {
      rows: [
        {
          table_catalog: 'dvt',
          table_schema: 'public',
          table_name: 'orders',
          relation_comment: 'Sales orders.\n  External documentation.',
          database_user: 'warehouse_reader',
          relation_kind: 'r',
          row_count: '128',
        },
        {
          table_catalog: 'dvt',
          table_schema: 'raw',
          table_name: 'orders_archive',
          database_user: 'warehouse_reader',
          relation_kind: 'r',
          row_count: '64',
        },
      ],
    },
    {
      rows: [
        {
          table_catalog: 'dvt',
          table_schema: 'public',
          table_name: 'orders',
          column_name: 'order_id',
          column_comment: 'Warehouse <order> identifier.',
          data_type: 'integer',
          is_nullable: 'NO',
        },
      ],
    },
    { rows: [{ byte_size: '4096' }] },
  ],
  relationMetrics: [
    {
      rows: [
        {
          table_catalog: 'dvt',
          table_schema: 'public',
          table_name: 'orders',
          database_user: 'warehouse_reader',
          relation_kind: 'r',
          row_count: '128',
        },
      ],
    },
    {
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
    },
    { rows: [{ byte_size: '4096000' }] },
  ],
  quotedIdentifiers: [
    {
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
    },
    {
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
    },
    { rows: [{ byte_size: '128' }] },
    { rows: [{ byte_size: '192' }] },
  ],
  schemaWidthBytes: [
    {
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
    },
    {
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
    },
    { rows: [{ byte_size: null }] },
  ],
  authorizedRowCount: [
    {
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
    },
    {
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
    },
    {
      rows: [{ 'QUERY PLAN': [{ Plan: { 'Plan Rows': 128 } }] }],
    },
  ],
  driverColumns: [
    {
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
    },
    { rows: [] },
    {
      rows: [],
      fields: [
        { name: 'order_id', dataTypeID: 23 },
        { name: 'payload', dataTypeID: 3802 },
      ],
    },
    {
      rows: [{ 'QUERY PLAN': [{ Plan: { 'Plan Rows': 10 } }] }],
    },
  ],
  measuredRows: [
    {
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
    },
    {
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
    },
    { rows: [] },
    { rows: [] },
    { rows: [{ row_count: '7' }] },
    { rows: [] },
    { rows: [{ byte_size: null }] },
  ],
};

export function buildProbeMetricFixture(scenario: keyof typeof metricResponses): void {
  for (const response of globalThis.structuredClone(metricResponses[scenario])) {
    pgMock.query.mockResolvedValueOnce(response);
  }
}

export const estimatedProbeMetricScenarios = {
  schemaWidthBytes: {
    expected: {
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
    },
  },
  authorizedRowCount: {
    expected: {
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
    },
    verifyQueries: () => {
      expect(pgMock.query.mock.calls[2]?.[0]).toBe(
        'explain (format json) select * from "public"."orders"'
      );
      expect(pgMock.query.mock.calls.flat().join(' ')).not.toContain('count(*)');
    },
  },
  driverColumns: {
    expected: {
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
    },
    verifyQueries: () => {
      expect(pgMock.query.mock.calls[2]?.[0]).toBe('select * from "public"."orders" limit 0');
      expect(pgMock.query.mock.calls[3]?.[0]).toBe(
        'explain (format json) select * from "public"."orders"'
      );
    },
  },
  measuredRows: {
    expected: {
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
    },
    verifyQueries: () => {
      expect(pgMock.query.mock.calls[3]?.[0]).toBe("set statement_timeout = '2000ms'");
      expect(pgMock.query.mock.calls[4]?.[0]).toBe(
        'select count(*)::bigint as row_count from "public"."orders_view"'
      );
      expect(pgMock.query.mock.calls[5]?.[0]).toBe('reset statement_timeout');
    },
  },
};

export async function verifyEstimatedProbeMetricScenario(
  probe: WorkspaceWarehouseConnectionProbe,
  scenario: keyof typeof estimatedProbeMetricScenarios
): Promise<void> {
  buildProbeMetricFixture(scenario);
  const definition = estimatedProbeMetricScenarios[scenario];
  await expect(
    probe.inspectConnection({
      scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' },
      name: 'Local Postgres',
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:warehouse',
    })
  ).resolves.toEqual(definition.expected);
  if ('verifyQueries' in definition) definition.verifyQueries();
}
