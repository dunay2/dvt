import { describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { SessionContextPort } from '../../ports/sessionContext';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
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
    const previewPlan = vi.fn<IPlansPort['previewPlan']>().mockResolvedValue(persistedPlan);
    const saveFileContent = vi.fn();
    const strategy: CanvasExecutionStrategy = {
      kind: 'dbt_project_file_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      dbtVersion: '1.10.0',
      executionTarget: {
        provider: 'server-config',
        adapter: 'postgres',
        targetName: 'development',
        credentialRef: 'vault:dbt/development',
      },
    };
    const sessionContext = {
      buildRunContext: (runId: string) => ({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
        targetAdapter: 'temporal' as const,
        runId,
      }),
      getWorkspaceScope: () => ({ tenantId: 'tenant', projectId: 'project', environmentId: 'dev' }),
      getWorkspaceScopeSnapshot: () => ({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      }),
      subscribeWorkspaceScope: () => () => undefined,
    } satisfies SessionContextPort;

    const result = await executeCanvasPlanAction({
      canPlan: true,
      canonicalEdges: [],
      canonicalNodes: [modelNode],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      previewProvenanceConfig: { gitBranch: 'detached', gitSha: 'unknown' },
      selectedNodeIds: ['model.analytics.orders'],
      sessionContext,
      transformationValidation: validateTransformationGraph({
        nodes: [modelNode],
        edges: [],
        selectedNodeIds: ['model.analytics.orders'],
        workspaceNodeIds: ['model.analytics.orders'],
      }),
      workspaceNodeIds: ['model.analytics.orders'],
      workspaceFilesQuery: {} as IWorkspaceFilesQueryPort,
      workspaceFileContentCommand: {
        saveFileContent,
      } as unknown as IWorkspaceFileContentCommandPort,
    });

    expect(result).toMatchObject({
      ok: true,
      plan: persistedPlan,
      writtenArtifactPaths: [],
    });
    expect(saveFileContent).not.toHaveBeenCalled();
    expect(previewPlan).toHaveBeenCalledWith({
      previewProfile: 'planner-generic-v1',
      graphSource: expect.objectContaining({ kind: 'generic-graph-v1', sourceFamily: 'dbt' }),
      selection: { mode: 'explicit', nodeIds: ['model.analytics.orders'] },
      context: expect.objectContaining({ runId: 'preview_context' }),
      provenance: {
        kind: 'dbt-project-files',
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analysisSha256: '2'.repeat(64),
        dbtVersion: '1.10.0',
        selectedUniqueIds: ['model.analytics.orders'],
        executionTarget: strategy.executionTarget,
      },
      persist: true,
    });
  });
});
