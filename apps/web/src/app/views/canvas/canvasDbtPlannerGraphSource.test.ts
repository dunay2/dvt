import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  buildDbtPlannerGraphSource,
  resolveDbtExecutionScopeNodeIds,
} from './canvasDbtPlannerGraphSource';

const sourceNode: CanonicalNode = {
  id: 'source-orders',
  name: 'Raw Orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: ['raw'],
};

const modelNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: ['mart'],
  metadata: {
    dbt: {
      selectedSourceId: 'source-orders',
    },
  },
};

const testNode: CanonicalNode = {
  id: 'test-orders',
  name: 'Orders Not Null',
  pluginId: 'dbt',
  kind: 'dbt:test',
  role: 'check',
  status: 'idle',
  tags: [],
};

const macroNode: CanonicalNode = {
  id: 'macro-format',
  name: 'Format Macro',
  pluginId: 'dbt',
  kind: 'dbt:macro',
  role: 'control',
  status: 'idle',
  tags: [],
};

const edges: CanonicalEdge[] = [
  {
    id: 'edge-source-model',
    sourceId: 'source-orders',
    targetId: 'model-orders',
    relation: 'lineage',
  },
  {
    id: 'edge-model-test',
    sourceId: 'model-orders',
    targetId: 'test-orders',
    relation: 'validation',
  },
  {
    id: 'edge-macro-model',
    sourceId: 'macro-format',
    targetId: 'model-orders',
    relation: 'lineage',
  },
];

describe('canvas dbt planner graph source', () => {
  it('projects only executable dbt nodes into planner-generic-v1 graph source', () => {
    const result = buildDbtPlannerGraphSource({
      nodes: [sourceNode, modelNode, testNode, macroNode],
      edges,
      scopedNodeIds: ['source-orders', 'model-orders', 'test-orders', 'macro-format'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection).toEqual({
      mode: 'explicit',
      nodeIds: ['model-orders', 'test-orders'],
    });
    expect(result.graphSource).toEqual({
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: [
        {
          nodeId: 'model-orders',
          stepKind: 'DBT_MODEL',
          dependsOn: [],
          metadata: {
            displayName: 'Orders Model',
            sourceRef: 'source-orders',
            tags: {
              kind: 'dbt:model',
              pluginId: 'dbt',
              role: 'transform',
            },
          },
        },
        {
          nodeId: 'test-orders',
          stepKind: 'DBT_TEST',
          dependsOn: ['model-orders'],
          metadata: {
            displayName: 'Orders Not Null',
            tags: {
              kind: 'dbt:test',
              pluginId: 'dbt',
              role: 'check',
            },
          },
        },
      ],
    });
    expect(result.draftSignature).toContain('model-orders');
  });

  it('fails closed when the selected dbt graph has no executable nodes', () => {
    expect(
      buildDbtPlannerGraphSource({
        nodes: [sourceNode, macroNode],
        edges,
        scopedNodeIds: ['source-orders', 'macro-format'],
      })
    ).toEqual({
      ok: false,
      message: 'DBT plan requires at least one model, test, or snapshot node.',
    });
  });

  it('falls back to the visible dbt workflow when the selected node is non-executable', () => {
    expect(
      resolveDbtExecutionScopeNodeIds({
        nodes: [sourceNode, modelNode, testNode],
        selectedNodeIds: ['source-orders'],
        workspaceNodeIds: ['source-orders', 'model-orders', 'test-orders'],
      })
    ).toEqual(['source-orders', 'model-orders', 'test-orders']);
  });
});
