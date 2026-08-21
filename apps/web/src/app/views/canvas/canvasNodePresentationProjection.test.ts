import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtVisualTransformRecipe,
  convertDvtVisualTransformToSql,
} from './canvasDvtTransformAuthoringAuthority';
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
        "{{ config(materialized='view') }}\n\nselect\n  origin.\"order_id\" as \"order_id\"\nfrom {{ source('raw', 'orders') }} as origin\n",
      path: 'models/orders_model.sql',
      language: 'sql',
    });
  });

  it('projects source columns through a model onto a downstream snapshot', () => {
    const snapshot: CanonicalNode = {
      id: 'snapshot.orders',
      name: 'Orders snapshot',
      pluginId: 'dbt',
      kind: 'dbt:snapshot',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    };
    const modelToSnapshot: CanonicalEdge = {
      id: 'model.orders->snapshot.orders',
      sourceId: model.id,
      targetId: snapshot.id,
      relation: 'lineage',
    };

    const truth = projectCanvasNodePresentationTruth({
      node: snapshot,
      nodes: [source, model, snapshot],
      edges: [edge, modelToSnapshot],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 0,
      inheritedCount: 1,
      visibleCount: 1,
      visibleProvenance: 'inherited',
    });
    expect(truth.columns.visible).toEqual([
      expect.objectContaining({
        name: 'order_id',
        type: 'integer',
        provenance: 'inherited',
      }),
    ]);
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
        path: 'models/stale-visual-orders.sql',
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

  it('keeps converted SQL output identities for read-only lineage anchors', () => {
    const dvtModel = applyDvtVisualTransformRecipe(
      {
        ...model,
        id: 'transform.converted',
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
              inputs: [{ nodeId: source.id, columnName: 'order_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      }
    );
    const convertedModel = convertDvtVisualTransformToSql(
      dvtModel,
      'select order_id from raw.orders'
    );

    const truth = projectCanvasNodePresentationTruth({
      node: convertedModel,
      nodes: [source, convertedModel],
      edges: [{ ...edge, targetId: convertedModel.id }],
    });

    expect(truth.columns.visible).toEqual([
      expect.objectContaining({
        name: 'order_id',
        provenance: 'declared',
        reference: 'output:order_id',
      }),
    ]);
    expect(truth.code).toEqual({
      kind: 'inline',
      content: 'select order_id from raw.orders',
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

  it('projects the direct upstream effective schema onto an undeclared output', () => {
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
    const transform: CanonicalNode = {
      ...model,
      id: 'transform.orders',
      metadata: {},
    };
    const sink: CanonicalNode = {
      id: 'sink.orders',
      name: 'Orders sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {
        config: {
          schema: 'analytics',
          table: 'orders',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    };
    const edges: CanonicalEdge[] = [
      { ...edge, sourceId: sourceWithTwoColumns.id, targetId: transform.id },
      {
        ...edge,
        id: 'transform.orders->sink.orders',
        sourceId: transform.id,
        targetId: sink.id,
      },
    ];

    const truth = projectCanvasNodePresentationTruth({
      node: sink,
      nodes: [sourceWithTwoColumns, transform, sink],
      edges,
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 0,
      inheritedCount: 2,
      visibleCount: 2,
      visibleProvenance: 'inherited',
    });
    expect(truth.columns.visible).toEqual([
      expect.objectContaining({ name: 'order_id', type: 'integer', provenance: 'inherited' }),
      expect.objectContaining({ name: 'customer_id', type: 'text', provenance: 'inherited' }),
    ]);
  });

  it('keeps output-declared columns authoritative over the upstream schema', () => {
    const sink: CanonicalNode = {
      id: 'sink.orders',
      name: 'Orders sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {
        columns: [{ name: 'declared_id', type: 'uuid' }],
      },
    };

    const truth = projectCanvasNodePresentationTruth({
      node: sink,
      nodes: [source, sink],
      edges: [{ ...edge, targetId: sink.id }],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 1,
      inheritedCount: 1,
      visibleCount: 1,
      visibleProvenance: 'declared',
    });
    expect(truth.columns.visible[0]).toMatchObject({
      name: 'declared_id',
      provenance: 'declared',
    });
  });

  it('does not invent an output schema without a direct upstream node', () => {
    const sink: CanonicalNode = {
      id: 'sink.empty',
      name: 'Empty sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {},
    };

    const truth = projectCanvasNodePresentationTruth({
      node: sink,
      nodes: [source, sink],
      edges: [],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 0,
      inheritedCount: 0,
      visibleCount: 0,
      visibleProvenance: 'none',
    });
  });
});
