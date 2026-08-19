import { describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { SessionContextPort } from '../../ports/sessionContext';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import { canvasViewCopy } from './copy';
import { executeCanvasPlanAction } from './canvasPlanAction';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import { validateTransformationGraph } from './transformationGraphValidation';

const modelNode: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const sourceNode: CanonicalNode = {
  id: 'source.analytics.raw.orders',
  name: 'raw_orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
};

const persistedPlan: PlanViewModel = {
  planId: 'plan-file-dbt',
  planVersion: '1.0.0',
  generatedAt: '2026-07-15T10:00:00.000Z',
  adapter: 'temporal',
  target: 'development',
  capabilities: [],
  steps: [],
};

describe('executeCanvasPlanAction file-backed dbt branch', () => {
  it('previews the authoritative projection without reading or writing workspace files', async () => {
    const previewPlan = vi.fn<IPlansPort['previewPlan']>().mockResolvedValue({
      kind: 'accepted',
      plan: { ...persistedPlan, planRef: makePlanRef({ planId: persistedPlan.planId }) },
    });
    const saveFileContent = vi.fn();
    const strategy: Extract<CanvasExecutionStrategy, { kind: 'dbt_project_file_preview' }> = {
      kind: 'dbt_project_file_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
      canvasId: 'analytics-canvas',
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      dbtVersion: '1.10.0',
      plannerGraphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: '1.0',
        nodes: [
          {
            nodeId: 'model.analytics.orders',
            stepKind: 'DBT_MODEL',
            dependsOn: [],
            metadata: {
              displayName: 'orders',
              tags: { kind: 'dbt:model', pluginId: 'dbt', role: 'transform' },
            },
          },
          {
            nodeId: 'test.analytics.orders_not_null',
            stepKind: 'DBT_TEST',
            dependsOn: ['model.analytics.orders'],
            metadata: {
              displayName: 'orders_not_null',
              tags: { kind: 'dbt:test', pluginId: 'dbt', role: 'check' },
            },
          },
        ],
      },
      executionTarget: {
        provider: 'server-config',
        adapter: 'postgres',
        targetName: 'development',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-development',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
        credentialRef: 'vault:dbt/development',
      },
    };
    const runContext = makeRunContext('preview_context', {
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'dev',
    });
    const workspaceScope = {
      tenantId: runContext.tenantId,
      projectId: runContext.projectId,
      environmentId: runContext.environmentId,
      targetAdapter: runContext.targetAdapter,
    };
    const sessionContext = {
      buildRunContext: (runId: string) => makeRunContext(runId, workspaceScope),
      getWorkspaceScope: () => workspaceScope,
      getWorkspaceScopeSnapshot: () => workspaceScope,
      subscribeWorkspaceScope: () => () => undefined,
    } satisfies SessionContextPort;

    const result = await executeCanvasPlanAction({
      graphDraftCanvasId: null,
      canPlan: true,
      canonicalEdges: [],
      canonicalNodes: [modelNode],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      previewProvenanceConfig: { gitBranch: 'detached', gitSha: 'unknown' },
      selectionIntent: {
        mode: 'explicit',
        nodeIds: ['test.analytics.orders_not_null'],
      },
      sessionContext,
      transformationValidation: validateTransformationGraph({
        nodes: [modelNode],
        edges: [],
        selectedNodeIds: ['test.analytics.orders_not_null'],
        workspaceNodeIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
      }),
      workspaceNodeIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
      workspaceFilesQuery: {} as IWorkspaceFilesQueryPort,
      graphDbtWorkspaceArtifactPublicationCommand:
        {} as IGraphDbtWorkspaceArtifactPublicationCommandPort,
      graphDbtModelCompilationQuery: {} as IGraphDbtModelCompilationQueryPort,
      workspaceFileContentCommand: {
        saveFileContent,
      } as unknown as IWorkspaceFileContentCommandPort,
    });

    expect(result).toMatchObject({
      ok: true,
      previewOutcome: {
        kind: 'accepted',
        plan: {
          ...persistedPlan,
          preview: {
            selectionIntent: {
              mode: 'explicit',
              requestedRootNodeIds: ['test.analytics.orders_not_null'],
              derivedDependencyNodeIds: ['model.analytics.orders'],
              authorizedScopeNodeIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
            },
          },
        },
      },
      writtenArtifactPaths: [],
    });
    expect(saveFileContent).not.toHaveBeenCalled();
    expect(previewPlan).toHaveBeenCalledWith({
      previewProfile: 'planner-generic-v1',
      graphSource: expect.objectContaining({ kind: 'generic-graph-v1', sourceFamily: 'dbt' }),
      selection: {
        mode: 'explicit',
        nodeIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
      },
      context: expect.objectContaining({ runId: 'preview_context' }),
      provenance: {
        kind: 'dbt-project-files',
        canvasId: 'analytics-canvas',
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analysisSha256: '2'.repeat(64),
        dbtVersion: '1.10.0',
        selectedUniqueIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
        executionTarget: strategy.executionTarget,
      },
      persist: true,
    });
  });

  it('does not widen an explicit source-only selection into the executable project', async () => {
    const previewPlan = vi.fn<IPlansPort['previewPlan']>();
    const strategy: Extract<CanvasExecutionStrategy, { kind: 'dbt_project_file_preview' }> = {
      kind: 'dbt_project_file_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
      canvasId: 'analytics-canvas',
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      dbtVersion: '1.10.0',
      plannerGraphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: '1.0',
        nodes: [
          {
            nodeId: 'model.analytics.orders',
            stepKind: 'DBT_MODEL',
            dependsOn: [],
          },
        ],
      },
      executionTarget: {
        provider: 'server-config',
        adapter: 'postgres',
        targetName: 'development',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-development',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
        credentialRef: 'vault:dbt/development',
      },
    };
    const runContext = makeRunContext('preview_context');
    const sessionContext = {
      buildRunContext: () => runContext,
      getWorkspaceScope: () => runContext,
      getWorkspaceScopeSnapshot: () => runContext,
      subscribeWorkspaceScope: () => () => undefined,
    } as unknown as SessionContextPort;

    const result = await executeCanvasPlanAction({
      graphDraftCanvasId: null,
      canPlan: true,
      canonicalEdges: [],
      canonicalNodes: [sourceNode, modelNode],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      previewProvenanceConfig: { gitBranch: 'detached', gitSha: 'unknown' },
      selectionIntent: { mode: 'explicit', nodeIds: [sourceNode.id] },
      sessionContext,
      transformationValidation: validateTransformationGraph({
        nodes: [sourceNode, modelNode],
        edges: [],
        selectedNodeIds: [sourceNode.id],
        workspaceNodeIds: [sourceNode.id, modelNode.id],
      }),
      workspaceNodeIds: [sourceNode.id, modelNode.id],
      workspaceFilesQuery: {} as IWorkspaceFilesQueryPort,
      graphDbtWorkspaceArtifactPublicationCommand:
        {} as IGraphDbtWorkspaceArtifactPublicationCommandPort,
      graphDbtModelCompilationQuery: {} as IGraphDbtModelCompilationQueryPort,
      workspaceFileContentCommand: {} as IWorkspaceFileContentCommandPort,
    });

    expect(result).toEqual({
      ok: false,
      message: canvasViewCopy.dbtExplicitSelectionRequiresExecutableResourceMessage,
    });
    expect(previewPlan).not.toHaveBeenCalled();
  });

  it('rejects a mixed explicit selection instead of dropping its source member', async () => {
    const previewPlan = vi.fn<IPlansPort['previewPlan']>();
    const strategy: Extract<CanvasExecutionStrategy, { kind: 'dbt_project_file_preview' }> = {
      kind: 'dbt_project_file_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
      canvasId: 'analytics-canvas',
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      dbtVersion: '1.10.0',
      plannerGraphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: '1.0',
        nodes: [{ nodeId: modelNode.id, stepKind: 'DBT_MODEL', dependsOn: [] }],
      },
      executionTarget: {
        provider: 'server-config',
        adapter: 'postgres',
        targetName: 'development',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-development',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
        credentialRef: 'vault:dbt/development',
      },
    };
    const runContext = makeRunContext('preview_context');
    const sessionContext = {
      buildRunContext: () => runContext,
      getWorkspaceScope: () => runContext,
      getWorkspaceScopeSnapshot: () => runContext,
      subscribeWorkspaceScope: () => () => undefined,
    } as unknown as SessionContextPort;

    const result = await executeCanvasPlanAction({
      graphDraftCanvasId: null,
      canPlan: true,
      canonicalEdges: [],
      canonicalNodes: [sourceNode, modelNode],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      previewProvenanceConfig: { gitBranch: 'detached', gitSha: 'unknown' },
      selectionIntent: {
        mode: 'explicit',
        nodeIds: [sourceNode.id, modelNode.id],
      },
      sessionContext,
      transformationValidation: validateTransformationGraph({
        nodes: [sourceNode, modelNode],
        edges: [],
        selectedNodeIds: [sourceNode.id, modelNode.id],
        workspaceNodeIds: [sourceNode.id, modelNode.id],
      }),
      workspaceNodeIds: [sourceNode.id, modelNode.id],
      workspaceFilesQuery: {} as IWorkspaceFilesQueryPort,
      graphDbtWorkspaceArtifactPublicationCommand:
        {} as IGraphDbtWorkspaceArtifactPublicationCommandPort,
      graphDbtModelCompilationQuery: {} as IGraphDbtModelCompilationQueryPort,
      workspaceFileContentCommand: {} as IWorkspaceFileContentCommandPort,
    });

    expect(result).toEqual({
      ok: false,
      message: canvasViewCopy.dbtExplicitSelectionRequiresExecutableResourceMessage,
    });
    expect(previewPlan).not.toHaveBeenCalled();
  });
});
