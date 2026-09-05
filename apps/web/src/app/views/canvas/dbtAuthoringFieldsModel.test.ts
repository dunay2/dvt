import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { buildDbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

function buildDbtSourceNode(id: string, name: string, sourceName: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dvt',
    kind: 'dvt:source',
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
      columns: [
        { name: 'order_id', type: 'bigint' },
        { name: 'customer', type: 'text' },
      ],
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
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-prod',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/dvt/erp/orders',
      },
      sourceName: 'warehouse_prod_analytics_erp',
      schema: 'erp',
      tableName: 'orders',
      columns: [
        { name: 'order_id', type: 'bigint' },
        { name: 'customer', type: 'text' },
      ],
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
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        materialized: 'view',
      },
      columns: [
        { name: 'order_id', type: 'bigint' },
        { name: 'customer', type: 'text' },
      ],
    },
  };
}

describe('dbtAuthoringFieldsModel', () => {
  it('uses the sole connected origin when no redundant selection metadata exists', () => {
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
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.selectedOriginId).toBe(source.id);
    expect(projection.modelArtifact?.origin.nodeId).toBe(source.id);
  });

  it('ignores stale selection metadata when one real connected origin remains', () => {
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
      authoringMetadata: {
        ...createDbtNodeAuthoringMetadata(model),
        selectedSourceId: 'detached-source',
      },
      kindLabels: {
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.selectedOriginId).toBe(source.id);
    expect(projection.modelArtifact?.origin.nodeId).toBe(source.id);
  });

  it('projects connected dbt origins in graph order and requires an explicit selection', () => {
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
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'source-a', label: 'Raw Orders (Source)' },
      { value: 'source-b', label: 'Staging Orders (Source)' },
    ]);
    expect(projection.selectedOriginId).toBe('');
    expect(projection.modelArtifact).toBeNull();
    expect(projection.projectionError).toBe(
      'DBT model "Orders Model" must select a connected source or model origin.'
    );
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
      authoringMetadata: {
        ...createDbtNodeAuthoringMetadata(model),
        selectedSourceId: source.id,
      },
      kindLabels: {
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'warehouse-orders', label: 'Imported Orders (Source)' },
    ]);
    expect(projection.modelArtifact?.body).toBe(
      'select\n  origin."order_id" as "order_id",\n  origin."customer" as "customer"\nfrom {{ source(\'warehouse_prod_analytics_erp\', \'orders\') }} as origin'
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
      authoringMetadata: {
        ...createDbtNodeAuthoringMetadata(model),
        selectedSourceId: source.id,
      },
      kindLabels: {
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'object-orders', label: 'Orders file load (Source)' },
    ]);
    expect(projection.selectedOriginId).toBe('object-orders');
    expect(projection.modelArtifact?.body).toBe(
      'select\n  origin."order_id" as "order_id"\nfrom {{ source(\'staging\', \'orders\') }} as origin'
    );
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
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.modelArtifact?.body).toBe(
      'select\n  origin."order_id" as "order_id",\n  origin."customer" as "customer"\nfrom {{ ref(\'customer_orders\') }} as origin'
    );
  });

  it('projects generated SQL even when legacy SQL metadata is present', () => {
    const source = buildDbtSourceNode('source-a', 'Raw Orders', 'raw');
    const baseModel = buildDbtModelNode();
    const model = {
      ...baseModel,
      metadata: {
        ...baseModel.metadata,
        config: { sql: "select order_id from {{ source('legacy', 'orders') }}" },
      },
    };
    const projection = buildDbtAuthoringModelProjection({
      node: model,
      nodes: [source, model],
      edges: [{ id: 'edge-a-model', sourceId: source.id, targetId: model.id, relation: 'lineage' }],
      authoringMetadata: {
        ...createDbtNodeAuthoringMetadata(model),
        selectedSourceId: source.id,
      },
      kindLabels: {
        'dvt:source': 'Source',
        'dvt:transform': 'Model',
      },
    });

    expect(projection.modelArtifact).toMatchObject({
      provenance: 'generated',
      path: 'models/orders_model.sql',
    });
    expect(projection.modelArtifact?.body).toContain("from {{ source('raw', 'orders') }}");
    expect(projection.modelArtifact?.body).not.toContain("source('legacy', 'orders')");
  });
});
