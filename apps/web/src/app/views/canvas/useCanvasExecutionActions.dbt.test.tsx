// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../queries/queryKeys';
import { makePlanRef } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import {
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

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

function buildConfiguredDbtNodes(): CanonicalNode[] {
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
      id: 'warehouse-payments',
      name: 'Warehouse Payments',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'finance analytics',
          sourceName: 'finance_warehouse',
          schemaName: 'warehouse raw',
          tableName: 'payments_final',
        },
      },
    },
    {
      id: 'model-orders',
      name: 'Payments Model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: {
          packageName: 'finance analytics',
          materialized: 'table',
          selectedSourceId: 'warehouse-payments',
        },
      },
    },
  ];
}

function buildConfiguredDbtEdges(): CanonicalEdge[] {
  return [
    ...buildDbtEdges(),
    {
      id: 'edge-warehouse-payments-model',
      sourceId: 'warehouse-payments',
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
      schemaVersion: 'v1.2',
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

describe('useCanvasExecutionActions dbt vertical', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('flushes dbt draft truth before planning so generated code reflects applied card edits', async () => {
    const persistedPlan = buildDbtPersistedPlan();
    const plansService = createPlansServiceMock(persistedPlan);
    const runsService = createRunsServiceMock();
    const flushedNodes = buildConfiguredDbtNodes();
    const flushedEdges = buildConfiguredDbtEdges();
    const flushDraftForExecution = vi.fn(async () => ({
      ok: true as const,
      canonicalNodes: flushedNodes,
      canonicalEdges: flushedEdges,
      workspaceNodeIds: flushedNodes.map((node) => node.id),
    }));

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
      selectedNodeIds: ['source-orders'],
      workspaceNodeIds: ['source-orders', 'model-orders'],
      flushDraftForExecution,
    });
    await harness.render();

    await harness.clickPlan();

    expect(flushDraftForExecution).toHaveBeenCalledTimes(1);
    expect(harness.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      'models/payments_model.sql',
      expect.stringContaining("{{ source('finance_warehouse', 'payments_final') }}")
    );
    expect(harness.workspaceFileContentCommand.saveFileContent).not.toHaveBeenCalledWith(
      'models/orders_model.sql',
      expect.any(String)
    );
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              nodeId: 'model-orders',
              metadata: expect.objectContaining({
                displayName: 'Payments Model',
                sourceRef: 'warehouse-payments',
              }),
            }),
          ],
        }),
        selection: {
          mode: 'explicit',
          nodeIds: ['model-orders'],
        },
      })
    );
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
      selectedNodeIds: ['source-orders'],
      workspaceNodeIds: ['source-orders', 'model-orders'],
    });
    await harness.render();

    const invalidateQueries = vi.spyOn(harness.queryClient, 'invalidateQueries');
    await harness.clickPlan();

    expect(harness.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      'models/orders_model.sql',
      expect.stringContaining("{{ source('raw', 'orders') }}")
    );
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
      queryKey: queryKeys.workspace.fileContent('models/orders_model.sql'),
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
});
