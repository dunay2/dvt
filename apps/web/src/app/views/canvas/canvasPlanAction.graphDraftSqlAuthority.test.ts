import { describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { SessionContextPort } from '../../ports/sessionContext';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { executeCanvasPlanAction } from './canvasPlanAction';
import { validateTransformationGraph } from './transformationGraphValidation';

const sourceNode: CanonicalNode = {
  id: 'source-orders',
  name: 'Raw Orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [{ name: 'order_id', type: 'bigint' }],
    dbt: { packageName: 'analytics', sourceName: 'raw', schemaName: 'raw', tableName: 'orders' },
  },
};

const modelNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: { packageName: 'analytics', materialized: 'table', selectedSourceId: sourceNode.id },
  },
};

const edge: CanonicalEdge = {
  id: 'source-to-model',
  sourceId: sourceNode.id,
  targetId: modelNode.id,
  relation: 'lineage',
};

describe('Canvas graph-draft DBT SQL authority', () => {
  it('refuses divergent pre-marker model SQL without an adoption path', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
      async (input) => ({
        kind: 'saved',
        disposition: 'updated',
        path: input.path,
        contentSha256: 'c'.repeat(64),
        lastModified: '2026-07-22T00:00:01.000Z',
      })
    );
    const publish = vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(
      async (request) => ({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'applied',
        idempotencyKey: request.idempotencyKey,
        requestHash: 'd'.repeat(64),
        deduplicated: false,
        writes: request.artifacts
          .filter((artifact) => artifact.writeRequired)
          .map((artifact) => ({
            path: artifact.path,
            contentSha256: 'e'.repeat(64),
          })),
      })
    );
    const persistedPlan: PlanViewModel = {
      planId: 'plan-graph-draft',
      planVersion: '1.0.0',
      generatedAt: '2026-07-22T00:00:02.000Z',
      adapter: 'temporal',
      target: 'development',
      capabilities: [],
      steps: [],
    };
    const previewPlan = vi.fn<IPlansPort['previewPlan']>().mockResolvedValue({
      kind: 'accepted',
      plan: { ...persistedPlan, planRef: makePlanRef({ planId: persistedPlan.planId }) },
    });
    const workspaceFilesQuery: IWorkspaceFilesQueryPort = {
      listFiles: vi.fn(),
      getFileContent: vi.fn(async (path) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: path.endsWith('.sql') ? 'sql' : 'yaml',
        content:
          path === 'models/orders.sql'
            ? 'select customer_secret from project_code_edit\n'
            : 'existing generated metadata',
        contentSha256: path === 'models/orders.sql' ? 'b'.repeat(64) : 'a'.repeat(64),
        lastModified: '2026-07-22T00:00:00.000Z',
      })),
    };
    const runContext = makeRunContext('preview_context');
    const sessionContext = {
      buildRunContext: () => runContext,
      getWorkspaceScope: () => runContext,
      getWorkspaceScopeSnapshot: () => runContext,
      subscribeWorkspaceScope: () => () => undefined,
    } as unknown as SessionContextPort;
    const strategy: CanvasExecutionStrategy = {
      kind: 'planner_generic_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
    };

    const result = await executeCanvasPlanAction({
      graphDraftCanvasId: 'orders-canvas',
      canPlan: true,
      canonicalEdges: [edge],
      canonicalNodes: [sourceNode, modelNode],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      previewProvenanceConfig: { gitBranch: 'detached', gitSha: 'unknown' },
      selectionIntent: { mode: 'explicit', nodeIds: [modelNode.id] },
      sessionContext,
      transformationValidation: validateTransformationGraph({
        nodes: [sourceNode, modelNode],
        edges: [edge],
        selectedNodeIds: [modelNode.id],
        workspaceNodeIds: [sourceNode.id, modelNode.id],
      }),
      workspaceNodeIds: [sourceNode.id, modelNode.id],
      workspaceFilesQuery,
      workspaceFileContentCommand: { saveFileContent },
      graphDbtWorkspaceArtifactPublicationCommand: { publish },
      graphDbtModelCompilationQuery: {
        compile: vi.fn<IGraphDbtModelCompilationQueryPort['compile']>(),
      },
    });

    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining('models/orders.sql'),
    });
    expect(saveFileContent).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(previewPlan).not.toHaveBeenCalled();
  });
});
