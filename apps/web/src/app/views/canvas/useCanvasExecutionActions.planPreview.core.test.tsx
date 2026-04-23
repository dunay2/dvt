// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildPersistedPreviewPlan,
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
      canvasViewCopy.transformationRequiresThreeNodesMessage
    );
  });

  it('calls previewPlan when the transformation graph is valid', async () => {
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
        previewProfile: 'transformation-sql-first-v1',
        graphSource: expect.objectContaining({
          kind: 'generic-graph-v1',
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v1',
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
              metadata: expect.objectContaining({
                displayName: 'Source',
                tags: {
                  pluginId: 'dvt',
                  role: 'input',
                  kind: 'dvt:source',
                },
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
              metadata: expect.objectContaining({
                displayName: 'Transform',
                sourceRef: 'models/transform.sql',
                tags: {
                  pluginId: 'dvt',
                  role: 'transform',
                  kind: 'dvt:sql_transform',
                },
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
              metadata: expect.objectContaining({
                displayName: 'Sink',
                tags: {
                  pluginId: 'dvt',
                  role: 'output',
                  kind: 'dvt:sink',
                },
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

  it('plans against the selected transformation subgraph within a larger canvas', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const qualityNode: CanonicalNode = {
      id: 'quality-node',
      name: 'Quality check',
      pluginId: 'dvt',
      kind: 'dvt:test',
      role: 'check' as const,
      status: 'idle' as const,
      tags: [],
    };
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: [...canonicalNodes, qualityNode],
      canonicalEdges: [
        ...canonicalEdges,
        {
          id: 'edge-3',
          sourceId: 'sink-node',
          targetId: 'quality-node',
          relation: 'lineage',
        },
      ],
      selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
      workspaceNodeIds: ['source-node', 'transform-node', 'sink-node', 'quality-node'],
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: {
          mode: 'explicit',
          nodeIds: ['source-node', 'transform-node', 'sink-node'],
        },
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({ nodeId: 'source-node' }),
            expect.objectContaining({ nodeId: 'transform-node' }),
            expect.objectContaining({ nodeId: 'sink-node' }),
          ]),
        }),
      })
    );
    expect(harness.shellFeedback.success).toHaveBeenCalledWith(canvasViewCopy.planCreatedMessage);
  });

  it('stores a persisted preview result and enables Start Run after a valid plan', async () => {
    const persistedPlan = buildPersistedPreviewPlan();
    const plansService = createPlansServiceMock(persistedPlan);

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      initialPlan: null,
      stateful: true,
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(harness.text('plan-modal-state')).toBe('true');
    expect(harness.text('current-plan-sha')).toBe(persistedPlan.planRef?.sha256 ?? 'none');
    expect(harness.text('can-start-run')).toBe('true');
    expect(harness.text('plan-status-summary')).toBe(canvasViewCopy.planStatusPreviewReadyMessage);
  });

  it('reuses the selected-subgraph preview proof when Start Run follows a partial preview', async () => {
    const qualityNode: CanonicalNode = {
      id: 'quality-node',
      name: 'Quality check',
      pluginId: 'dvt',
      kind: 'dvt:test',
      role: 'check' as const,
      status: 'idle' as const,
      tags: [],
    };
    const persistedSelectedPlan = {
      ...buildPersistedPreviewPlan(),
      steps: [
        {
          id: 'prepare-orders',
          type: 'PREPARE_POSTGRES_TRANSFORM',
          name: 'Prepare orders',
          nodes: ['source-node'],
          policies: {},
        },
        {
          id: 'transform-orders',
          type: 'POSTGRES_SQL_TRANSFORM',
          name: 'Transform orders',
          nodes: ['transform-node'],
          policies: {},
        },
        {
          id: 'capture-orders',
          type: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          name: 'Capture evidence',
          nodes: ['sink-node'],
          policies: {},
        },
      ],
    };
    const plansService = createPlansServiceMock(persistedSelectedPlan);
    const runsService = createRunsServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService,
      initialPlan: null,
      stateful: true,
      canonicalNodes: [...buildCanonicalNodes(), qualityNode],
      canonicalEdges: [
        ...buildCanonicalEdges(),
        {
          id: 'edge-3',
          sourceId: 'sink-node',
          targetId: 'quality-node',
          relation: 'lineage',
        },
      ],
      selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
      workspaceNodeIds: ['source-node', 'transform-node', 'sink-node', 'quality-node'],
    });
    await harness.render();

    await harness.clickPlan();
    await harness.clickStartRun();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(runsService.startRun).toHaveBeenCalledTimes(1);
    expect(runsService.startRun).toHaveBeenCalledWith({
      planRef: persistedSelectedPlan.planRef,
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'mock',
      },
      selection: {
        mode: 'explicit',
        nodeIds: ['source-node', 'transform-node', 'sink-node'],
      },
    });
  });
});
