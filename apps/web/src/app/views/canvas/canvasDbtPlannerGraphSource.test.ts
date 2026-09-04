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

const objectFileLoadNode: CanonicalNode = {
  id: 'load-orders',
  name: 'Load orders fixture',
  pluginId: 'dvt.object-file-postgres',
  kind: 'dvt:object_file_load',
  role: 'transform',
  status: 'idle',
  tags: ['ingestion'],
  metadata: {
    objectFilePostgres: {
      source: {
        storageUri: `s3://dvt-fixtures/tenants/tenant/${'a'.repeat(64)}`,
        sha256: 'a'.repeat(64),
        sizeBytes: 62,
        maxBytes: 1_000,
        encoding: 'utf-8',
        format: 'csv',
        mediaType: 'text/csv',
        header: true,
        delimiter: ',',
        credentialRef: 'object-store:het1-fixture',
      },
      target: {
        dialect: 'postgres',
        schema: 'staging',
        relation: 'orders',
        loadMode: 'replace',
        credentialRef: 'postgres:het1-target',
      },
      columns: [
        {
          sourceField: 'order_id',
          targetColumn: 'order_id',
          dataType: 'bigint',
          nullable: false,
        },
      ],
    },
  },
};

const httpJsonAcquisitionNode: CanonicalNode = {
  id: 'acquire-orders',
  name: 'Acquire orders snapshot',
  pluginId: 'dvt.http-json',
  kind: 'dvt:http_json_acquisition',
  role: 'input',
  status: 'idle',
  tags: ['acquisition'],
  metadata: {
    httpJsonArtifact: {
      request: {
        method: 'GET',
        endpointRef: 'http-endpoint:orders',
        headers: { accept: 'application/x-ndjson' },
      },
      response: {
        acceptedStatus: 200,
        format: 'jsonl',
        mediaType: 'application/x-ndjson',
        encoding: 'utf-8',
        expectedSha256: 'a'.repeat(64),
        expectedSizeBytes: 62,
        maxBytes: 1_000,
      },
      artifact: {
        storageUri: `s3://dvt-fixtures/tenants/tenant/${'a'.repeat(64)}`,
        credentialRef: 'object-store:het1-fixture',
      },
      limits: { connectTimeoutMs: 1_000, requestTimeoutMs: 5_000, maxRedirects: 1 },
    },
  },
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
  metadata: {
    dbtTest: {
      testType: 'not_null',
      targetModelId: modelNode.id,
      targetColumn: 'order_id',
      severity: 'error',
    },
  },
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
  it('projects the public HET2 acquisition, HET1 load, model, and test chain', () => {
    const result = buildDbtPlannerGraphSource({
      nodes: [httpJsonAcquisitionNode, objectFileLoadNode, modelNode, testNode],
      edges: [
        {
          id: 'edge-acquire-load',
          sourceId: httpJsonAcquisitionNode.id,
          targetId: objectFileLoadNode.id,
          relation: 'lineage',
        },
        {
          id: 'edge-load-model',
          sourceId: objectFileLoadNode.id,
          targetId: modelNode.id,
          relation: 'lineage',
        },
        {
          id: 'edge-model-test',
          sourceId: modelNode.id,
          targetId: testNode.id,
          relation: 'validation',
        },
      ],
      scopedNodeIds: [httpJsonAcquisitionNode.id, objectFileLoadNode.id, modelNode.id, testNode.id],
      executionScope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.graphSource.nodes.map(({ nodeId, stepKind, dependsOn }) => ({
        nodeId,
        stepKind,
        dependsOn,
      }))
    ).toEqual([
      { nodeId: 'acquire-orders', stepKind: 'ACQUIRE_HTTP_JSON_ARTIFACT', dependsOn: [] },
      {
        nodeId: 'load-orders',
        stepKind: 'LOAD_OBJECT_FILE_TO_POSTGRES',
        dependsOn: ['acquire-orders'],
      },
      { nodeId: 'model-orders', stepKind: 'DBT_MODEL', dependsOn: ['load-orders'] },
      { nodeId: 'test-orders', stepKind: 'DBT_TEST', dependsOn: ['model-orders'] },
    ]);
  });

  it('projects an object-file load as the executable dependency of DBT model and test steps', () => {
    const heterogeneousEdges: CanonicalEdge[] = [
      {
        id: 'edge-load-model',
        sourceId: objectFileLoadNode.id,
        targetId: modelNode.id,
        relation: 'lineage',
      },
      {
        id: 'edge-model-test',
        sourceId: modelNode.id,
        targetId: testNode.id,
        relation: 'validation',
      },
    ];

    const result = buildDbtPlannerGraphSource({
      nodes: [objectFileLoadNode, modelNode, testNode],
      edges: heterogeneousEdges,
      scopedNodeIds: [objectFileLoadNode.id, modelNode.id, testNode.id],
      executionScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection.nodeIds).toEqual(['load-orders', 'model-orders', 'test-orders']);
    expect(result.graphSource.nodes).toEqual([
      expect.objectContaining({
        nodeId: 'load-orders',
        stepKind: 'LOAD_OBJECT_FILE_TO_POSTGRES',
        dependsOn: [],
        stepTypeConfig: expect.objectContaining({
          scope: {
            tenantId: 'tenant',
            projectId: 'project',
            environmentId: 'dev',
          },
        }),
      }),
      expect.objectContaining({
        nodeId: 'model-orders',
        stepKind: 'DBT_MODEL',
        dependsOn: ['load-orders'],
        stepTypeConfig: {
          custom: {
            objectFilePostgresStagingBridge: { version: 'v1' },
            dbtStepSelector: { version: 'v1', selector: 'orders_model' },
          },
        },
      }),
      expect.objectContaining({
        nodeId: 'test-orders',
        stepKind: 'DBT_TEST',
        dependsOn: ['model-orders'],
        stepTypeConfig: {
          custom: {
            objectFilePostgresStagingBridge: { version: 'v1' },
            dbtStepSelector: { version: 'v1', selector: 'test_orders' },
          },
        },
      }),
    ]);
  });

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
          stepTypeConfig: {
            custom: {
              dbtStepSelector: { version: 'v1', selector: 'orders_model' },
            },
          },
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
          stepTypeConfig: {
            custom: {
              dbtStepSelector: { version: 'v1', selector: 'test_orders' },
            },
          },
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

  it('projects the sole connected origin instead of stale duplicate source metadata', () => {
    const staleModelNode: CanonicalNode = {
      ...modelNode,
      metadata: {
        dbt: {
          selectedSourceId: 'detached-source',
        },
      },
    };

    const result = buildDbtPlannerGraphSource({
      nodes: [sourceNode, staleModelNode],
      edges,
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graphSource.nodes[0]?.metadata).toEqual(
      expect.objectContaining({ sourceRef: 'source-orders' })
    );
  });

  it('rejects an explicit selection that has no executable dbt resources', () => {
    expect(
      resolveDbtExecutionScopeNodeIds({
        nodes: [sourceNode, modelNode, testNode],
        edges,
        selectionIntent: { mode: 'explicit', nodeIds: ['source-orders'] },
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
        selectionIntent: { mode: 'workspace', nodeIds: [] },
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
        selectionIntent: { mode: 'explicit', nodeIds: ['model-order-revenue'] },
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
      selectionIntent: { mode: 'explicit', nodeIds: ['model-order-revenue'] },
      workspaceNodeIds,
    });
    const bothRoots = buildCanvasDbtExecutionProjection({
      strategy,
      canonicalNodes: nodes,
      canonicalEdges: dependencyEdges,
      selectionIntent: {
        mode: 'explicit',
        nodeIds: ['model-orders', 'model-order-revenue'],
      },
      workspaceNodeIds,
    });

    expect(downstreamOnly.ok).toBe(true);
    expect(bothRoots.ok).toBe(true);
    if (!downstreamOnly.ok || !bothRoots.ok) return;
    expect(downstreamOnly.selection).toEqual(bothRoots.selection);
    expect(downstreamOnly.draftSignature).not.toBe(bothRoots.draftSignature);
  });
});
