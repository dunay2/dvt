import { describe, expect, it } from 'vitest';

import {
  buildCanvasExecutionSelectionRecoveryGraph,
  buildCanvasExecutionSelectionRecoveryReadModel,
  recoverCanvasExecutionSelection,
  resolveCanvasExecutionSelectionLastPreviewRevision,
} from './canvasExecutionSelectionRecovery';

const dependencyIdsByNodeId = new Map<string, readonly string[]>([
  ['model.orders', ['model.base']],
  ['test.orders', ['model.orders']],
]);

describe('buildCanvasExecutionSelectionRecoveryReadModel', () => {
  it('classifies unavailable and non-executable roots without admitting a partial scope', () => {
    expect(
      buildCanvasExecutionSelectionRecoveryReadModel({
        selectionIntent: {
          mode: 'explicit',
          nodeIds: ['model.removed', 'source.raw', 'test.orders'],
        },
        workspaceNodeIds: ['source.raw', 'model.base', 'model.orders', 'test.orders'],
        executableNodeIds: ['model.base', 'model.orders', 'test.orders'],
        dependencyIdsByNodeId,
        lastPreviewRevision: 'analysis-sha-1',
        canRefreshAnalysis: true,
      })
    ).toEqual({
      queryRail: 'CollectCanvasExecutionSelection',
      commandRail: 'RecoverCanvasExecutionSelection',
      status: 'blocked',
      selectionMode: 'explicit',
      requestedRootNodeIds: ['model.removed', 'source.raw', 'test.orders'],
      unavailableRootNodeIds: ['model.removed'],
      nonExecutableRootNodeIds: ['source.raw'],
      derivedDependencyNodeIds: [],
      admittedScopeNodeIds: [],
      lastPreviewRevision: 'analysis-sha-1',
      canDiscardUnavailable: true,
      canUseWorkspaceScope: true,
      canRefreshAnalysis: true,
      pendingStrategy: null,
      receipt: null,
      failure: null,
    });
  });

  it('distinguishes requested roots from dependencies in an admitted explicit scope', () => {
    expect(
      buildCanvasExecutionSelectionRecoveryReadModel({
        selectionIntent: { mode: 'explicit', nodeIds: ['test.orders'] },
        workspaceNodeIds: ['source.raw', 'model.base', 'model.orders', 'test.orders'],
        executableNodeIds: ['model.base', 'model.orders', 'test.orders'],
        dependencyIdsByNodeId,
        lastPreviewRevision: null,
        canRefreshAnalysis: true,
      })
    ).toMatchObject({
      status: 'ready',
      requestedRootNodeIds: ['test.orders'],
      unavailableRootNodeIds: [],
      nonExecutableRootNodeIds: [],
      derivedDependencyNodeIds: ['model.base', 'model.orders'],
      admittedScopeNodeIds: ['model.base', 'model.orders', 'test.orders'],
      canDiscardUnavailable: false,
    });
  });

  it('never admits a requested root that exists in authority but is outside workspace scope', () => {
    expect(
      buildCanvasExecutionSelectionRecoveryReadModel({
        selectionIntent: { mode: 'explicit', nodeIds: ['model.outside-scope'] },
        workspaceNodeIds: ['model.orders'],
        executableNodeIds: ['model.orders', 'model.outside-scope'],
        dependencyIdsByNodeId,
        lastPreviewRevision: null,
        canRefreshAnalysis: true,
      })
    ).toMatchObject({
      status: 'blocked',
      unavailableRootNodeIds: ['model.outside-scope'],
      admittedScopeNodeIds: [],
    });
  });

  it('does not offer workspace replacement when the workspace has no executable scope', () => {
    expect(
      buildCanvasExecutionSelectionRecoveryReadModel({
        selectionIntent: { mode: 'explicit', nodeIds: ['model.removed'] },
        workspaceNodeIds: ['source.raw'],
        executableNodeIds: [],
        dependencyIdsByNodeId: new Map(),
        lastPreviewRevision: null,
        canRefreshAnalysis: true,
      })
    ).toMatchObject({
      status: 'blocked',
      canDiscardUnavailable: true,
      canUseWorkspaceScope: false,
      admittedScopeNodeIds: [],
    });
  });
});

