// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../queries/queryKeys';
import {
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';
import { makePlanRef } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';

function buildDbtNodes(
  overrides: {
    tableName?: string;
    schemaName?: string;
    columnName?: string;
    materialized?: string;
  } = {}
): CanonicalNode[] {
  return [
    {
      id: 'source-orders',
      name: 'Raw Orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        columns: [{ name: overrides.columnName ?? 'order_id', type: 'bigint' }],
        dbt: {
          packageName: 'analytics',
          sourceName: 'raw',
          schemaName: overrides.schemaName ?? 'raw',
          tableName: overrides.tableName ?? 'orders',
        },
      },
    },
    {
      id: 'model-orders',
      name: 'Orders Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: overrides.materialized ?? 'table',
          selectedSourceId: 'source-orders',
        },
      },
    },
  ];
}

function buildDbtEdges(): CanonicalEdge[] {
  return [
    {
      id: 'edge-source-model',
      sourceId: 'source-orders',
      targetId: 'model-orders',
      relation: 'lineage',
    },
  ];
}

function buildDbtPersistedPlan(): PlanViewModel {
  return {
    planId: 'plan-record-1',
    planVersion: '1.0',
    planRef: makePlanRef({
      uri: 'dvt://plans/plan-record-1',
      sha256: 'c'.repeat(64),
      schemaVersion: '1.0',
      planId: 'plan-record-1',
      planVersion: '1.0',
    }),
    generatedAt: '2026-05-26T00:00:00.000Z',
    adapter: 'temporal',
    target: 'env',
    capabilities: [],
    preview: {
      persisted: {
        planRecordId: 'plan-record-1',
        canonicalPlanSha256: 'c'.repeat(64),
      },
    },
    steps: [
      {
        id: 'model-orders',
        type: 'DBT_MODEL',
        name: 'Orders Model',
        nodes: ['model-orders'],
        policies: {},
      },
    ],
  };
}

