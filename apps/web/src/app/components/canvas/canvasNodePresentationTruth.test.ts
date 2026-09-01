import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasNodePresentationTruth } from './canvasNodePresentationTruth';

function buildNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'model.orders',
    name: 'Orders',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    ...overrides,
  };
}

const SOURCE = buildNode({
  id: 'source.orders',
  name: 'Raw orders',
  kind: 'dbt:source',
  role: 'input',
  path: 'models/sources.yml',
  metadata: {
    columns: [
      { name: 'order_id', type: 'integer', nullable: false, primaryKey: true },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'numeric' },
    ],
  },
});

const EDGE: CanonicalEdge = {
  id: 'source.orders->model.orders',
  sourceId: SOURCE.id,
  targetId: 'model.orders',
  relation: 'lineage',
};

describe('buildCanvasNodePresentationTruth', () => {
  it('keeps inherited columns distinct while exposing one shared visible count', () => {
    const model = buildNode({ path: 'models/orders.sql' });

    const truth = buildCanvasNodePresentationTruth({
      node: model,
      nodes: [SOURCE, model],
      edges: [EDGE],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 0,
      inheritedCount: 3,
      visibleCount: 3,
      visibleProvenance: 'inherited',
    });
    expect(truth.columns.visible.map((column) => column.name)).toEqual([
      'order_id',
      'customer_id',
      'amount',
    ]);
    expect(truth.columns.visible[0]).toMatchObject({ nullable: false, primaryKey: true });
  });

  it('preserves declared columns as authoritative without hiding inherited context', () => {
    const model = buildNode({
      metadata: {
        columns: [
          { name: 'order_id', dataType: 'bigint' },
          { name: 'gross_amount', type: 'numeric' },
        ],
      },
    });

    const truth = buildCanvasNodePresentationTruth({
      node: model,
      nodes: [SOURCE, model],
      edges: [EDGE],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 2,
      inheritedCount: 3,
      visibleCount: 2,
      visibleProvenance: 'declared',
    });
    expect(truth.columns.visible.map((column) => column.name)).toEqual([
      'order_id',
      'gross_amount',
    ]);
  });

  it('reports a workspace file as code authority instead of claiming code is missing', () => {
    const model = buildNode({ path: 'models/orders.sql' });

    expect(
      buildCanvasNodePresentationTruth({ node: model, nodes: [model], edges: [] }).code
    ).toEqual({
      kind: 'workspace-file',
      path: 'models/orders.sql',
      language: 'sql',
    });
  });

  it('prefers canonical workspace-file identity over duplicated graph SQL metadata', () => {
    const model = buildNode({
      path: 'models/orders.sql',
      metadata: {
        sql: 'select * from stale_orders',
        config: { sql: 'select * from raw_orders' },
      },
    });

    expect(
      buildCanvasNodePresentationTruth({ node: model, nodes: [model], edges: [] }).code
    ).toEqual({
      kind: 'workspace-file',
      path: 'models/orders.sql',
      language: 'sql',
    });
  });

  it('exposes generated code with provenance when no inline or workspace authority exists', () => {
    const model = buildNode();

    expect(
      buildCanvasNodePresentationTruth({
        node: model,
        nodes: [model],
        edges: [],
        generatedCode: {
          content: "select *\nfrom {{ ref('raw_orders') }}",
          path: 'models/orders.sql',
          language: 'sql',
        },
      }).code
    ).toEqual({
      kind: 'generated',
      content: "select *\nfrom {{ ref('raw_orders') }}",
      path: 'models/orders.sql',
      language: 'sql',
    });
  });
});
