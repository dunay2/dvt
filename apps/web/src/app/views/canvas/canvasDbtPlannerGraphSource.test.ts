import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
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

const downstreamModelNode: CanonicalNode = {
  id: 'model-order-revenue',
  name: 'Order Revenue',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: ['mart'],
  metadata: {
    dbt: {
      selectedSourceId: 'model-orders',
    },
  },
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

const dependencyEdges: CanonicalEdge[] = [
  ...edges,
  {
    id: 'edge-model-downstream',
    sourceId: 'model-orders',
    targetId: 'model-order-revenue',
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

  it('keeps model definition policy in the dbt plugin instead of the generic graph projection', () => {
    const emptyModelNode: CanonicalNode = {
      ...modelNode,
      metadata: {
        dbt: {
          selectedSourceId: 'source-orders',
        },
      },
    };

    const result = buildDbtPlannerGraphSource({
      nodes: [sourceNode, emptyModelNode],
      edges,
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graphSource.nodes).toHaveLength(1);
    expect(result.graphSource.nodes[0]?.metadata).toEqual(
      expect.objectContaining({
        displayName: 'Orders Model',
        sourceRef: 'source-orders',
      })
    );
  });

  it('rejects an explicit selection that has no executable dbt resources', () => {
    expect(
      resolveDbtExecutionScopeNodeIds({
        nodes: [sourceNode, modelNode, testNode],
        edges,
        selectedNodeIds: ['source-orders'],
        workspaceNodeIds: ['source-orders', 'model-orders', 'test-orders'],
      })
    ).toEqual({
      ok: false,
      cause: 'explicit_selection_contains_unavailable_or_non_executable_nodes',
      invalidNodeIds: ['source-orders'],
    });
  });

  it('uses the visible executable dbt workflow only when there is no explicit selection', () => {
    expect(
      resolveDbtExecutionScopeNodeIds({
        nodes: [sourceNode, modelNode, testNode],
        edges,
        selectedNodeIds: [],
        workspaceNodeIds: ['source-orders', 'model-orders', 'test-orders'],
      })
    ).toEqual({
      ok: true,
      selectionMode: 'workspace',
      requestedRootNodeIds: ['model-orders', 'test-orders'],
      derivedDependencyNodeIds: [],
      nodeIds: ['model-orders', 'test-orders'],
    });
  });

  it('includes upstream executable dbt dependencies for partial executable selection', () => {
    expect(
      resolveDbtExecutionScopeNodeIds({
        nodes: [sourceNode, modelNode, downstreamModelNode, testNode],
        edges: dependencyEdges,
        selectedNodeIds: ['model-order-revenue'],
        workspaceNodeIds: ['source-orders', 'model-orders', 'model-order-revenue', 'test-orders'],
      })
    ).toEqual({
      ok: true,
      selectionMode: 'explicit',
      requestedRootNodeIds: ['model-order-revenue'],
      derivedDependencyNodeIds: ['model-orders'],
      nodeIds: ['model-orders', 'model-order-revenue'],
    });

    const result = buildDbtPlannerGraphSource({
      nodes: [sourceNode, modelNode, downstreamModelNode, testNode],
      edges: dependencyEdges,
      scopedNodeIds: ['model-orders', 'model-order-revenue'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.graphSource.nodes).toEqual([
      expect.objectContaining({
        nodeId: 'model-orders',
        dependsOn: [],
      }),
      expect.objectContaining({
        nodeId: 'model-order-revenue',
        dependsOn: ['model-orders'],
      }),
    ]);
  });

  it('changes the authored draft signature when requested roots change but closure does not', () => {
    const strategy = {
      kind: 'planner_generic_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
    } as const;
    const nodes = [sourceNode, modelNode, downstreamModelNode];
    const workspaceNodeIds = nodes.map((node) => node.id);
    const downstreamOnly = buildCanvasDbtExecutionProjection({
      strategy,
      canonicalNodes: nodes,
      canonicalEdges: dependencyEdges,
      selectedNodeIds: ['model-order-revenue'],
      workspaceNodeIds,
    });
    const bothRoots = buildCanvasDbtExecutionProjection({
      strategy,
      canonicalNodes: nodes,
      canonicalEdges: dependencyEdges,
      selectedNodeIds: ['model-orders', 'model-order-revenue'],
      workspaceNodeIds,
    });

    expect(downstreamOnly.ok).toBe(true);
    expect(bothRoots.ok).toBe(true);
    if (!downstreamOnly.ok || !bothRoots.ok) return;
    expect(downstreamOnly.selection).toEqual(bothRoots.selection);
    expect(downstreamOnly.draftSignature).not.toBe(bothRoots.draftSignature);
  });
});
