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
    sourceName: 'warehouse_prod_analytics_erp',
    schema: 'erp',
    tableName: 'orders',
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
  metadata: {},
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
        body: "select *\nfrom {{ source('warehouse_prod_analytics_erp', 'orders') }}",
        content:
          "{{ config(materialized='table') }}\n\nselect *\nfrom {{ source('warehouse_prod_analytics_erp', 'orders') }}\n",
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

  it('uses authored SQL unchanged as the body consumed by the executable artifact', () => {
    const metadata = {
      ...createDbtNodeAuthoringMetadata(model),
      modelSql:
        "select order_id, amount\nfrom {{ source('warehouse_prod_analytics_erp', 'orders') }}",
    };

    const result = projectDbtModelArtifact({
      modelNode: model,
      nodes: [warehouseSource, model],
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
        body: "select *\nfrom {{ ref('staging_orders') }}",
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
      message: 'DBT model "Orders Model" must be connected to a source or model origin.',
    });
  });
});