describe('useCanvasExecutionActions dbt preview and run', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it.each([
    { changedField: 'table', overrides: { tableName: 'payments' } },
    { changedField: 'schema', overrides: { schemaName: 'staging' } },
    { changedField: 'columns', overrides: { columnName: 'customer_id' } },
    { changedField: 'materialization', overrides: { materialized: 'view' } },
  ])(
    'blocks Run after $changedField changes until Preview is recreated for the current artifacts',
    async ({ overrides }) => {
      const originalNodes = buildDbtNodes();
      const plansService = createPlansServiceMock(buildDbtPersistedPlan());
      const runsService = createRunsServiceMock();
      harness = renderExecutionActionsHarness({
        plansService,
        runsService,
        initialPlan: null,
        stateful: true,
        canonicalNodes: originalNodes,
        canonicalEdges: buildDbtEdges(),
        executionStrategy: {
          kind: 'planner_generic_preview',
          previewProfile: 'planner-generic-v1',
          sourceFamily: 'dbt',
        },
        selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
        workspaceNodeIds: ['source-orders', 'model-orders'],
      });
      await harness.render();
      await harness.clickPlan();
      expect(harness.text('can-start-run')).toBe('true');

      await harness.rerender({ canonicalNodes: buildDbtNodes(overrides) });
      expect(harness.text('can-start-run')).toBe('false');
      await harness.clickStartRun();
      expect(runsService.startRun).not.toHaveBeenCalled();

      await harness.clickPlan();
      expect(plansService.previewPlan).toHaveBeenCalledTimes(2);
      expect(harness.text('can-start-run')).toBe('true');
      await harness.clickStartRun();
      expect(runsService.startRun).toHaveBeenCalledTimes(1);
    }
  );

  it('generates dbt files, previews planner-generic-v1, and enables run from persisted PlanRef', async () => {
    const persistedPlan = buildDbtPersistedPlan();
    const plansService = createPlansServiceMock(persistedPlan);
    const runsService = createRunsServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService,
      initialPlan: null,
      stateful: true,
      canonicalNodes: buildDbtNodes(),
      canonicalEdges: buildDbtEdges(),
      executionStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
      workspaceNodeIds: ['source-orders', 'model-orders'],
    });
    await harness.render();

    const invalidateQueries = vi.spyOn(harness.queryClient, 'invalidateQueries');
    await harness.clickPlan();

    expect(harness.graphDbtWorkspaceArtifactPublicationCommand.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            path: 'models/orders_model.sql',
            content: expect.stringContaining("{{ source('raw', 'orders') }}"),
            expectedRevision: { kind: 'absent' },
            writeRequired: true,
          }),
        ]),
      })
    );
    expect(harness.graphDbtModelCompilationQuery.compile).toHaveBeenCalledWith({
      canvasId: 'test-canvas',
      selectors: ['orders_model'],
    });
    expect(
      vi.mocked(harness.graphDbtWorkspaceArtifactPublicationCommand.publish).mock
        .invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.graphDbtModelCompilationQuery.compile).mock.invocationCallOrder[0]!
    );
    expect(
      vi.mocked(harness.graphDbtModelCompilationQuery.compile).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(plansService.previewPlan).mock.invocationCallOrder[0]!);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'planner-generic-v1',
        graphSource: expect.objectContaining({
          sourceFamily: 'dbt',
          nodes: [
            expect.objectContaining({
              nodeId: 'model-orders',
              stepKind: 'DBT_MODEL',
            }),
          ],
        }),
        selection: {
          mode: 'explicit',
          nodeIds: ['model-orders'],
        },
        persist: true,
      })
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.fileContent('tenant::project::env', 'models/orders_model.sql'),
    });
    expect(harness.text('can-start-run')).toBe('true');

    await harness.clickStartRun();

    expect(runsService.startRun).toHaveBeenCalledWith({
      planRef: persistedPlan.planRef,
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      },
      selection: {
        mode: 'explicit',
        nodeIds: ['model-orders'],
      },
    });
  });

  it('blocks Preview when native DBT compilation rejects a generated model', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const compile = vi.fn(async () => ({
      schemaVersion: 'graph-dbt-model-compilation.v1' as const,
      kind: 'invalid' as const,
      canvasId: 'test-canvas',
      diagnostics: [{ code: 'dbt_compile_failed', message: 'Unsafe backend detail' }],
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService,
      canonicalNodes: buildDbtNodes(),
      canonicalEdges: buildDbtEdges(),
      executionStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
      workspaceNodeIds: ['source-orders', 'model-orders'],
      graphDbtModelCompilationQuery: { compile },
    });
    await harness.render();
    const invalidate = vi.spyOn(harness.queryClient, 'invalidateQueries');
    await harness.clickPlan();

    expect(compile).toHaveBeenCalledOnce();
    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      expect.stringContaining('native DBT compilation')
    );
    expect(harness.shellFeedback.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Unsafe backend detail')
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.fileTree('tenant::project::env'),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.artifacts('tenant::project::env'),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.fileContent('tenant::project::env', 'models/orders_model.sql'),
    });
    expect(invalidate.mock.invocationCallOrder.at(-1)).toBeLessThan(
      vi.mocked(harness.shellFeedback.error).mock.invocationCallOrder[0]!
    );
    expect(harness.text('current-plan-sha')).toBe('none');
    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-modal-state')).toBe('false');
    expect(runsService.startRun).not.toHaveBeenCalled();
  });

  it.each(['compile', 'preview'] as const)(
    'refreshes confirmed files when %s throws after publication',
    async (phase) => {
      const plansService = createPlansServiceMock();
      if (phase === 'preview')
        vi.mocked(plansService.previewPlan).mockRejectedValue(new Error('Preview unavailable'));
      harness = renderExecutionActionsHarness({
        plansService,
        runsService: createRunsServiceMock(),
        initialPlan: null,
        stateful: true,
        canonicalNodes: buildDbtNodes(),
        canonicalEdges: buildDbtEdges(),
        executionStrategy: {
          kind: 'planner_generic_preview',
          previewProfile: 'planner-generic-v1',
          sourceFamily: 'dbt',
        },
        selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
        workspaceNodeIds: ['source-orders', 'model-orders'],
      });
      if (phase === 'compile')
        vi.mocked(harness.graphDbtModelCompilationQuery.compile).mockRejectedValue(
          new Error('Compilation unavailable')
        );
      await harness.render();
      const invalidate = vi.spyOn(harness.queryClient, 'invalidateQueries');
      await harness.clickPlan();
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.workspace.fileContent(
          'tenant::project::env',
          'models/orders_model.sql'
        ),
      });
      expect(harness.shellFeedback.error).toHaveBeenCalledOnce();
      expect(harness.text('current-plan-sha')).toBe('none');
      expect(harness.text('plan-modal-state')).toBe('false');
      expect(harness.text('can-start-run')).toBe('false');
    }
  );

  it.each(['authority_refused', 'unchanged'] as const)(
    'does not invalidate workspace queries for %s publication',
    async (kind) => {
      const plansService = createPlansServiceMock();
      harness = renderExecutionActionsHarness({
        plansService,
        runsService: createRunsServiceMock(),
        initialPlan: null,
        stateful: true,
        canonicalNodes: buildDbtNodes(),
        canonicalEdges: buildDbtEdges(),
        executionStrategy: {
          kind: 'planner_generic_preview',
          previewProfile: 'planner-generic-v1',
          sourceFamily: 'dbt',
        },
        selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
        workspaceNodeIds: ['source-orders', 'model-orders'],
      });
      vi.mocked(harness.graphDbtWorkspaceArtifactPublicationCommand.publish).mockResolvedValue(
        kind === 'authority_refused'
          ? {
              schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
              kind,
              canvasId: 'test-canvas',
              reason: 'missing_authority',
            }
          : {
              schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
              kind: 'applied',
              idempotencyKey: 'unchanged',
              requestHash: 'e'.repeat(64),
              deduplicated: true,
              writes: [],
            }
      );
      vi.mocked(harness.graphDbtModelCompilationQuery.compile).mockRejectedValue(
        new Error('Compilation unavailable')
      );
      await harness.render();
      const invalidate = vi.spyOn(harness.queryClient, 'invalidateQueries');
      await harness.clickPlan();
      expect(invalidate).not.toHaveBeenCalled();
      expect(harness.shellFeedback.error).toHaveBeenCalledOnce();
      expect(plansService.previewPlan).not.toHaveBeenCalled();
      expect(harness.text('current-plan-sha')).toBe('none');
      expect(harness.text('plan-modal-state')).toBe('false');
      expect(harness.text('can-start-run')).toBe('false');
    }
  );

  it('keeps dbt preview executable when model code is generated by the dbt plugin projection', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const emptyModelNodes = buildDbtNodes().map((node) =>
      node.kind === 'dvt:transform'
        ? {
            ...node,
            metadata: {
              dbt: {
                packageName: 'analytics',
                materialized: 'table',
                selectedSourceId: 'source-orders',
              },
            },
          }
        : node
    );

    harness = renderExecutionActionsHarness({
      plansService,
      runsService,
      initialPlan: null,
      stateful: true,
      canonicalNodes: emptyModelNodes,
      canonicalEdges: buildDbtEdges(),
      executionStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
      workspaceNodeIds: ['source-orders', 'model-orders'],
    });
    await harness.render();

    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-run-readiness-status')).toBe('blocked');
    expect(harness.text('plan-status-summary')).toBe('Preview required before running.');

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.objectContaining({
          sourceFamily: 'dbt',
        }),
      })
    );
    expect(harness.shellFeedback.error).not.toHaveBeenCalled();
  });

  it('previews a model chain when the terminal model has stale duplicate origin metadata', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const [source, upstreamModel] = buildDbtNodes();
    const terminalModel: CanonicalNode = {
      id: 'model-orders-final',
      name: 'Orders Final',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'view',
          selectedSourceId: 'detached-model',
        },
      },
    };
    const chainEdges: CanonicalEdge[] = [
      ...buildDbtEdges(),
      {
        id: 'edge-model-model',
        sourceId: upstreamModel!.id,
        targetId: terminalModel.id,
        relation: 'lineage',
      },
    ];

    harness = renderExecutionActionsHarness({
      plansService,
      runsService,
      initialPlan: null,
      stateful: true,
      canonicalNodes: [source!, upstreamModel!, terminalModel],
      canonicalEdges: chainEdges,
      executionStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      selectionIntent: { mode: 'explicit', nodeIds: [terminalModel.id] },
      workspaceNodeIds: [source!.id, upstreamModel!.id, terminalModel.id],
    });
    await harness.render();
    await harness.clickPlan();

    expect(harness.graphDbtWorkspaceArtifactPublicationCommand.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            path: 'models/orders_final.sql',
            content: expect.stringContaining("{{ ref('orders_model') }}"),
          }),
        ]),
      })
    );
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: terminalModel.id,
              metadata: expect.objectContaining({ sourceRef: upstreamModel!.id }),
            }),
          ]),
        }),
      })
    );
    expect(harness.shellFeedback.error).not.toHaveBeenCalled();
  });
});
