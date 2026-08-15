import {
  buildRelationalSourceObjectId,
  type SourceObjectColumn,
  type SourceObjectConstraint,
  type SourceObjectMetricEvidence,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  InvalidWarehouseSourceYamlError,
  buildWarehouseSourceYamlPath,
  buildWarehouseSourceYamlUpdates,
  groupSourceObjectsForYaml,
  readExistingSourceDocument,
  sourceObjectIdentity,
  type ConnectedRelationalSourceObject,
} from '../../../src/application/services/warehouseSourceYaml.js';

function measuredMetrics(): SourceObjectMetricEvidence {
  return {
    observedAt: '2026-07-10T21:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: 42,
      provenance: 'estimated',
      method: 'provider-statistics',
      confidence: 'medium',
    },
    byteSize: {
      value: 4096,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  };
}

function sourceObject(
  input: Readonly<{
    connectionId?: string;
    catalog?: string;
    schema?: string;
    name?: string;
    columns?: readonly SourceObjectColumn[];
    constraints?: readonly SourceObjectConstraint[];
  }> = {}
): ConnectedRelationalSourceObject {
  const locator = {
    kind: 'relation' as const,
    catalog: input.catalog ?? 'analytics',
    schema: input.schema ?? 'erp',
    name: input.name ?? 'orders',
    relationType: 'table' as const,
  };
  return {
    connectionId: input.connectionId ?? 'warehouse-prod',
    objectId: buildRelationalSourceObjectId(locator),
    displayName: locator.name,
    locator,
    metricEvidence: measuredMetrics(),
    ...(input.columns ? { columns: [...input.columns] } : {}),
    ...(input.constraints ? { constraints: [...input.constraints] } : {}),
  };
}

