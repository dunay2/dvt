import { describe, expect, it } from 'vitest';

import type { SourceObjectMetricEvidence } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import { dbtGraphNodeCardStrategy } from '../dbt/dbtGraphNodeCardStrategy';
import { dvtGraphNodeCardStrategy } from '../dvt/dvtGraphNodeCardStrategy';
import { buildGraphNodeCardReadModel } from './graphNodeCardReadModel';
import { defaultGraphNodeCardStrategy } from './defaultGraphNodeCardStrategy';

const SOURCE_METRICS_OBSERVED_AT = '2026-07-10T21:00:00.000Z';
const SPANISH_PRESENTATION_COPY = {
  columnsLabel: 'Columnas',
  declaredColumnsDetailTemplate: '{count} columnas declaradas',
  inheritedColumnsDetailTemplate: '{count} columnas heredadas',
  mixedColumnsDetailTemplate: '{declared} asignadas y {available} disponibles',
  noColumnsDetail: 'No hay columnas',
  codeLabel: 'Código',
  workspaceCodeDetailTemplate: 'Código en {path}',
  generatedCodeDetailTemplate: 'Código generado en {path}',
  codeUnavailableMessage: 'Código no disponible',
  draftStatusLabel: 'Borrador',
  valueLabels: {
    running: 'En ejecución',
    success: 'Correcto',
    failed: 'Fallido',
    skipped: 'Omitido',
  },
} as const;

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
    id:
      partial.pluginId === 'dvt.warehouse-source' && partial.name != null ? partial.name : 'node-1',
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
  it('keeps Code and Columns out of the compact upper metric row', () => {
    const presentationTruth = {
      columns: {
        declared: [{ name: 'order_id', type: 'integer', provenance: 'declared' as const }],
        inherited: [],
        visible: [{ name: 'order_id', type: 'integer', provenance: 'declared' as const }],
        declaredCount: 1,
        inheritedCount: 0,
        visibleCount: 1,
        visibleProvenance: 'declared' as const,
      },
      code: {
        kind: 'canonical' as const,
        content: '{}',
        language: 'json' as const,
        schemaVersion: 'dvt-substrait-semantic-document.v1',
        digest: 'a'.repeat(64),
      },
    };
    const cases = [
      {
        node: buildNode({ kind: 'dvt:transform', pluginId: 'dvt', role: 'transform' }),
        strategy: dvtGraphNodeCardStrategy,
      },
      {
        node: buildNode({ kind: 'dbt:model', pluginId: 'dbt', role: 'transform' }),
        strategy: dbtGraphNodeCardStrategy,
      },
      {
        node: buildNode({ kind: 'custom:node', pluginId: 'custom', role: 'transform' }),
        strategy: defaultGraphNodeCardStrategy,
      },
    ];

    for (const { node, strategy } of cases) {
      const model = buildGraphNodeCardReadModel(node, { presentationTruth }, [strategy]);
      expect(model.metrics.map((metric) => metric.id)).not.toContain('code');
      expect(model.metrics.map((metric) => metric.id)).not.toContain('columns');
    }
  });

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
    expect(model.health).toEqual({ label: 'Ready', tone: 'healthy' });
    expect(model.subtitle).toBe('warehouse.public.orders');
    expect(model.path).toBe('warehouse.public.orders');
    expect(model.metrics).toEqual([]);
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

    expect(model.metrics).toEqual([]);
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

    expect(model.metrics).toEqual([]);
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

  it('localizes imported source operational facts through the active Canvas language', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'src_local_postgres_dvt_public_source_1',
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
      { presentationCopy: { ...SPANISH_PRESENTATION_COPY, locale: 'es' } },
      [dvtGraphNodeCardStrategy]
    );

    expect(model.operationalMetrics).toEqual([
      {
        id: 'rows',
        label: 'Filas',
        value: '1.5k',
        icon: 'rows',
        tone: 'warning',
        detail:
          '1500 filas. Estimado mediante estadísticas del proveedor. Confianza: media. Instantánea observada: 2026-07-10T21:00:00.000Z.',
      },
      {
        id: 'size',
        label: 'Tamaño',
        value: '3,9 MB',
        icon: 'database',
        tone: 'success',
        detail:
          '4.096.000 B (3,9 MB). Medido mediante metadatos de almacenamiento del proveedor. Asignación física. Confianza: exacta. Instantánea observada: 2026-07-10T21:00:00.000Z.',
      },
    ]);
    expect(model.operationalDetail).toEqual({
      title: 'Estado de source_1',
      ariaLabel: 'Abrir métricas de estado de source_1',
      rows: [
        { id: 'columns', label: 'Columnas', value: '3', icon: 'columns' },
        {
          id: 'dataset-size',
          label: 'Tamaño asignado',
          value: '3,9 MB',
          icon: 'database',
          tone: 'success',
          detail:
            '4.096.000 B (3,9 MB). Medido mediante metadatos de almacenamiento del proveedor. Asignación física. Confianza: exacta. Instantánea observada: 2026-07-10T21:00:00.000Z.',
        },
        {
          id: 'observed-at',
          label: 'Observado',
          value: SOURCE_METRICS_OBSERVED_AT,
          icon: 'clock',
        },
      ],
    });
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

    expect(model.title).toBe('orders');
    expect(model.technicalName).toBe('src_erp_orders');
    expect(model.subtitle).toBe('warehouse.erp.orders');
    expect(model.path).toBe('models/sources/src_erp.yml');
  });

  it('uses an imported source renamed display name without changing its physical relation', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        id: 'src_local_postgres_dvt_dvt_outbox',
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'outbox2',
        metadata: {
          tableIdentifier: 'outbox',
          database: 'dvt',
          schema: 'dvt',
          tableName: 'outbox',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.title).toBe('outbox2');
    expect(model.subtitle).toBe('dvt.dvt.outbox');
  });

  it('projects a localized governed identity for an imported physical source table', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        name: 'src_erp_orders',
        metadata: {
          tableIdentifier: 'orders',
          database: 'analytics',
          connectionName: 'PostgreSQL local',
          schema: 'erp',
          databaseUser: 'warehouse_reader',
          credentialRef: 'postgres:must-not-leak',
        },
      }),
      { presentationCopy: { ...SPANISH_PRESENTATION_COPY, locale: 'es' } },
      [dvtGraphNodeCardStrategy]
    );

    expect(model.sourceIdentity).toEqual({
      ariaLabel: 'Ver identidad de origen de orders',
      rows: [
        { id: 'database', label: 'Base de datos', value: 'analytics' },
        { id: 'connection', label: 'Conexión', value: 'PostgreSQL local' },
        { id: 'schema', label: 'Esquema', value: 'erp' },
        { id: 'user', label: 'Usuario', value: 'warehouse_reader' },
      ],
    });
    expect(JSON.stringify(model)).not.toContain('postgres:must-not-leak');
  });

  it('does not invent source identity when one authoritative field is absent', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt.warehouse-source',
        metadata: {
          tableIdentifier: 'orders',
          database: 'analytics',
          connectionName: 'PostgreSQL local',
          schema: 'erp',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.sourceIdentity).toBeNull();
  });

  it('projects the same governed identity for a dbt-project-files source card', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:source',
        pluginId: 'dbt',
        name: 'orders',
        metadata: {
          tableIdentifier: 'orders',
          database: 'analytics',
          connectionName: 'Current production warehouse',
          schema: 'raw',
          databaseUser: 'warehouse_reader',
        },
      }),
      { presentationCopy: { ...SPANISH_PRESENTATION_COPY, locale: 'es' } },
      [dbtGraphNodeCardStrategy]
    );

    expect(model.sourceIdentity).toEqual({
      ariaLabel: 'Ver identidad de origen de orders',
      rows: [
        { id: 'database', label: 'Base de datos', value: 'analytics' },
        { id: 'connection', label: 'Conexión', value: 'Current production warehouse' },
        { id: 'schema', label: 'Esquema', value: 'raw' },
        { id: 'user', label: 'Usuario', value: 'warehouse_reader' },
      ],
    });
  });

  it('adds DVT runtime metrics only from recorded metadata', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
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

    expect(model.health).toEqual({ label: 'Completed', tone: 'healthy' });
    expect(model.accentTone).toBe('model');
    expect(model.metrics).toEqual([
      { id: 'status', label: 'Status', value: 'completed' },
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z' },
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'warnings', label: 'Warnings', value: '2' },
    ]);
    expect(model.operationalMetrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z', icon: 'clock' },
      { id: 'duration', label: 'Duration', value: '1m 15s', icon: 'timer' },
      {
        id: 'rows',
        label: 'Rows',
        value: '1.2k',
        detail: '1,210 rows.',
        icon: 'rows',
      },
      {
        id: 'size',
        label: 'Size',
        value: '2 KB',
        detail: '2,048 B (2 KB).',
        icon: 'database',
        tone: 'success',
      },
    ]);
  });

  it('marks Rows and Size as not calculated when only partial execution evidence exists', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
        pluginId: 'dvt',
        role: 'transform',
        name: 'customer_rollup',
        metadata: {
          lastRunAt: '2026-06-12T20:45:00Z',
        },
      }),
      {},
      [dvtGraphNodeCardStrategy]
    );

    expect(model.operationalMetrics).toEqual([
      { id: 'last-run', label: 'Last run', value: '2026-06-12T20:45:00Z', icon: 'clock' },
      { id: 'rows', label: 'Rows', value: 'Not calculated', icon: 'rows' },
      { id: 'size', label: 'Size', value: 'Not calculated', icon: 'database' },
    ]);
  });

  it.each([
    {
      locale: 'en',
      presentationCopy: undefined,
      rowsLabel: 'Rows',
      sizeLabel: 'Size',
      notCalculatedLabel: 'Not calculated',
    },
    {
      locale: 'es',
      presentationCopy: { ...SPANISH_PRESENTATION_COPY, locale: 'es' },
      rowsLabel: 'Filas',
      sizeLabel: 'Tamaño',
      notCalculatedLabel: 'No calculado',
    },
  ])(
    'reserves truthful uncalculated Rows and Size metrics for a DVT Transform in $locale',
    ({ presentationCopy, rowsLabel, sizeLabel, notCalculatedLabel }) => {
      const model = buildGraphNodeCardReadModel(
        buildNode({
          kind: 'dvt:transform',
          pluginId: 'dvt',
          role: 'transform',
          name: 'customer_rollup',
        }),
        presentationCopy == null ? {} : { presentationCopy },
        [dvtGraphNodeCardStrategy]
      );

      expect(model.operationalMetrics).toEqual([
        { id: 'rows', label: rowsLabel, value: notCalculatedLabel, icon: 'rows' },
        { id: 'size', label: sizeLabel, value: notCalculatedLabel, icon: 'database' },
      ]);
    }
  );

  it('keeps DVT canonical runtime metrics on strategy-owned cards', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
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
      { id: 'duration', label: 'Duration', value: '1m 15s' },
      { id: 'cost', label: 'Cost', value: '$0.42' },
    ]);
  });

  it('preserves canonical warning status when runtime status is not recorded', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
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

    expect(model.health).toEqual({ label: 'Warning', tone: 'neutral' });
  });

  it('preserves running status as a first-class card tone', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
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

    expect(model.health).toEqual({ label: 'Running', tone: 'neutral' });
  });

  it('projects recorded running runtime status as a first-class card tone', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
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

    expect(model.health).toEqual({ label: 'Running', tone: 'neutral' });
  });

  it('projects the current run task status instead of a stale editorial fallback', () => {
    const node = buildNode({
      id: 'transform-1',
      kind: 'dvt:transform',
      pluginId: 'dvt',
      role: 'transform',
      name: 'customer_rollup',
      metadata: {
        runStatus: 'completed',
      },
    });

    const model = buildGraphNodeCardReadModel(
      node,
      {
        presentationCopy: SPANISH_PRESENTATION_COPY,
        runStatusByNodeId: new Map([[node.id, 'running']]),
      },
      [dvtGraphNodeCardStrategy]
    );

    expect(model.health).toEqual({ label: 'En ejecución', tone: 'neutral' });
  });

  it('projects a successful current run task with localized operational copy', () => {
    const node = buildNode({
      id: 'sink-1',
      kind: 'dvt:sink',
      pluginId: 'dvt',
      role: 'output',
      name: 'orders_sink',
    });

    const model = buildGraphNodeCardReadModel(
      node,
      {
        presentationCopy: SPANISH_PRESENTATION_COPY,
        runStatusByNodeId: new Map([[node.id, 'success']]),
      },
      [dvtGraphNodeCardStrategy]
    );

    expect(model.health).toEqual({ label: 'Correcto', tone: 'healthy' });
  });

  it.each([
    ['failed', 'Fallido', 'failed'],
    ['skipped', 'Omitido', 'neutral'],
  ] as const)(
    'projects the localized %s status of the current run task',
    (runStatus, label, tone) => {
      const node = buildNode({
        id: 'transform-1',
        kind: 'dvt:transform',
        pluginId: 'dvt',
        role: 'transform',
        name: 'customer_rollup',
      });

      const model = buildGraphNodeCardReadModel(
        node,
        {
          presentationCopy: SPANISH_PRESENTATION_COPY,
          runStatusByNodeId: new Map([[node.id, runStatus]]),
        },
        [dvtGraphNodeCardStrategy]
      );

      expect(model.health).toEqual({ label, tone });
    }
  );

  it('does not project a runtime task status that belongs to another node', () => {
    const node = buildNode({
      id: 'transform-1',
      kind: 'dvt:transform',
      pluginId: 'dvt',
      role: 'transform',
      name: 'customer_rollup',
    });

    const model = buildGraphNodeCardReadModel(
      node,
      {
        presentationCopy: SPANISH_PRESENTATION_COPY,
        runStatusByNodeId: new Map([['transform-2', 'running']]),
      },
      [dvtGraphNodeCardStrategy]
    );

    expect(model.health).toEqual({ label: 'Borrador', tone: 'neutral' });
  });

  it('uses a DBT card strategy for model context instead of DVT table ownership', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:model',
        pluginId: 'dbt',
        name: 'fct_orders',
        description: 'Daily finance orders',
        tags: ['finance', 'critical'],
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

    expect(model.health).toEqual({ label: 'Draft', tone: 'neutral' });
    expect(model.accentTone).toBe('model');
    expect(model.subtitle).toBe('analytics');
    expect(model.path).toBe('models/marts/fct_orders.sql');
    expect(model.titleDetail).toBe('Daily finance orders · #finance #critical');
    expect(model.metrics).toEqual([
      { id: 'materialization', label: 'Mat.', value: 'incremental' },
      { id: 'dependencies', label: 'Deps', value: '2' },
    ]);
    expect(model.operationalMetrics).toEqual([
      { id: 'rows', label: 'Rows', value: 'Not calculated', icon: 'rows' },
      { id: 'size', label: 'Size', value: 'Not calculated', icon: 'database' },
    ]);
  });

  it('uses inherited presentation truth instead of reporting zero model columns', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:model',
        pluginId: 'dbt',
        role: 'transform',
        name: 'fct_orders',
      }),
      {
        presentationTruth: {
          columns: {
            declared: [],
            inherited: [
              {
                name: 'order_id',
                type: 'integer',
                provenance: 'inherited',
                sourceNodeId: 'source-orders',
              },
              {
                name: 'customer_id',
                type: 'text',
                provenance: 'inherited',
                sourceNodeId: 'source-orders',
              },
            ],
            visible: [
              { name: 'order_id', type: 'integer', provenance: 'inherited' },
              { name: 'customer_id', type: 'text', provenance: 'inherited' },
            ],
            declaredCount: 0,
            inheritedCount: 2,
            visibleCount: 2,
            visibleProvenance: 'inherited',
          },
          code: { kind: 'workspace-file', path: 'models/fct_orders.sql', language: 'sql' },
        },
        presentationCopy: {
          columnsLabel: 'Columns',
          declaredColumnsDetailTemplate: '{count} declared columns.',
          inheritedColumnsDetailTemplate: '{count} inherited columns.',
          mixedColumnsDetailTemplate: '{declared} mapped and {available} available columns.',
          noColumnsDetail: 'No columns.',
          codeLabel: 'Code',
          workspaceCodeDetailTemplate: 'Code lives at {path}.',
          generatedCodeDetailTemplate: 'Generated code at {path}.',
          codeUnavailableMessage: 'No code.',
        },
      },
      [dbtGraphNodeCardStrategy]
    );

    expect(model.metrics).toEqual([]);
  });

  it('keeps localized code posture in the inspector instead of the graph card header', () => {
    const baseData = {
      presentationCopy: {
        columnsLabel: 'Columnas',
        declaredColumnsDetailTemplate: '{count} columnas declaradas.',
        inheritedColumnsDetailTemplate: '{count} columnas heredadas.',
        mixedColumnsDetailTemplate: '{declared} asignadas y {available} disponibles.',
        noColumnsDetail: 'Sin columnas.',
        codeLabel: 'Código',
        workspaceCodeDetailTemplate: 'El código vive en {path}.',
        generatedCodeDetailTemplate: 'Código generado en {path}.',
        canonicalSubstraitCodeDetailTemplate:
          'Documento Substrait canónico {schemaVersion} · SHA-256 {digest}',
        codeUnavailableMessage: 'Sin código.',
        valueLabels: {
          authored: 'Escrito',
          generated: 'Generado',
          canonical: 'Canónico',
          file: 'Archivo',
        },
      },
    };
    const node = buildNode({
      kind: 'dbt:model',
      pluginId: 'dbt',
      role: 'transform',
      name: 'orders',
    });

    const generated = buildGraphNodeCardReadModel(
      node,
      {
        ...baseData,
        presentationTruth: {
          columns: {
            declared: [],
            inherited: [],
            visible: [],
            declaredCount: 0,
            inheritedCount: 0,
            visibleCount: 0,
            visibleProvenance: 'none',
          },
          code: {
            kind: 'generated',
            content: 'select * from raw_orders',
            path: 'models/orders.sql',
            language: 'sql',
          },
        },
      },
      [dbtGraphNodeCardStrategy]
    );
    const authored = buildGraphNodeCardReadModel(
      node,
      {
        ...baseData,
        presentationTruth: {
          columns: {
            declared: [],
            inherited: [],
            visible: [],
            declaredCount: 0,
            inheritedCount: 0,
            visibleCount: 0,
            visibleProvenance: 'none',
          },
          code: { kind: 'inline', content: 'select order_id from raw_orders', language: 'sql' },
        },
      },
      [dbtGraphNodeCardStrategy]
    );
    const fileBacked = buildGraphNodeCardReadModel(
      node,
      {
        ...baseData,
        presentationTruth: {
          columns: {
            declared: [],
            inherited: [],
            visible: [],
            declaredCount: 0,
            inheritedCount: 0,
            visibleCount: 0,
            visibleProvenance: 'none',
          },
          code: { kind: 'workspace-file', path: 'models/orders.sql', language: 'sql' },
        },
      },
      [dbtGraphNodeCardStrategy]
    );
    const canonical = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:transform',
        pluginId: 'dvt',
        role: 'transform',
        name: 'orders',
      }),
      {
        ...baseData,
        presentationTruth: {
          columns: {
            declared: [],
            inherited: [],
            visible: [],
            declaredCount: 0,
            inheritedCount: 0,
            visibleCount: 0,
            visibleProvenance: 'none',
          },
          code: {
            kind: 'canonical',
            content: '{"schemaVersion":"dvt-substrait-semantic-document.v1"}',
            language: 'json',
            schemaVersion: 'dvt-substrait-semantic-document.v1',
            digest: 'a'.repeat(64),
          },
        },
      },
      [dvtGraphNodeCardStrategy]
    );

    expect(generated.metrics).toEqual([]);
    expect(authored.metrics).toEqual([]);
    expect(fileBacked.metrics).toEqual([]);
    expect(canonical.metrics).toEqual([]);
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
    expect(model.health).toEqual({ label: 'Ready', tone: 'healthy' });
    expect(model.subtitle).toBe('RAW.ERP.ORDERS');
    expect(model.path).toBe('RAW.ERP.ORDERS');
    expect(model.metrics).toEqual([]);
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
      { id: 'duration', label: 'Duration', value: '9s' },
      { id: 'warnings', label: 'Warnings', value: '1' },
    ]);
    expect(model.accentTone).toBe('test');
  });
});
