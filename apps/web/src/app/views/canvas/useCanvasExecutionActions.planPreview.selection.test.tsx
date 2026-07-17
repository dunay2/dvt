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

function buildQualityNode(): CanonicalNode {
  return {
    id: 'quality-node',
    name: 'Quality check',
    pluginId: 'dvt',
    kind: 'dvt:test',
    role: 'check' as const,
    status: 'idle' as const,
    tags: [],
  };
}

describe('useCanvasExecutionActions plan preview selection', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('plans against the selected transformation subgraph within a larger canvas', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const qualityNode = buildQualityNode();
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
      selectionIntent: {
        mode: 'explicit',
        nodeIds: ['source-node', 'transform-node', 'sink-node'],
      },
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

  it('plans the uniquely discoverable SQL-first path when the canvas also has extra source nodes', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const extraSource: CanonicalNode = {
      id: 'source-copy',
      name: 'Source copy',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['authoring'],
      metadata: {
        config: {
          schema: 'raw',
          table: 'orders_copy',
          alias: 'orders_copy',
        },
      },
    };
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: [...canonicalNodes, extraSource],
      canonicalEdges: buildCanonicalEdges(),
      workspaceNodeIds: [...canonicalNodes.map((node) => node.id), extraSource.id],
    });
    await harness.render();

    expect(harness.text('can-plan-graph')).toBe('true');

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: {
          mode: 'explicit',
          nodeIds: ['source-node', 'transform-node', 'sink-node'],
        },
        graphSource: expect.objectContaining({
          nodes: expect.not.arrayContaining([expect.objectContaining({ nodeId: 'source-copy' })]),
        }),
      })
    );
  });

  it('plans the full workspace workflow when selection is only a partial edit focus', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const plansService = createPlansServiceMock();

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes,
      canonicalEdges: buildCanonicalEdges(),
      selectionIntent: { mode: 'explicit', nodeIds: ['source-node'] },
      workspaceNodeIds: canonicalNodes.map((node) => node.id),
    });
    await harness.render();

    expect(harness.text('can-plan-graph')).toBe('true');

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: {
          mode: 'explicit',
          nodeIds: ['source-node', 'transform-node', 'sink-node'],
        },
      })
    );
  });

  it('reuses the selected-subgraph preview proof when Start Run follows a partial preview', async () => {
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
      canonicalNodes: [...buildCanonicalNodes(), buildQualityNode()],
      canonicalEdges: [
        ...buildCanonicalEdges(),
        {
          id: 'edge-3',
          sourceId: 'sink-node',
          targetId: 'quality-node',
          relation: 'lineage',
        },
      ],
      selectionIntent: {
        mode: 'explicit',
        nodeIds: ['source-node', 'transform-node', 'sink-node'],
      },
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
        targetAdapter: 'temporal',
      },
      selection: {
        mode: 'explicit',
        nodeIds: ['source-node', 'transform-node', 'sink-node'],
      },
    });
  });
});
