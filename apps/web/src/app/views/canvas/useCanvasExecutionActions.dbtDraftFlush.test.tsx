// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
        columns: [{ name: 'order_id', type: 'bigint' }],
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
        columns: [{ name: 'order_id', type: 'bigint' }],
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
        columns: [{ name: 'payment_id', type: 'bigint' }],
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

describe('useCanvasExecutionActions dbt draft flush', () => {
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
      selectionIntent: { mode: 'explicit', nodeIds: ['model-orders'] },
      workspaceNodeIds: ['source-orders', 'model-orders'],
      flushDraftForExecution,
    });
    await harness.render();

    await harness.clickPlan();

    expect(flushDraftForExecution).toHaveBeenCalledTimes(1);
    expect(harness.graphDbtWorkspaceArtifactPublicationCommand.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            path: 'models/payments_model.sql',
            content: expect.stringContaining("{{ source('finance_warehouse', 'payments_final') }}"),
            expectedRevision: { kind: 'absent' },
            writeRequired: true,
          }),
        ]),
      })
    );
    const publicationRequest = vi.mocked(
      harness.graphDbtWorkspaceArtifactPublicationCommand.publish
    ).mock.calls[0]![0];
    expect(
      publicationRequest.artifacts.some((artifact) => artifact.path === 'models/orders_model.sql')
    ).toBe(false);
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
});
