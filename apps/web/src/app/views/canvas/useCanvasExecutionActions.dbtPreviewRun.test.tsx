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

function buildDbtNodes(): CanonicalNode[] {
  return [
    {
      id: 'source-orders',
      name: 'Raw Orders',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'analytics',
          sourceName: 'raw',
          schemaName: 'raw',
          tableName: 'orders',
        },
      },
    },
    {
      id: 'model-orders',
      name: 'Orders Model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'table',
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
    await harness.clickPlan();

    expect(compile).toHaveBeenCalledOnce();
    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      expect.stringContaining('native DBT compilation')
    );
    expect(harness.shellFeedback.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Unsafe backend detail')
    );
  });

  it('keeps dbt preview executable when model code is generated by the dbt plugin projection', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const emptyModelNodes = buildDbtNodes().map((node) =>
      node.kind === 'dbt:model'
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
});
