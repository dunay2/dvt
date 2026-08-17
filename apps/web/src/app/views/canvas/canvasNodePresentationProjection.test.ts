import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtVisualTransformRecipe } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const source: CanonicalNode = {
  id: 'source.orders',
  name: 'Raw orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: { sourceName: 'raw', schemaName: 'raw', tableName: 'orders' },
    columns: [{ name: 'order_id', type: 'integer' }],
  },
};

const model: CanonicalNode = {
  id: 'model.orders',
  name: 'Orders model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { dbt: { materialized: 'view', selectedSourceId: source.id } },
};

const edge: CanonicalEdge = {
  id: 'source.orders->model.orders',
  sourceId: source.id,
  targetId: model.id,
  relation: 'lineage',
};

describe('projectCanvasNodePresentationTruth', () => {
  it('combines inherited columns and generated DBT code in one presentation DTO', () => {
    const truth = projectCanvasNodePresentationTruth({
      node: model,
      nodes: [source, model],
      edges: [edge],
    });

    expect(truth.columns).toMatchObject({
      visibleCount: 1,
      visibleProvenance: 'inherited',
    });
    expect(truth.code).toEqual({
      kind: 'generated',
      content:
        "{{ config(materialized='view') }}\n\nselect *\nfrom {{ source('raw', 'orders') }}\n",
      path: 'models/orders_model.sql',
      language: 'sql',
    });
  });

  it('preserves authored SQL as inline authority', () => {
    const authoredModel: CanonicalNode = {
      ...model,
      metadata: {
        ...model.metadata,
        config: { sql: "select order_id from {{ source('raw', 'orders') }}" },
      },
    };

    expect(
      projectCanvasNodePresentationTruth({
        node: authoredModel,
        nodes: [source, authoredModel],
        edges: [edge],
      }).code
    ).toEqual({
      kind: 'inline',
      content: "select order_id from {{ source('raw', 'orders') }}",
      language: 'sql',
    });
  });

  it('keeps unmapped inherited columns visible as visual-recipe mapping targets', () => {
    const sourceWithTwoColumns: CanonicalNode = {
      ...source,
      metadata: {
        ...source.metadata,
        columns: [
          { name: 'order_id', type: 'integer' },
          { name: 'customer_id', type: 'text' },
        ],
      },
    };
    const dvtModel: CanonicalNode = {
      ...model,
      id: 'transform.orders',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      metadata: {},
    };
    const mappedModel = applyDvtVisualTransformRecipe(dvtModel, {
      version: 'v1',
      outputs: [
        {
          id: 'output:order_id',
          name: 'order_id',
          dataType: 'integer',
          expression: {
            inputs: [{ nodeId: sourceWithTwoColumns.id, columnName: 'order_id' }],
            operations: [{ kind: 'passthrough' }],
          },
        },
      ],
      filters: [],
    });
    const dependency = { ...edge, targetId: mappedModel.id };

    const truth = projectCanvasNodePresentationTruth({
      node: mappedModel,
      nodes: [sourceWithTwoColumns, mappedModel],
      edges: [dependency],
    });

    expect(truth.columns.visible).toEqual([
      expect.objectContaining({ name: 'order_id', provenance: 'declared' }),
      expect.objectContaining({ name: 'customer_id', provenance: 'inherited' }),
    ]);
    expect(truth.columns.visibleProvenance).toBe('mixed');
  });

  it('projects visual recipe SQL as generated read-only code from the connected source binding', () => {
    const dvtSource: CanonicalNode = {
      id: 'source.orders',
      name: 'Raw orders',
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
          sourceObjectId: 'relation/warehouse/raw/orders',
        },
        schema: 'raw',
        tableName: 'orders',
        sourceName: 'raw_orders',
        columns: [{ name: 'order_id', type: 'integer' }],
      },
    };
    const dvtModel = applyDvtVisualTransformRecipe(
      {
        ...model,
        id: 'transform.orders',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        metadata: {},
      },
      {
        version: 'v1',
        outputs: [
          {
            id: 'output:order_id',
            name: 'order_id',
            dataType: 'integer',
            expression: {
              inputs: [{ nodeId: dvtSource.id, columnName: 'order_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      }
    );

    const truth = projectCanvasNodePresentationTruth({
      node: dvtModel,
      nodes: [dvtSource, dvtModel],
      edges: [{ ...edge, sourceId: dvtSource.id, targetId: dvtModel.id }],
    });

    expect(truth.code).toEqual({
      kind: 'generated',
      content: [
        'select',
        '  "raw_orders"."order_id" as "order_id"',
        'from "raw"."orders" as "raw_orders";',
        '',
      ].join('\n'),
      path: 'models/transform-orders.sql',
      language: 'sql',
    });
  });

  it('restores inherited mapping targets after the last visual output is removed', () => {
    const dvtModel = applyDvtVisualTransformRecipe(
      {
        ...model,
        id: 'transform.empty',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        metadata: {},
      },
      { version: 'v1', outputs: [], filters: [] }
    );

    const truth = projectCanvasNodePresentationTruth({
      node: dvtModel,
      nodes: [source, dvtModel],
      edges: [{ ...edge, targetId: dvtModel.id }],
    });

    expect(truth.columns).toMatchObject({
      visibleCount: 1,
      visibleProvenance: 'inherited',
    });
    expect(truth.columns.visible[0]).toMatchObject({
      name: 'order_id',
      provenance: 'inherited',
    });
  });
});
