import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  buildDbtAuthoringModelProjection,
  buildGeneratedDbtModelSqlPreview,
} from './dbtAuthoringFieldsModel';

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
      selectedOriginId: '',
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
    expect(projection.generatedModelSql).toBe("select *\nfrom {{ source('raw', 'orders') }}");
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
      selectedOriginId: '',
      kindLabels: {
        'dbt:source': 'Source',
        'dbt:model': 'Model',
      },
    });

    expect(projection.originOptions).toEqual([
      { value: 'warehouse-orders', label: 'Imported Orders (Source)' },
    ]);
    expect(projection.generatedModelSql).toBe(
      "select *\nfrom {{ source('warehouse_prod_analytics_erp', 'orders') }}"
    );
  });

  it('generates ref SQL from connected dbt model origins without React presentation state', () => {
    const upstreamModel = buildDbtModelNode('model-upstream', 'Customer Orders');
    const model = buildDbtModelNode();

    expect(
      buildGeneratedDbtModelSqlPreview({
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
        selectedOriginId: upstreamModel.id,
      })
    ).toBe("select *\nfrom {{ ref('customer_orders') }}");
  });
});
