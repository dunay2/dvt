// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../queries/queryKeys';
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

describe('useCanvasExecutionActions plan preview persistence', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
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

  it('invalidates workspace project-source queries after a successful graph artifact save', async () => {
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

    const invalidateQueries = vi.spyOn(harness.queryClient, 'invalidateQueries');
    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.fileTree(),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.fileContent('pipelines/sales_pipeline.yaml'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.workspace.artifacts(),
    });
  });
});
