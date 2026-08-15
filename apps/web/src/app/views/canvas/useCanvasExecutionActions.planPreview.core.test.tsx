// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

describe('useCanvasExecutionActions plan preview core', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('does not call previewPlan when the transformation graph is invalid', async () => {
    const canonicalEdges = buildCanonicalEdges();
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes().slice(0, 2),
      canonicalEdges: canonicalEdges.slice(0, 1),
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.transformationRequiresExecutablePathMessage
    );
  });

  it('calls previewPlan with the SQL-first graph source when the graph is valid', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes,
      canonicalEdges,
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v2',
        graphSource: expect.objectContaining({
          kind: 'generic-graph-v1',
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v2',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-node',
              stepKind: 'PREPARE_POSTGRES_TRANSFORM',
              dependsOn: [],
              stepTypeConfig: expect.objectContaining({
                targetSchema: 'analytics',
                sourceSchema: 'raw',
                sourceTable: 'orders',
                sourceAlias: 'orders',
              }),
            }),
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
              dependsOn: ['source-node'],
              stepTypeConfig: expect.objectContaining({
                dialect: 'postgres',
                entrypoint: 'models/transform.sql',
                sinkSchema: 'analytics',
                sinkTable: 'orders_dashboard',
                sql: 'select * from analytics.orders',
                writeMode: 'replace',
              }),
            }),
            expect.objectContaining({
              nodeId: 'sink-node',
              stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
              dependsOn: ['transform-node'],
              stepTypeConfig: expect.objectContaining({
                sinkSchema: 'analytics',
                sinkTable: 'orders_dashboard',
                materialization: 'table',
                writeMode: 'replace',
              }),
            }),
          ]),
        }),
        selection: {
          mode: 'explicit',
          nodeIds: ['source-node', 'transform-node', 'sink-node'],
        },
        context: expect.objectContaining({
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'env',
        }),
        provenance: expect.objectContaining({
          graphArtifact: expect.objectContaining({
            path: 'pipelines/sales_pipeline.yaml',
          }),
          sqlArtifact: expect.objectContaining({
            path: 'models/transform.sql',
          }),
        }),
        persist: true,
      })
    );
    expect(harness.shellFeedback.success).toHaveBeenCalledWith(canvasViewCopy.planCreatedMessage);
    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-status-summary')).toBe(
      canvasViewCopy.planStatusPreviewRequiredMessage
    );
  });
});
