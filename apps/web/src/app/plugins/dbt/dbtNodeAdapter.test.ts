import { describe, expect, it } from 'vitest';

import { DBT_DRAG_MIME_TYPE, dbtCanvasGraphStrategy } from './dbtNodeAdapter';

function buildDbtNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'model.orders',
    name: 'orders',
    type: 'MODEL',
    package: 'analytics',
    path: 'models/orders.sql',
    tags: ['mart'],
    status: 'idle',
    dependencies: ['source.raw.orders'],
    ...overrides,
  };
}

function buildDbtEdge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'edge.orders.customers',
    source: 'source.raw.orders',
    target: 'model.orders',
    type: 'ref',
    ...overrides,
  };
}

function buildDataTransfer(payload: Record<string, unknown>): DataTransfer {
  return {
    getData: (mimeType: string) => (mimeType === DBT_DRAG_MIME_TYPE ? JSON.stringify(payload) : ''),
  } as DataTransfer;
}

describe('dbtCanvasGraphStrategy', () => {
  it('rejects DBT nodes whose type is outside the DBT node vocabulary', () => {
    expect(dbtCanvasGraphStrategy.mapNodeToCanonical(buildDbtNode({ type: 'BROKEN' }))).toBeNull();
  });

  it('rejects DBT nodes whose status is outside the canonical node status vocabulary', () => {
    expect(
      dbtCanvasGraphStrategy.mapNodeToCanonical(buildDbtNode({ status: 'paused' }))
    ).toBeNull();
  });

  it('rejects DBT edges whose type is outside the DBT edge vocabulary', () => {
    expect(
      dbtCanvasGraphStrategy.mapEdgeToCanonical(buildDbtEdge({ type: 'teleport' }))
    ).toBeNull();
  });

  it('rejects malformed DBT drag payloads before projecting them to canonical nodes', () => {
    expect(
      dbtCanvasGraphStrategy.parseDropPayload(buildDataTransfer(buildDbtNode({ type: 'BROKEN' })))
    ).toBeNull();
  });

  it('projects not-null dbt test targets into canonical metadata', () => {
    const node = dbtCanvasGraphStrategy.mapNodeToCanonical(
      buildDbtNode({
        id: 'test_not_null_store_id',
        name: 'test_not_null_store_id',
        type: 'TEST',
        dependencies: ['dim_store'],
        compiledSql: "SELECT * FROM {{ ref('dim_store') }} WHERE store_id IS NULL",
      })
    );

    expect(node?.metadata).toMatchObject({
      testType: 'not_null',
      testTargetModel: 'dim_store',
      testTargetColumn: 'store_id',
      testTarget: 'dim_store.store_id',
    });
  });

  it('projects unique dbt test targets into canonical metadata', () => {
    const node = dbtCanvasGraphStrategy.mapNodeToCanonical(
      buildDbtNode({
        id: 'test_unique_order_id',
        name: 'test_unique_order_id',
        type: 'TEST',
        dependencies: ['stg_orders'],
        compiledSql:
          "SELECT order_id, COUNT(*) as cnt FROM {{ ref('stg_orders') }} GROUP BY order_id HAVING COUNT(*) > 1",
      })
    );

    expect(node?.metadata).toMatchObject({
      testType: 'unique',
      testTargetModel: 'stg_orders',
      testTargetColumn: 'order_id',
      testTarget: 'stg_orders.order_id',
    });
  });
});
