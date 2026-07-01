import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { dbtGraphNodeCardStrategy } from '../dbt/dbtGraphNodeCardStrategy';
import { dvtGraphNodeCardStrategy } from '../dvt/dvtGraphNodeCardStrategy';
import { buildGraphNodeCardReadModel } from './graphNodeCardReadModel';

function buildNode(partial: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'node-1',
    name: 'Node 1',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    ...partial,
  };
}

describe('buildGraphNodeCardReadModel', () => {
  it('uses a DVT card strategy for operational table metrics', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt',
        name: 'public.orders',
        metadata: {
          database: 'warehouse',
          schema: 'public',
          table: 'orders',
          rowCount: 18240,
          byteSize: 4096000,
          columns: [
            { name: 'order_id', type: 'integer' },
            { name: 'customer_id', type: 'text' },
          ],
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.title).toBe('Warehouse · public');
    expect(model.technicalName).toBe('public.orders');
    expect(model.status).toEqual({ label: 'Ready', tone: 'success' });
    expect(model.subtitle).toBe('warehouse.public.orders');
    expect(model.path).toBe('warehouse.public.orders');
    expect(model.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '18.2k' },
      { id: 'bytes', label: 'Size', value: '3.9 MB' },
      { id: 'columns', label: 'Columns', value: '2' },
    ]);
    expect(model.operationalMetrics).toEqual([
      { id: 'rows', label: 'Rows', value: '18.2k' },
      { id: 'size', label: 'Size', value: '3.9 MB' },
    ]);
  });

  it('uses imported DVT source table metadata in the technical path', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'src_erp_orders',
        metadata: {
          database: 'warehouse',
          schema: 'erp',
          config: {
            sourceName: 'erp',
            tableName: 'orders',
          },
          rowCount: 42,
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.title).toBe('Erp Orders');
    expect(model.technicalName).toBe('src_erp_orders');
    expect(model.subtitle).toBe('warehouse.erp.orders');
    expect(model.path).toBe('warehouse.erp.orders');
  });

  it('adds DVT runtime metrics only from recorded metadata', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        name: 'customer_rollup',
        metadata: {
          database: 'warehouse',
          schema: 'mart',
          table: 'customer_rollup',
          rowCount: 1210,
          byteSize: 2048,
          durationMs: 75432,
          lastRunAt: '2026-06-12T20:45:00Z',
          warningCount: 2,
          runStatus: 'completed',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.status).toEqual({ label: 'Completed', tone: 'success' });
    expect(model.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '1.2k' },
      { id: 'bytes', label: 'Size', value: '2 KB' },
      { id: 'columns', label: 'Columns', value: '0' },
      { id: 'status', label: 'Status', value: 'completed' },
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z' },
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'warnings', label: 'Warnings', value: '2' },
    ]);
    expect(model.operationalMetrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z' },
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'rows', label: 'Rows', value: '1.2k' },
    ]);
  });

  it('keeps DVT canonical runtime metrics on strategy-owned cards', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        name: 'customer_rollup',
        lastDuration: 75,
        lastCost: 0.42,
        metadata: {
          database: 'warehouse',
          schema: 'mart',
          table: 'customer_rollup',
          rowCount: 1210,
          byteSize: 2048,
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '1.2k' },
      { id: 'bytes', label: 'Size', value: '2 KB' },
      { id: 'columns', label: 'Columns', value: '0' },
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'cost', label: 'Cost', value: '$0.42' },
    ]);
  });

  it('preserves canonical warning status when runtime status is not recorded', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        name: 'customer_rollup',
        status: 'warn',
        metadata: {
          database: 'warehouse',
          schema: 'mart',
          table: 'customer_rollup',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.status).toEqual({ label: 'Warning', tone: 'warning' });
  });

  it('uses a DBT card strategy for model context instead of DVT table ownership', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:model',
        pluginId: 'dbt',
        name: 'fct_orders',
        path: 'models/marts/fct_orders.sql',
        metadata: {
          package: 'analytics',
          dependencies: ['source.raw.orders', 'ref.stg_customers'],
          config: {
            materialized: 'incremental',
          },
          columns: [{ name: 'order_id', type: 'integer' }],
        },
      }),
      {},
      [dbtGraphNodeCardStrategy]
    );

    expect(model.status).toEqual({ label: 'Draft', tone: 'warning' });
    expect(model.subtitle).toBe('analytics');
    expect(model.path).toBe('models/marts/fct_orders.sql');
    expect(model.metrics).toEqual([
      { id: 'materialization', label: 'Mat.', value: 'incremental' },
      { id: 'dependencies', label: 'Deps', value: '2' },
      { id: 'columns', label: 'Columns', value: '1' },
    ]);
  });

  it('adds DBT source operational metrics from recorded warehouse metadata', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:source',
        pluginId: 'dbt',
        name: 'src_erp_orders',
        metadata: {
          database: 'RAW',
          schema: 'ERP',
          tableName: 'ORDERS',
          rowCount: 1500,
          byteSize: 4096000,
          columns: [
            { name: 'order_id', type: 'INTEGER' },
            { name: 'discount_code', type: 'TEXT' },
          ],
        },
      }),
      {},
      [dbtGraphNodeCardStrategy]
    );

    expect(model.title).toBe('Raw · ERP');
    expect(model.technicalName).toBe('src_erp_orders');
    expect(model.status).toEqual({ label: 'Ready', tone: 'success' });
    expect(model.subtitle).toBe('RAW.ERP.ORDERS');
    expect(model.path).toBe('RAW.ERP.ORDERS');
    expect(model.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '1.5k' },
      { id: 'bytes', label: 'Size', value: '3.9 MB' },
      { id: 'columns', label: 'Columns', value: '2' },
    ]);
    expect(model.operationalMetrics).toEqual([
      { id: 'rows', label: 'Rows', value: '1.5k' },
      { id: 'size', label: 'Size', value: '3.9 MB' },
    ]);
  });

  it('adds DBT test target and severity metrics from recorded metadata', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:test',
        pluginId: 'dbt',
        name: 'not_null_fct_orders_order_id',
        metadata: {
          package: 'analytics',
          testTargetModel: 'fct_orders',
          testTargetColumn: 'order_id',
          severity: 'error',
          durationMs: 9300,
          warningCount: 1,
        },
      }),
      {},
      [dbtGraphNodeCardStrategy]
    );

    expect(model.metrics).toEqual([
      { id: 'test-target', label: 'Target', value: 'fct_orders.order_id' },
      { id: 'severity', label: 'Severity', value: 'error' },
      { id: 'columns', label: 'Columns', value: '0' },
      { id: 'duration', label: 'Duration', value: '9s' },
      { id: 'warnings', label: 'Warnings', value: '1' },
    ]);
  });
});
