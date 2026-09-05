import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectDbtProjectGraphToCanonicalCanvas } from './dbtProjectFileProjection';

function buildProjection(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'analytics-canvas',
      authority: { kind: 'dbt-project-files', projectRoot: '.' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: '.',
      projectName: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analyzedAt: '2026-07-13T10:00:00.000Z',
      analyzerVersion: 'dbt-cli-v1',
      dbtVersion: '1.10.0',
    },
    adapterType: 'postgres',
    executionTarget: {
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'analysis',
      credentialRef: 'env:DBT_PROFILES_DIR',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'local-postgres-proof',
        provider: 'postgres',
      },
      resolutionSource: 'environment-default',
    },
    analysisSha256: '2'.repeat(64),
    nodes: [
      {
        uniqueId: 'source.analytics.raw_orders',
        resourceType: 'source',
        name: 'raw_orders',
        identifier: 'raw-orders-physical',
        packageName: 'analytics',
        sourceName: 'raw',
        sourceIdentity: {
          database: 'analytics',
          connectionName: 'Current production warehouse',
          schema: 'raw',
          databaseUser: 'warehouse_reader',
        },
        originalFilePath: 'models/sources.yml',
        columns: [{ name: 'order_id', dataType: 'integer', description: 'Order key' }],
        tags: ['raw'],
        visualEditability: { status: 'editable', operations: ['edit-source'] },
      },
      {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        description: 'Warehouse orders ready for reporting',
        originalFilePath: 'models\\orders.sql',
        descriptionFilePath: 'models/schema.yml',
        materialized: 'table',
        columns: [{ name: 'order_id', dataType: 'integer' }],
        tags: ['mart'],
        visualEditability: {
          status: 'partially_editable',
          operations: ['edit-sql'],
          reasons: ['Jinja macro calls require code editing'],
        },
      },
      {
        uniqueId: 'seed.analytics.country_codes',
        resourceType: 'seed',
        name: 'country_codes',
        packageName: 'analytics',
        originalFilePath: 'seeds/country_codes.csv',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['Seed data is file-backed'] },
      },
      {
        uniqueId: 'snapshot.analytics.orders_snapshot',
        resourceType: 'snapshot',
        name: 'orders_snapshot',
        packageName: 'analytics',
        originalFilePath: 'snapshots/orders.sql',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['Snapshot uses Jinja config'] },
      },
      {
        uniqueId: 'test.analytics.not_null_orders_order_id',
        resourceType: 'test',
        name: 'not_null_orders_order_id',
        packageName: 'analytics',
        originalFilePath: 'models/orders.yml',
        columns: [],
        tags: [],
        testMetadata: {
          name: 'not_null',
          targetUniqueId: 'model.analytics.orders',
          columnName: 'order_id',
          severity: 'error',
        },
        visualEditability: { status: 'code_only', reasons: ['Generic test definition'] },
      },
      {
        uniqueId: 'exposure.analytics.orders_dashboard',
        resourceType: 'exposure',
        name: 'orders_dashboard',
        packageName: 'analytics',
        originalFilePath: 'models/exposures.yml',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['Exposure is YAML-backed'] },
      },
      {
        uniqueId: 'metric.analytics.order_count',
        resourceType: 'metric',
        name: 'order_count',
        packageName: 'analytics',
        originalFilePath: 'models/metrics.yml',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['Metric is YAML-backed'] },
      },
    ],
    edges: [
      {
        id: 'source-to-model',
        sourceUniqueId: 'source.analytics.raw_orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
      {
        id: 'test-to-model',
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'test.analytics.not_null_orders_order_id',
        relation: 'test_target',
      },
      {
        id: 'model-to-exposure',
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'exposure.analytics.orders_dashboard',
        relation: 'exposure',
      },
      {
        id: 'model-to-metric',
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'metric.analytics.order_count',
        relation: 'metric',
      },
    ],
    diagnostics: [],
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 5 },
  });
}

describe('projectDbtProjectGraphToCanonicalCanvas', () => {
  it('preserves all dbt resource identities, roles, paths, metadata, and edge semantics', () => {
    const projection = projectDbtProjectGraphToCanonicalCanvas(buildProjection());

    expect(
      projection.nodes.map(({ id, pluginId, kind, role }) => ({ id, pluginId, kind, role }))
    ).toEqual([
      { id: 'source.analytics.raw_orders', pluginId: 'dvt', kind: 'dvt:source', role: 'input' },
      { id: 'model.analytics.orders', pluginId: 'dvt', kind: 'dvt:transform', role: 'transform' },
      { id: 'seed.analytics.country_codes', pluginId: 'dbt', kind: 'dbt:seed', role: 'input' },
      {
        id: 'snapshot.analytics.orders_snapshot',
        pluginId: 'dbt',
        kind: 'dbt:snapshot',
        role: 'transform',
      },
      {
        id: 'test.analytics.not_null_orders_order_id',
        pluginId: 'dbt',
        kind: 'dbt:test',
        role: 'check',
      },
      {
        id: 'exposure.analytics.orders_dashboard',
        pluginId: 'dbt',
        kind: 'dbt:exposure',
        role: 'output',
      },
      { id: 'metric.analytics.order_count', pluginId: 'dbt', kind: 'dbt:metric', role: 'output' },
    ]);
    expect(projection.edges.map((edge) => edge.relation)).toEqual([
      'lineage',
      'validation',
      'consumption',
      'metric',
    ]);
    expect(projection.nodes[0]).toMatchObject({
      name: 'raw_orders',
      path: 'models/sources.yml',
      metadata: {
        tableIdentifier: 'raw-orders-physical',
        packageName: 'analytics',
        sourceName: 'raw',
        database: 'analytics',
        connectionName: 'Current production warehouse',
        schema: 'raw',
        databaseUser: 'warehouse_reader',
        columns: [{ name: 'order_id', type: 'integer', description: 'Order key' }],
        visualEditability: { status: 'editable' },
      },
    });
    expect(projection.nodes[1]).toMatchObject({
      path: 'models/orders.sql',
      description: 'Warehouse orders ready for reporting',
      metadata: { descriptionFilePath: 'models/schema.yml' },
    });
    expect(projection.nodes[4]?.metadata).toMatchObject({
      testType: 'not_null',
      testTarget: 'model.analytics.orders',
      testTargetColumn: 'order_id',
      severity: 'error',
      testMetadata: {
        name: 'not_null',
        targetUniqueId: 'model.analytics.orders',
        columnName: 'order_id',
        severity: 'error',
      },
    });
  });

  it('marks non-fresh and code-only resources as warnings without hiding diagnostics', () => {
    const source = buildProjection();
    const projection = projectDbtProjectGraphToCanonicalCanvas({
      ...source,
      freshness: 'invalid',
      diagnostics: [
        { code: 'dbt_project_invalid', severity: 'error', message: 'Compilation failed' },
      ],
      capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 5 },
    });

    expect(projection.nodes.every((node) => node.status === 'warn')).toBe(true);
    expect(projection.diagnostics).toEqual([
      { code: 'dbt_project_invalid', severity: 'error', message: 'Compilation failed' },
    ]);
    expect(projection.freshness).toBe('invalid');
  });
});