describe('recoverCanvasExecutionSelection', () => {
  const selectionIntent = {
    mode: 'explicit' as const,
    nodeIds: ['model.removed', 'source.raw', 'test.orders'],
  };

  it('discards unavailable roots only and returns an exact receipt', () => {
    expect(
      recoverCanvasExecutionSelection({
        strategy: 'discard_unavailable',
        selectionIntent,
        unavailableRootNodeIds: ['model.removed'],
      })
    ).toEqual({
      nextSelectionIntent: {
        mode: 'explicit',
        nodeIds: ['source.raw', 'test.orders'],
      },
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: 'discard_unavailable',
        affectedNodeIds: ['model.removed'],
        retainedNodeIds: ['source.raw', 'test.orders'],
        resultingMode: 'explicit',
      },
    });
  });

  it('replaces explicit intent with workspace scope only through its explicit strategy', () => {
    expect(
      recoverCanvasExecutionSelection({
        strategy: 'use_workspace_scope',
        selectionIntent,
        unavailableRootNodeIds: ['model.removed'],
      })
    ).toEqual({
      nextSelectionIntent: { mode: 'workspace', nodeIds: [] },
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: 'use_workspace_scope',
        affectedNodeIds: ['model.removed', 'source.raw', 'test.orders'],
        retainedNodeIds: [],
        resultingMode: 'workspace',
      },
    });
  });

  it('preserves complete intent when refreshing authoritative analysis', () => {
    expect(
      recoverCanvasExecutionSelection({
        strategy: 'refresh_analysis',
        selectionIntent,
        unavailableRootNodeIds: ['model.removed'],
      })
    ).toEqual({
      nextSelectionIntent: selectionIntent,
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: 'refresh_analysis',
        affectedNodeIds: [],
        retainedNodeIds: ['model.removed', 'source.raw', 'test.orders'],
        resultingMode: 'explicit',
      },
    });
  });
});

describe('buildCanvasExecutionSelectionRecoveryGraph', () => {
  it('derives authored DBT executable roots and dependencies from canonical graph authority', () => {
    expect(
      buildCanvasExecutionSelectionRecoveryGraph({
        canonicalNodes: [
          {
            id: 'source.raw',
            pluginId: 'dvt',
            kind: 'dvt:source',
            metadata: { dbt: { sourceName: 'raw' } },
          },
          {
            id: 'model.orders',
            pluginId: 'dvt',
            kind: 'dvt:transform',
            metadata: { dbt: { materialized: 'view' } },
          },
          { id: 'test.orders', pluginId: 'dbt', kind: 'dbt:test' },
        ],
        canonicalEdges: [
          { sourceId: 'source.raw', targetId: 'model.orders' },
          { sourceId: 'model.orders', targetId: 'test.orders' },
        ],
        workspaceNodeIds: ['source.raw', 'model.orders', 'test.orders'],
        plannerGraphSource: null,
      })
    ).toEqual({
      executableNodeIds: ['model.orders', 'test.orders'],
      dependencyIdsByNodeId: new Map([['test.orders', ['model.orders']]]),
    });
  });

  it('uses the file-authoritative planner graph instead of inferring unsupported resources', () => {
    expect(
      buildCanvasExecutionSelectionRecoveryGraph({
        canonicalNodes: [
          { id: 'model.supported', pluginId: 'dvt', kind: 'dvt:transform' },
          { id: 'model.code-only', pluginId: 'dvt', kind: 'dvt:transform' },
        ],
        canonicalEdges: [],
        workspaceNodeIds: ['model.supported', 'model.code-only'],
        plannerGraphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: 'model.supported',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
              metadata: { displayName: 'Supported', tags: {} },
            },
          ],
        },
      })
    ).toEqual({
      executableNodeIds: ['model.supported'],
      dependencyIdsByNodeId: new Map([['model.supported', []]]),
    });
  });
});

describe('resolveCanvasExecutionSelectionLastPreviewRevision', () => {
  it('prefers the DBT analysis revision and falls back to persisted preview identity', () => {
    expect(
      resolveCanvasExecutionSelectionLastPreviewRevision({
        preview: {
          persisted: { planRecordId: 'plan-record-1', canonicalPlanSha256: 'plan-sha' },
          provenance: {
            kind: 'dbt-project-files',
            canvasId: 'canvas-1',
            projectRoot: 'analytics',
            contentSetSha256: 'content-sha',
            analysisSha256: 'analysis-sha',
            dbtVersion: '1.9.0',
            selectedUniqueIds: ['model.orders'],
            executionTarget: {
              provider: 'postgres',
              adapter: 'dbt-postgres',
              targetName: 'dev',
              connectionRef: {
                schemaVersion: 'connection-ref.v1',
                connectionId: 'warehouse-dev',
                provider: 'dbt-postgres',
              },
              resolutionSource: 'environment-default',
              credentialRef: 'credential-ref',
            },
          },
        },
      })
    ).toBe('analysis-sha');

    expect(
      resolveCanvasExecutionSelectionLastPreviewRevision({
        preview: {
          persisted: { planRecordId: 'plan-record-1', canonicalPlanSha256: 'plan-sha' },
        },
      })
    ).toBe('plan-sha');
    expect(resolveCanvasExecutionSelectionLastPreviewRevision(null)).toBeNull();
  });
});
