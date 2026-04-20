// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildRunnableExecutionPlan,
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

type PreviewPlannedScenario = {
  canonicalNodes: CanonicalNode[];
  canonicalEdges: ReturnType<typeof buildCanonicalEdges>;
  plansService: ReturnType<typeof createPlansServiceMock>;
  harness: ReturnType<typeof renderExecutionActionsHarness>;
};

async function renderPlannedPreviewScenario(args?: {
  canonicalNodes?: CanonicalNode[];
  canonicalEdges?: ReturnType<typeof buildCanonicalEdges>;
  plansService?: ReturnType<typeof createPlansServiceMock>;
}): Promise<PreviewPlannedScenario> {
  const canonicalNodes = args?.canonicalNodes ?? buildCanonicalNodes();
  const canonicalEdges = args?.canonicalEdges ?? buildCanonicalEdges();
  const plansService = args?.plansService ?? createPlansServiceMock();
  const harness = renderExecutionActionsHarness({
    plansService,
    runsService: createRunsServiceMock(),
    currentPlan: null,
    canonicalNodes,
    canonicalEdges,
  });

  await harness.render();
  await harness.clickPlan();

  return {
    canonicalNodes,
    canonicalEdges,
    plansService,
    harness,
  };
}

describe('useCanvasExecutionActions plan preview freshness', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('blocks startRun when the graph has changed since preview', async () => {
    const previewedScenario = await renderPlannedPreviewScenario();
    harness = previewedScenario.harness;

    await harness.rerender({
      currentPlan: buildRunnableExecutionPlan(),
      canonicalEdges: previewedScenario.canonicalEdges.slice(0, 1),
    });

    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-status-summary')).toBe(
      canvasViewCopy.runPreviewStaleMessage
    );

    await harness.clickStartRun();

    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.runPreviewStaleMessage
    );
  });

  it('keeps preview current when only raw metadata changes without changing the projected graph source', async () => {
    const previewedScenario = await renderPlannedPreviewScenario();
    harness = previewedScenario.harness;

    const updatedNodes = previewedScenario.canonicalNodes.map((node) =>
      node.id === 'transform-node'
        ? {
            ...node,
            metadata: { uiHint: 'changed' },
          }
        : node
    );

    await harness.rerender({
      currentPlan: buildRunnableExecutionPlan(),
      canonicalNodes: updatedNodes,
    });

    expect(harness.text('can-start-run')).toBe('true');
    expect(harness.text('plan-status-summary')).toBe(canvasViewCopy.planStatusPreviewReadyMessage);

    await harness.clickPlan();

    expect(previewedScenario.plansService.previewPlan).toHaveBeenCalledTimes(2);
    expect(vi.mocked(previewedScenario.plansService.previewPlan).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
            }),
          ]),
        },
      })
    );
  });

  it('marks preview stale and rebuilds payload when node kind changes without id changes', async () => {
    const previewedScenario = await renderPlannedPreviewScenario();
    harness = previewedScenario.harness;

    const updatedNodes = previewedScenario.canonicalNodes.map((node) =>
      node.id === 'transform-node'
        ? {
            ...node,
            pluginId: 'dbt',
            kind: 'dbt:model' as const,
            name: 'Transform renamed',
            path: 'models/transform.sql',
          }
        : node
    );

    await harness.rerender({
      currentPlan: buildRunnableExecutionPlan(),
      canonicalNodes: updatedNodes,
    });

    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-status-summary')).toBe(
      canvasViewCopy.runPreviewStaleMessage
    );

    await harness.clickPlan();

    expect(previewedScenario.plansService.previewPlan).toHaveBeenCalledTimes(2);
    expect(vi.mocked(previewedScenario.plansService.previewPlan).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
              metadata: expect.objectContaining({
                displayName: 'Transform renamed',
                sourceRef: 'models/transform.sql',
              }),
            }),
          ]),
        },
      })
    );
  });
});
