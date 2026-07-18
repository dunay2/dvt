import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
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
});
