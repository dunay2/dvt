// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildTestPostgresConnectionRef,
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

describe('useCanvasExecutionActions plan preview source metadata', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('builds a SQL-first preview directly from imported warehouse source metadata', async () => {
    const canonicalNodes = buildCanonicalNodes().map((node) =>
      node.id === 'source-node'
        ? {
            ...node,
            name: 'Imported Orders',
            pluginId: 'dvt.warehouse-source',
            tags: ['source', 'erp'],
            path: 'models/sources/src_erp.yml',
            metadata: {
              connectedSourceRef: {
                schemaVersion: 'connected-source-ref.v1',
                connectionRef: buildTestPostgresConnectionRef(),
                sourceObjectId: 'relation/analytics/erp/orders',
              },
              sourceName: 'warehouse_prod_analytics_erp',
              tableName: 'orders',
              database: 'analytics',
              schema: 'erp',
              config: {
                schema: 'stale_schema',
                table: 'stale_table',
              },
              columns: [{ name: 'id', type: 'number', nullable: false }],
            },
          }
        : node
    );
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes,
      canonicalEdges: buildCanonicalEdges(),
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-node',
              stepTypeConfig: expect.objectContaining({
                connectionRef: buildTestPostgresConnectionRef(),
                sourceSchema: 'erp',
                sourceTable: 'orders',
                sourceAlias: 'warehouse_prod_analytics_erp',
              }),
              metadata: expect.objectContaining({
                displayName: 'Imported Orders',
                sourceRef: 'models/sources/src_erp.yml',
                tags: {
                  pluginId: 'dvt.warehouse-source',
                  role: 'input',
                  kind: 'dvt:source',
                },
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('previews the plan with the active canvas execution environment when selected', async () => {
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      executionEnvironmentId: 'prod',
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'prod',
        }),
      })
    );
  });

  it('flushes transformation draft truth before planning so Plan matches the visible graph', async () => {
    const plansService = createPlansServiceMock();
    const flushedNodes = buildCanonicalNodes().map((node) =>
      node.id === 'source-node'
        ? {
            ...node,
            metadata: {
              connectionRef: buildTestPostgresConnectionRef(),
              config: {
                schema: 'raw',
                table: 'payments',
                alias: 'payments',
              },
            },
          }
        : node
    );
    const flushDraftForExecution = vi.fn(async () => ({
      ok: true as const,
      canonicalNodes: flushedNodes,
      canonicalEdges: buildCanonicalEdges(),
      workspaceNodeIds: flushedNodes.map((node) => node.id),
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      flushDraftForExecution,
    });
    await harness.render();

    await harness.clickPlan();

    expect(flushDraftForExecution).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-node',
              stepTypeConfig: expect.objectContaining({
                sourceTable: 'payments',
                sourceAlias: 'payments',
              }),
            }),
          ]),
        }),
      })
    );
  });
});
