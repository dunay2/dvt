import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';

const warehouseSource: CanonicalNode = {
  id: 'warehouse-orders',
  name: 'Warehouse Orders',
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
      { name: 'customer"label', type: 'text' },
    ],
  },
};

const objectFileLoad: CanonicalNode = {
  id: 'load-orders',
  name: 'Load orders',
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
        sizeBytes: 62,
        maxBytes: 1_000,
        encoding: 'utf-8',
        format: 'csv',
        mediaType: 'text/csv',
        header: true,
        delimiter: ',',
        credentialRef: 'object-store:fixture',
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

const upstreamModel: CanonicalNode = {
  id: 'stg-orders',
  name: 'Staging Orders',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [
      { name: 'order_id', type: 'bigint' },
      { name: 'customer', type: 'text' },
    ],
  },
};

const model: CanonicalNode = {
  id: 'orders-model',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: {
      packageName: 'analytics',
      materialized: 'table',
      selectedSourceId: warehouseSource.id,
    },
  },
};

function edge(sourceId: string): CanonicalEdge {
  return {
    id: `${sourceId}->${model.id}`,
    sourceId,
    targetId: model.id,
    relation: 'lineage',
  };
}

describe('canvas DBT model artifact projection', () => {
  it('projects the exact object-file staging relation as a DBT source', () => {
    const modelFromObject = {
      ...model,
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'table',
          selectedSourceId: objectFileLoad.id,
        },
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: modelFromObject,
        nodes: [objectFileLoad, modelFromObject],
        edges: [edge(objectFileLoad.id)],
      })
    ).toMatchObject({
      ok: true,
      artifact: {
        body: 'select\n  origin."order_id" as "order_id"\nfrom {{ source(\'staging\', \'orders\') }} as origin',
        origin: {
          nodeId: objectFileLoad.id,
          sql: "{{ source('staging', 'orders') }}",
        },
        source: {
          sourceName: 'staging',
          schemaName: 'staging',
          tableName: 'orders',
        },
      },
    });
  });

  it('projects one generated artifact with explicit provenance from a warehouse source', () => {
    expect(
      projectDbtModelArtifact({
        modelNode: model,
        nodes: [warehouseSource, model],
        edges: [edge(warehouseSource.id)],
      })
    ).toEqual({
      ok: true,
      artifact: {
        modelNodeId: model.id,
        name: 'orders_model',
        path: 'models/orders_model.sql',
        language: 'sql',
        materialized: 'table',
        provenance: 'generated',
        outputColumns: ['order_id', 'customer"label'],
        body: 'select\n  origin."order_id" as "order_id",\n  origin."customer""label" as "customer""label"\nfrom {{ source(\'warehouse_prod_analytics_erp\', \'orders\') }} as origin',
        content:
          '{{ config(materialized=\'table\') }}\n\nselect\n  origin."order_id" as "order_id",\n  origin."customer""label" as "customer""label"\nfrom {{ source(\'warehouse_prod_analytics_erp\', \'orders\') }} as origin\n',
        origin: {
          nodeId: warehouseSource.id,
          sql: "{{ source('warehouse_prod_analytics_erp', 'orders') }}",
        },
        source: {
          sourceName: 'warehouse_prod_analytics_erp',
          schemaName: 'erp',
          tableName: 'orders',
        },
      },
    });
  });

  it('generates only enabled model columns in their recorded order', () => {
    const selectedModel: CanonicalNode = {
      ...model,
      metadata: {
        ...model.metadata,
        dbt: {
          ...(model.metadata?.dbt as Record<string, unknown>),
          projectionColumns: [
            { name: 'customer"label', output: true },
            { name: 'order_id', output: false },
          ],
        },
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: selectedModel,
        nodes: [warehouseSource, selectedModel],
        edges: [edge(warehouseSource.id)],
      })
    ).toMatchObject({
      ok: true,
      artifact: {
        body: 'select\n  origin."customer""label" as "customer""label"\nfrom {{ source(\'warehouse_prod_analytics_erp\', \'orders\') }} as origin',
      },
    });
  });

  it('fails closed when a warehouse source has no canonical connected-source binding', () => {
    const sourceWithoutBinding = {
      ...warehouseSource,
      metadata: {
        sourceName: 'warehouse_prod_analytics_erp',
        schema: 'erp',
        tableName: 'orders',
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: model,
        nodes: [sourceWithoutBinding, model],
        edges: [edge(sourceWithoutBinding.id)],
      })
    ).toEqual({
      ok: false,
      reason: 'origin_metadata_unavailable',
      message:
        'DBT source origin "Warehouse Orders" does not expose a valid connected source binding.',
    });
  });

  it('fails closed when a warehouse source uses an unsupported connection provider', () => {
    const sourceWithUnsupportedProvider = {
      ...warehouseSource,
      metadata: {
        ...warehouseSource.metadata,
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-snowflake',
            provider: 'snowflake',
          },
          sourceObjectId: 'relation/dvt/erp/orders',
        },
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: model,
        nodes: [sourceWithUnsupportedProvider, model],
        edges: [edge(sourceWithUnsupportedProvider.id)],
      })
    ).toEqual({
      ok: false,
      reason: 'origin_metadata_unavailable',
      message:
        'DBT source origin "Warehouse Orders" uses unsupported connection provider "snowflake".',
    });
  });

  it('fails closed instead of accepting legacy source-object identity alongside the binding', () => {
    const sourceWithLegacyIdentity = {
      ...warehouseSource,
      metadata: {
        ...warehouseSource.metadata,
        sourceObjectId: 'relation/dvt/erp/orders',
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: model,
        nodes: [sourceWithLegacyIdentity, model],
        edges: [edge(sourceWithLegacyIdentity.id)],
      })
    ).toEqual({
      ok: false,
      reason: 'origin_metadata_unavailable',
      message:
        'DBT source origin "Warehouse Orders" does not expose a valid connected source binding.',
    });
  });

  it('uses authored SQL unchanged as the body consumed by the executable artifact', () => {
    const sourceWithoutColumns = {
      ...warehouseSource,
      metadata: {
        ...warehouseSource.metadata,
        columns: undefined,
      },
    };
    const metadata = {
      ...createDbtNodeAuthoringMetadata(model),
      modelSql:
        "select order_id, amount\nfrom {{ source('warehouse_prod_analytics_erp', 'orders') }}",
    };

    const result = projectDbtModelArtifact({
      modelNode: model,
      nodes: [sourceWithoutColumns, model],
      edges: [edge(warehouseSource.id)],
      authoringMetadata: metadata,
    });

    expect(result).toMatchObject({
      ok: true,
      artifact: {
        provenance: 'authored',
        body: metadata.modelSql,
        content: `{{ config(materialized='table') }}\n\n${metadata.modelSql}\n`,
      },
    });
  });

  it('projects a connected DBT model origin through ref without duplicating origin logic', () => {
    const result = projectDbtModelArtifact({
      modelNode: {
        ...model,
        metadata: {
          dbt: {
            packageName: 'analytics',
            materialized: 'view',
            selectedSourceId: upstreamModel.id,
          },
        },
      },
      nodes: [upstreamModel, model],
      edges: [edge(upstreamModel.id)],
    });

    expect(result).toMatchObject({
      ok: true,
      artifact: {
        materialized: 'view',
        body: 'select\n  origin."order_id" as "order_id",\n  origin."customer" as "customer"\nfrom {{ ref(\'staging_orders\') }} as origin',
        origin: {
          nodeId: upstreamModel.id,
          sql: "{{ ref('staging_orders') }}",
        },
      },
    });
  });

  it('fails closed when no compatible origin is connected', () => {
    expect(
      projectDbtModelArtifact({
        modelNode: model,
        nodes: [model],
        edges: [],
      })
    ).toEqual({
      ok: false,
      reason: 'origin_required',
      message: 'DBT model "Orders Model" must select a connected source or model origin.',
    });
  });

  it('fails closed when generated SQL has no canonical origin columns', () => {
    const sourceWithoutColumns = {
      ...warehouseSource,
      metadata: {
        ...warehouseSource.metadata,
        columns: undefined,
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: model,
        nodes: [sourceWithoutColumns, model],
        edges: [edge(sourceWithoutColumns.id)],
      })
    ).toEqual({
      ok: false,
      reason: 'origin_columns_unavailable',
      message: 'DBT model origin "Warehouse Orders" does not expose canonical columns.',
    });
  });

  it('uses the only compatible incoming edge without a duplicate selected-source field', () => {
    const unselectedModel = {
      ...model,
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'table',
          selectedSourceId: '',
        },
      },
    };

    expect(
      projectDbtModelArtifact({
        modelNode: unselectedModel,
        nodes: [warehouseSource, unselectedModel],
        edges: [edge(warehouseSource.id)],
      })
    ).toMatchObject({
      ok: true,
      artifact: {
        origin: {
          nodeId: warehouseSource.id,
          sql: "{{ source('warehouse_prod_analytics_erp', 'orders') }}",
        },
      },
    });
  });

  it('does not fall back to edge order when an origin was not explicitly selected', () => {
    expect(
      projectDbtModelArtifact({
        modelNode: {
          ...model,
          metadata: {
            dbt: {
              packageName: 'analytics',
              materialized: 'table',
              selectedSourceId: '',
            },
          },
        },
        nodes: [warehouseSource, objectFileLoad, model],
        edges: [edge(warehouseSource.id), edge(objectFileLoad.id)],
      })
    ).toEqual({
      ok: false,
      reason: 'origin_required',
      message: 'DBT model "Orders Model" must select a connected source or model origin.',
    });
  });
});
