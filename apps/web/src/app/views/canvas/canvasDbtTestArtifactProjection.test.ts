import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtTestArtifact } from './canvasDbtTestArtifactProjection';

const modelNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { dbt: { packageName: 'analytics', materialized: 'view' } },
};

const testNode: CanonicalNode = {
  id: 'test-orders-key',
  name: 'Orders key required',
  pluginId: 'dbt',
  kind: 'dbt:test',
  role: 'check',
  status: 'idle',
  tags: [],
  metadata: {
    dbtTest: {
      testType: 'not_null',
      targetModelId: modelNode.id,
      targetColumn: 'order_id',
      severity: 'error',
    },
  },
};

const edge: CanonicalEdge = {
  id: 'edge-model-test',
  sourceId: modelNode.id,
  targetId: testNode.id,
  relation: 'validation',
};

describe('canvas DBT test artifact projection', () => {
  it('projects a connected generic test with a stable DBT selector', () => {
    expect(
      projectDbtTestArtifact({ testNode, nodes: [modelNode, testNode], edges: [edge] })
    ).toEqual({
      ok: true,
      artifact: {
        testNodeId: testNode.id,
        targetModelId: modelNode.id,
        modelName: 'orders_model',
        columnName: 'order_id',
        testType: 'not_null',
        severity: 'error',
        selector: 'test_orders_key',
      },
    });
  });

  it('fails closed when the configured target is not connected', () => {
    expect(
      projectDbtTestArtifact({
        testNode: {
          ...testNode,
          metadata: {
            dbtTest: {
              testType: 'not_null',
              targetModelId: 'model-other',
              targetColumn: 'order_id',
              severity: 'error',
            },
          },
        },
        nodes: [modelNode, testNode],
        edges: [edge],
      })
    ).toEqual({
      ok: false,
      message: 'DBT test "Orders key required" targets a model that is not connected.',
    });
  });

  it('fails closed when test semantics are incomplete', () => {
    expect(
      projectDbtTestArtifact({
        testNode: { ...testNode, metadata: undefined },
        nodes: [modelNode, testNode],
        edges: [edge],
      })
    ).toEqual({
      ok: false,
      message: 'DBT test "Orders key required" requires a valid target column.',
    });
  });
});