describe('warehouse source YAML projection', () => {
  it('qualifies YAML binding identity by connection and physical object', () => {
    const production = sourceObject({ connectionId: 'warehouse-prod' });
    const sandbox = sourceObject({ connectionId: 'warehouse-sandbox' });

    expect(sourceObjectIdentity(production)).not.toBe(sourceObjectIdentity(sandbox));
    expect(sourceObjectIdentity(production)).toContain('warehouse-prod');
    expect(sourceObjectIdentity(production)).toContain(production.objectId);
  });

  it('owns dbt source artifact naming and grouping policy in one descriptor', () => {
    const orders = sourceObject({ catalog: 'Raw Lake', schema: 'Sales/ERP Ops' });

    expect(DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR).toMatchObject({
      pluginId: 'dbt',
      artifactKind: 'dbt-source-yaml',
    });
    expect(buildWarehouseSourceYamlPath(orders, 'schema')).toBe(
      'models/sources/src_sales_erp_ops.yml'
    );
    expect(buildWarehouseSourceYamlPath(orders, 'database')).toBe(
      'models/sources/src_raw_lake.yml'
    );
  });

  it('assigns distinct paths when raw group values normalize to the same slug', () => {
    const sourceObjects = [
      sourceObject({ schema: 'Sales/ERP Ops', name: 'open_orders' }),
      sourceObject({ schema: 'Sales ERP Ops', name: 'closed_orders' }),
    ];

    const paths = Array.from(groupSourceObjectsForYaml(sourceObjects, 'schema').keys());

    expect(new Set(paths).size).toBe(2);
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^models\/sources\/src_sales_erp_ops_[a-f0-9]{8}\.yml$/),
      ])
    );
  });

  it('assigns distinct logical source keys when colliding schemas use separate YAML paths', () => {
    const updates = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map(),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: false,
      sourceObjects: [
        sourceObject({ schema: 'Sales/ERP Ops', name: 'orders' }),
        sourceObject({ schema: 'Sales ERP Ops', name: 'orders' }),
      ],
    });

    const logicalSourceKeys = updates.flatMap((update) =>
      readExistingSourceDocument(update.content).sources.flatMap((source) =>
        source.tables.map((table) => `${source.name}.${table.name}`)
      )
    );

    expect(updates).toHaveLength(2);
    expect(new Set(logicalSourceKeys)).toHaveLength(2);
  });

  it('keeps colliding physical schemas distinct when they are imported in separate batches', () => {
    const first = sourceObject({ schema: 'Sales/ERP Ops', name: 'open_orders' });
    const second = sourceObject({ schema: 'Sales ERP Ops', name: 'closed_orders' });
    const [firstUpdate] = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map(),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: false,
      sourceObjects: [first],
    });

    const [secondUpdate] = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map([[firstUpdate!.path, firstUpdate!.content]]),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: false,
      sourceObjects: [second],
    });

    const sources = readExistingSourceDocument(secondUpdate?.content).sources;
    expect(sources).toHaveLength(2);
    expect(new Set(sources.map((source) => source.name)).size).toBe(2);
    expect(sources.map((source) => source.schema)).toEqual(
      expect.arrayContaining(['Sales/ERP Ops', 'Sales ERP Ops'])
    );
  });

  it('projects columns, tests, and freshness into deterministic dbt source YAML', () => {
    const updates = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map(),
      databaseUser: 'warehouse_reader',
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: true,
      addFreshness: true,
      sourceObjects: [
        sourceObject({
          columns: [
            { name: 'id', type: 'integer', nullable: false },
            { name: 'notes', type: 'text', nullable: true },
          ],
          constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['id'] }],
        }),
      ],
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]?.path).toBe('models/sources/src_erp.yml');
    const document = readExistingSourceDocument(updates[0]?.content);
    expect(document.sources).toEqual([
      expect.objectContaining({
        name: 'warehouse_prod_analytics_erp',
        database: 'analytics',
        schema: 'erp',
        freshness: {
          warn_after: { count: 24, period: 'hour' },
          error_after: { count: 48, period: 'hour' },
        },
        tables: [
          expect.objectContaining({
            name: 'orders',
            columns: [
              expect.objectContaining({
                name: 'id',
                dataType: 'integer',
                tests: ['not_null', 'unique'],
              }),
              expect.objectContaining({ name: 'notes', dataType: 'text' }),
            ],
          }),
        ],
      }),
    ]);
    expect(document.sources[0]?.tables[0]?.metadata).toMatchObject({
      meta: {
        dvt_source_identity: {
          connection_id: 'warehouse-prod',
          database_user: 'warehouse_reader',
        },
      },
    });
  });

  it('preserves physical schema and relation identifiers behind stable dbt aliases', () => {
    const [update] = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map(),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: false,
      sourceObjects: [sourceObject({ schema: 'Sales Data', name: 'Order Lines' })],
    });

    const document = readExistingSourceDocument(update?.content);
    expect(document.sources[0]?.schema).toBe('Sales Data');
    expect(document.sources[0]?.tables[0]).toMatchObject({
      name: 'order_lines',
      identifier: 'Order Lines',
    });
  });

  it('does not generate false single-column unique tests for a composite primary key', () => {
    const [update] = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map(),
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: true,
      addFreshness: false,
      sourceObjects: [
        sourceObject({
          columns: [
            { name: 'tenant_id', type: 'uuid', nullable: false },
            { name: 'order_id', type: 'bigint', nullable: false },
          ],
          constraints: [
            {
              name: 'orders_pkey',
              kind: 'primary-key',
              columns: ['tenant_id', 'order_id'],
            },
          ],
        }),
      ],
    });

    const columns = readExistingSourceDocument(update?.content).sources[0]?.tables[0]?.columns;
    expect(columns).toEqual([
      expect.objectContaining({ name: 'tenant_id', tests: ['not_null'] }),
      expect.objectContaining({ name: 'order_id', tests: ['not_null'] }),
    ]);
  });

  it('preserves existing dbt metadata while adding a selected source object', () => {
    const path = 'models/sources/src_erp.yml';
    const existing = [
      'version: 2',
      'sources:',
      '  - name: warehouse_prod_analytics_erp',
      '    database: analytics',
      '    schema: erp',
      '    description: Maintained by analytics',
      '    meta:',
      '      owner: finance',
      '    tables:',
      '      - name: orders',
      '        description: Stable orders',
      '',
    ].join('\n');

    const [update] = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map([[path, existing]]),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: false,
      sourceObjects: [sourceObject({ name: 'customers' })],
    });

    expect(update?.content).toContain('description: Maintained by analytics');
    expect(update?.content).toContain('owner: finance');
    expect(update?.content).toContain('description: Stable orders');
    const document = readExistingSourceDocument(update?.content);
    expect(document.sources[0]?.tables.map((table) => table.name)).toEqual(['customers', 'orders']);
  });

  it('updates only the source owned by the selected connection', () => {
    const path = 'models/sources/src_erp.yml';
    const existing = [
      'version: 2',
      'sources:',
      '  - name: warehouse_prod_analytics_erp',
      '    database: analytics',
      '    schema: erp',
      '    tables:',
      '      - name: orders',
      '  - name: warehouse_sandbox_analytics_erp',
      '    database: analytics',
      '    schema: erp',
      '    tables:',
      '      - name: orders',
      '',
    ].join('\n');

    const [update] = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map([[path, existing]]),
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
      sourceObjects: [
        sourceObject({
          connectionId: 'warehouse-sandbox',
          columns: [{ name: 'id', type: 'integer', nullable: false }],
        }),
      ],
    });
    const document = readExistingSourceDocument(update?.content);
    const production = document.sources.find(
      (source) => source.name === 'warehouse_prod_analytics_erp'
    );
    const sandbox = document.sources.find(
      (source) => source.name === 'warehouse_sandbox_analytics_erp'
    );

    expect(production?.tables[0]?.columns).toEqual([]);
    expect(sandbox?.tables[0]?.columns).toEqual([
      expect.objectContaining({ name: 'id', dataType: 'integer' }),
    ]);
  });

  it('rejects malformed existing YAML instead of replacing it with an empty document', () => {
    expect(() => readExistingSourceDocument('version: 2\nsources:\n  - name: [')).toThrow(
      InvalidWarehouseSourceYamlError
    );
  });
});
