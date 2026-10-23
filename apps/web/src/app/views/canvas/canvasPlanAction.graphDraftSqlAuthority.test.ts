import { describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorkspaceFilesQueryPort } from '../../ports/workspace';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import { executeCanvasPlanAction, type CanvasPlanExecution } from './canvasPlanAction';

const sourceNode: CanonicalNode = {
  id: 'source-orders',
  name: 'Raw Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
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
  pluginId: 'dvt',
  kind: 'dvt:transform',
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

function createGraphDraftPlanActionArgs(divergentSql = false): Parameters<
  typeof executeCanvasPlanAction
>[0] & {
  execution: Extract<CanvasPlanExecution, { kind: 'planner_generic_preview' }>;
} {
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
    getFileContent: vi.fn(async (path) => {
      if (!divergentSql) throw new WorkspaceFileLoadError('not_found', path);
      return {
        path,
        name: path.split('/').at(-1) ?? path,
        language: path.endsWith('.sql') ? 'sql' : 'yaml',
        content:
          path === 'models/orders.sql'
            ? 'select customer_secret from project_code_edit\n'
            : 'existing generated metadata',
        contentSha256: path === 'models/orders.sql' ? 'b'.repeat(64) : 'a'.repeat(64),
        lastModified: '2026-07-22T00:00:00.000Z',
      };
    }),
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

  return {
    graphDraftCanvasId: 'orders-canvas',
    canPlan: true,
    canonicalEdges: [edge],
    canonicalNodes: [sourceNode, modelNode],
    execution: {
      ...strategy,
      workspaceFilesQuery,
      graphDbtWorkspaceArtifactPublicationCommand: { publish },
      graphDbtModelCompilationQuery: {
        compile: vi.fn<IGraphDbtModelCompilationQueryPort['compile']>(),
      },
    },
    plansService: { previewPlan },
    selectionIntent: { mode: 'explicit', nodeIds: [modelNode.id] },
    sessionContext,
    workspaceNodeIds: [sourceNode.id, modelNode.id],
  };
}

describe('Canvas graph-draft DBT publication receipts', () => {
  it('refuses divergent pre-marker model SQL without an adoption path or confirmed writes', async () => {
    const args = createGraphDraftPlanActionArgs(true);
    const result = await executeCanvasPlanAction(args);

    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining('models/orders.sql'),
      writtenArtifactPaths: [],
    });
    expect(
      args.execution.graphDbtWorkspaceArtifactPublicationCommand.publish
    ).not.toHaveBeenCalled();
    expect(args.plansService.previewPlan).not.toHaveBeenCalled();
  });

  it.each(['invalid', 'unavailable', 'authority_refused', 'exception'] as const)(
    'retains acknowledged artifact paths when compilation returns %s',
    async (outcome) => {
      const args = createGraphDraftPlanActionArgs();
      const compile = vi.mocked(args.execution.graphDbtModelCompilationQuery.compile);
      if (outcome === 'exception') compile.mockRejectedValue(new Error('Compiler unavailable'));
      else if (outcome === 'authority_refused')
        compile.mockResolvedValue({
          schemaVersion: 'graph-dbt-model-compilation.v1',
          kind: outcome,
          canvasId: 'orders-canvas',
          reason: 'missing_authority',
        });
      else
        compile.mockResolvedValue({
          schemaVersion: 'graph-dbt-model-compilation.v1',
          kind: outcome,
          canvasId: 'orders-canvas',
          diagnostics: [{ code: 'dbt_compile_failed', message: 'Invalid model' }],
        });
      const result = await executeCanvasPlanAction(args);
      const published: Awaited<
        ReturnType<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>
      > = await vi.mocked(args.execution.graphDbtWorkspaceArtifactPublicationCommand.publish).mock
        .results[0]!.value;
      if (published.kind !== 'applied') throw new Error('Expected acknowledged publication.');
      expect(published.writes.length).toBeGreaterThan(0);
      expect(result).toMatchObject({
        ok: false,
        writtenArtifactPaths: published.writes.map((write) => write.path),
      });
      expect(args.plansService.previewPlan).not.toHaveBeenCalled();
    }
  );

  it('does not invent confirmed paths when publication itself rejects', async () => {
    const args = createGraphDraftPlanActionArgs();
    vi.mocked(args.execution.graphDbtWorkspaceArtifactPublicationCommand.publish).mockRejectedValue(
      new Error('Publication unacknowledged')
    );
    const result = await executeCanvasPlanAction(args);
    expect(result).toMatchObject({
      ok: false,
      message: 'Publication unacknowledged',
      writtenArtifactPaths: [],
    });
    expect(args.execution.graphDbtModelCompilationQuery.compile).not.toHaveBeenCalled();
    expect(args.plansService.previewPlan).not.toHaveBeenCalled();
  });

  it('reports no artifact effects when permission denies Preview before publication', async () => {
    const args = createGraphDraftPlanActionArgs();
    const result = await executeCanvasPlanAction({ ...args, canPlan: false });
    expect(result).toMatchObject({ ok: false, writtenArtifactPaths: [] });
    expect(
      args.execution.graphDbtWorkspaceArtifactPublicationCommand.publish
    ).not.toHaveBeenCalled();
  });
});
