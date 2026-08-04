import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { buildDbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

function buildDbtSourceNode(id: string, name: string, sourceName: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dbt',
    kind: 'dbt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        sourceName,
        schemaName: 'raw',
        tableName: 'orders',
      },
    },
  };
}

function buildWarehouseSourceNode(id: string, name: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      sourceName: 'warehouse_prod_analytics_erp',
      schema: 'erp',
      tableName: 'orders',
    },
  };
}

function buildObjectFileLoadNode(id: string, name: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dvt.object-file-postgres',
    kind: 'dvt:object_file_load',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      objectFilePostgres: {
        source: {
          storageUri: `s3://fixtures/tenants/tenant/${'a'.repeat(64)}`,
          sha256: 'a'.repeat(64),
          sizeBytes: 128,
          maxBytes: 1024,
          format: 'csv',
          mediaType: 'text/csv',
          encoding: 'utf-8',
          credentialRef: 'object-store:fixture',
          header: true,
          delimiter: ',',
        },
        target: {
          dialect: 'postgres',
          schema: 'staging',
          relation: 'orders',
          loadMode: 'replace',
          credentialRef: 'postgres:target',
        },
        columns: [
          {
            sourceField: 'order_id',
            targetColumn: 'order_id',
            dataType: 'bigint',
            nullable: false,
          },
        ],
      },
    },
  };
}

function buildDbtModelNode(id = 'model-orders', name = 'Orders Model'): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        materialized: 'view',
      },
    },
  };
}

describe('dbtAuthoringFieldsModel', () => {
  it('projects connected dbt origins in graph order and selects the first origin by default', () => {
    const sourceA = buildDbtSourceNode('source-a', 'Raw Orders', 'raw');
    const sourceB = buildDbtSourceNode('source-b', 'Staging Orders', 'staging');
    const model = buildDbtModelNode();
    const edges: readonly CanonicalEdge[] = [
      { id: 'edge-a-model', sourceId: sourceA.id, targetId: model.id, relation: 'lineage' },
      { id: 'edge-b-model', sourceId: sourceB.id, targetId: model.id, relation: 'lineage' },
    ];

    const projection = buildDbtAuthoringModelProjection({
      node: model,
      nodes: [sourceA, sourceB, model],
      edges,
      authoringMetadata: createDbtNodeAuthoringMetadata(model),
      kindLabels: {
        'dbt:source': 'Source',
        'dbt:model': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'source-a', label: 'Raw Orders (Source)' },
      { value: 'source-b', label: 'Staging Orders (Source)' },
    ]);
    expect(projection.selectedOriginId).toBe('source-a');
    expect(projection.modelArtifact).toMatchObject({
      provenance: 'generated',
      body: "select *\nfrom {{ source('raw', 'orders') }}",
    });
  });

  it('projects connected warehouse-source origins as dbt source candidates', () => {
    const source = buildWarehouseSourceNode('warehouse-orders', 'Imported Orders');
    const model = buildDbtModelNode();

    const projection = buildDbtAuthoringModelProjection({
      node: model,
      nodes: [source, model],
      edges: [
        {
          id: 'edge-warehouse-model',
          sourceId: source.id,
          targetId: model.id,
          relation: 'lineage',
        },
      ],
      authoringMetadata: createDbtNodeAuthoringMetadata(model),
      kindLabels: {
        'dbt:source': 'Source',
        'dbt:model': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'warehouse-orders', label: 'Imported Orders (Source)' },
    ]);
    expect(projection.modelArtifact?.body).toBe(
      "select *\nfrom {{ source('warehouse_prod_analytics_erp', 'orders') }}"
    );
  });

  it('projects a connected object-file load as the exact PostgreSQL staging origin', () => {
    const source = buildObjectFileLoadNode('object-orders', 'Orders file load');
    const model = buildDbtModelNode();

    const projection = buildDbtAuthoringModelProjection({
      node: model,
      nodes: [source, model],
      edges: [
        {
          id: 'edge-object-model',
          sourceId: source.id,
          targetId: model.id,
          relation: 'lineage',
        },
      ],
      authoringMetadata: createDbtNodeAuthoringMetadata(model),
      kindLabels: {
        'dbt:source': 'Source',
        'dbt:model': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'object-orders', label: 'Orders file load (Source)' },
    ]);
    expect(projection.selectedOriginId).toBe('object-orders');
    expect(projection.modelArtifact?.body).toBe("select *\nfrom {{ source('staging', 'orders') }}");
  });

  it('generates ref SQL from connected dbt model origins without React presentation state', () => {
    const upstreamModel = buildDbtModelNode('model-upstream', 'Customer Orders');
    const model = buildDbtModelNode();

    const projection = buildDbtAuthoringModelProjection({
      node: model,
      nodes: [upstreamModel, model],
      edges: [
        {
          id: 'edge-upstream-model',
          sourceId: upstreamModel.id,
          targetId: model.id,
          relation: 'lineage',
        },
      ],
      authoringMetadata: {
        ...createDbtNodeAuthoringMetadata(model),
        selectedSourceId: upstreamModel.id,
      },
      kindLabels: {
        'dbt:source': 'Source',
        'dbt:model': 'Model',
      },
    });

    expect(projection.modelArtifact?.body).toBe("select *\nfrom {{ ref('customer_orders') }}");
  });

  it('projects authored SQL through the same artifact used by execution', () => {
    const source = buildDbtSourceNode('source-a', 'Raw Orders', 'raw');
    const model = buildDbtModelNode();
    const projection = buildDbtAuthoringModelProjection({
      node: model,
      nodes: [source, model],
      edges: [{ id: 'edge-a-model', sourceId: source.id, targetId: model.id, relation: 'lineage' }],
      authoringMetadata: {
        ...createDbtNodeAuthoringMetadata(model),
        modelSql: "select order_id from {{ source('raw', 'orders') }}",
      },
      kindLabels: {
        'dbt:source': 'Source',
        'dbt:model': 'Model',
      },
    });

    expect(projection.modelArtifact).toMatchObject({
      provenance: 'authored',
      body: "select order_id from {{ source('raw', 'orders') }}",
      path: 'models/orders_model.sql',
    });
  });
});
