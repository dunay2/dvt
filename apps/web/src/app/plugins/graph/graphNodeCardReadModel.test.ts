import { describe, expect, it } from 'vitest';

import type { SourceObjectMetricEvidence } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import { dbtGraphNodeCardStrategy } from '../dbt/dbtGraphNodeCardStrategy';
import { dvtGraphNodeCardStrategy } from '../dvt/dvtGraphNodeCardStrategy';
import { buildGraphNodeCardReadModel } from './graphNodeCardReadModel';

const SOURCE_METRICS_OBSERVED_AT = '2026-07-10T21:00:00.000Z';

function sourceMetricEvidence(rowCount: number): SourceObjectMetricEvidence {
  return {
    observedAt: SOURCE_METRICS_OBSERVED_AT,
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: rowCount,
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
  };
}

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
          sourceMetricEvidence: sourceMetricEvidence(18240),
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
    expect(model.accentTone).toBe('source');
    expect(model.technicalName).toBe('public.orders');
    expect(model.status).toEqual({ label: 'Ready', tone: 'success' });
    expect(model.nodeActionsLabel).toBe('Más acciones del nodo');
    expect(model.subtitle).toBe('warehouse.public.orders');
    expect(model.path).toBe('warehouse.public.orders');
    expect(model.metrics).toEqual([{ id: 'columns', label: 'Columns', value: '2' }]);
    expect(model.operationalMetrics).toEqual([
      {
        id: 'rows',
        label: 'Rows',
        value: '18.2k',
        icon: 'rows',
        tone: 'warning',
        detail:
          '18,240 rows. Estimated using provider statistics. Confidence: medium. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
      {
        id: 'size',
        label: 'Size',
        value: '3.9 MB',
        icon: 'database',
        tone: 'success',
        detail:
          '4,096,000 B (3.9 MB). Measured using provider storage metadata. Physical allocation. Confidence: exact. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
    ]);
  });

  it('suppresses unverified flat source volume instead of presenting it as evidence', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'src_local_postgres_dvt_public_source_1',
        path: 'models/sources/src_public.yml',
        metadata: {
          database: 'dvt',
          schema: 'public',
          tableName: 'source_1',
          rowCount: 3,
          columns: [
            { name: 'order_id', type: 'integer' },
            { name: 'customer', type: 'text' },
            { name: 'amount', type: 'numeric' },
          ],
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.metrics).toEqual([{ id: 'columns', label: 'Columns', value: '3' }]);
    expect(model.operationalMetrics).toEqual([]);
    expect(model.operationalDetail).toBeNull();
  });

  it('keeps imported source health details useful when byte-level metadata is recorded', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'src_local_postgres_dvt_public_source_1',
        path: 'models/sources/src_public.yml',
        metadata: {
          database: 'dvt',
          schema: 'public',
          tableName: 'source_1',
          sourceMetricEvidence: sourceMetricEvidence(1500),
          columns: [
            { name: 'order_id', type: 'integer' },
            { name: 'customer', type: 'text' },
            { name: 'amount', type: 'numeric' },
          ],
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.metrics).toEqual([{ id: 'columns', label: 'Columns', value: '3' }]);
    expect(model.operationalMetrics).toEqual([
      {
        id: 'rows',
        label: 'Rows',
        value: '1.5k',
        icon: 'rows',
        tone: 'warning',
        detail:
          '1,500 rows. Estimated using provider statistics. Confidence: medium. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
      {
        id: 'size',
        label: 'Size',
        value: '3.9 MB',
        icon: 'database',
        tone: 'success',
        detail:
          '4,096,000 B (3.9 MB). Measured using provider storage metadata. Physical allocation. Confidence: exact. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
    ]);
    expect(model.operationalDetail?.rows).toEqual([
      { id: 'columns', label: 'Columns', value: '3', icon: 'columns' },
      {
        id: 'dataset-size',
        label: 'Allocated size',
        value: '3.9 MB',
        icon: 'database',
        tone: 'success',
        detail:
          '4,096,000 B (3.9 MB). Measured using provider storage metadata. Physical allocation. Confidence: exact. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
      {
        id: 'observed-at',
        label: 'Observed',
        value: SOURCE_METRICS_OBSERVED_AT,
        icon: 'clock',
      },
    ]);
  });

  it('uses imported DVT source table metadata in the technical path', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'src_erp_orders',
        path: 'models/sources/src_erp.yml',
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

    expect(model.title).toBe('Warehouse · erp');
    expect(model.technicalName).toBe('src_erp_orders');
    expect(model.subtitle).toBe('warehouse.erp.orders');
    expect(model.path).toBe('models/sources/src_erp.yml');
  });

  it('adds DVT runtime metrics only from recorded metadata', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        role: 'transform',
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
    expect(model.accentTone).toBe('model');
    expect(model.metrics).toEqual([
      { id: 'columns', label: 'Columns', value: '0' },
      { id: 'status', label: 'Status', value: 'completed' },
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z' },
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'warnings', label: 'Warnings', value: '2' },
    ]);
    expect(model.operationalMetrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z', icon: 'clock' },
      { id: 'duration', label: 'Duration', value: '1m 15s', icon: 'timer' },
      { id: 'rows', label: 'Rows', value: '1.2k', icon: 'rows' },
    ]);
  });

  it('keeps DVT canonical runtime metrics on strategy-owned cards', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        role: 'transform',
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

  it('preserves running status as a first-class card tone', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        name: 'customer_rollup',
        status: 'running',
        metadata: {
          database: 'warehouse',
          schema: 'mart',
          table: 'customer_rollup',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.status).toEqual({ label: 'Running', tone: 'running' });
  });

  it('projects recorded running runtime status as a first-class card tone', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
        name: 'customer_rollup',
        metadata: {
          database: 'warehouse',
          schema: 'mart',
          table: 'customer_rollup',
          runStatus: 'running',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.status).toEqual({ label: 'Running', tone: 'running' });
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
    expect(model.accentTone).toBe('model');
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
          sourceMetricEvidence: sourceMetricEvidence(1500),
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
    expect(model.accentTone).toBe('source');
    expect(model.technicalName).toBe('src_erp_orders');
    expect(model.status).toEqual({ label: 'Ready', tone: 'success' });
    expect(model.subtitle).toBe('RAW.ERP.ORDERS');
    expect(model.path).toBe('RAW.ERP.ORDERS');
    expect(model.metrics).toEqual([{ id: 'columns', label: 'Columns', value: '2' }]);
    expect(model.operationalMetrics).toEqual([
      {
        id: 'rows',
        label: 'Rows',
        value: '1.5k',
        icon: 'rows',
        tone: 'warning',
        detail:
          '1,500 rows. Estimated using provider statistics. Confidence: medium. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
      {
        id: 'size',
        label: 'Size',
        value: '3.9 MB',
        icon: 'database',
        tone: 'success',
        detail:
          '4,096,000 B (3.9 MB). Measured using provider storage metadata. Physical allocation. Confidence: exact. Snapshot observed: 2026-07-10T21:00:00.000Z.',
      },
    ]);
  });

  it('uses the same DBT relation projection for title and path metadata', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:source',
        pluginId: 'dbt',
        name: 'src_erp_orders',
        metadata: {
          database: 'RAW',
          schema: 'ERP',
          config: {
            tableName: 'ORDERS',
          },
        },
      }),
      {},
      [dbtGraphNodeCardStrategy]
    );

    expect(model.title).toBe('Raw · ERP');
    expect(model.subtitle).toBe('RAW.ERP.ORDERS');
    expect(model.path).toBe('RAW.ERP.ORDERS');
  });

  it('uses recorded source refresh timestamps as source health evidence', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt',
        name: 'public.orders',
        metadata: {
          database: 'warehouse',
          schema: 'public',
          table: 'orders',
          lastRefreshAt: '2026-06-28T10:15:00Z',
          rowCount: 124000000,
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.operationalMetrics).toEqual([
      {
        id: 'last-refresh',
        label: 'Last refresh',
        value: '2026-06-28T10:15:00Z',
        icon: 'refresh',
      },
    ]);
    expect(model.operationalDetail).toBeNull();
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
    expect(model.accentTone).toBe('test');
  });
});
