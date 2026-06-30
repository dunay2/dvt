// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('useCanvasExecutionActions plan preview guards', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('keeps raw plan-preview transport failures out of user-facing feedback', async () => {
    const plansService = {
      ...createPlansServiceMock(),
      previewPlan: vi.fn(async () => {
        throw new Error('Request to /plans/preview failed (500)');
      }),
    };

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.planUnableToCreateMessage
    );
    expect(harness.shellFeedback.error).not.toHaveBeenCalledWith(
      'Request to /plans/preview failed (500)'
    );
  });

  it('does not call previewPlan when the active canvas execution strategy is disabled', async () => {
    const plansService = createPlansServiceMock();
    const flushDraftForExecution = vi.fn(async () => ({
      ok: true as const,
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      workspaceNodeIds: buildCanonicalNodes().map((node) => node.id),
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      flushDraftForExecution,
      executionStrategy: {
        kind: 'not_executable',
      },
    });
    await harness.render();

    await harness.clickPlan();

    expect(flushDraftForExecution).not.toHaveBeenCalled();
    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.canvasExecutionUnavailableMessage
    );
    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-status-summary')).toBe(
      canvasViewCopy.canvasExecutionUnavailableMessage
    );
  });

  it('does not flush the draft when planning is not permitted', async () => {
    const plansService = createPlansServiceMock();
    const flushDraftForExecution = vi.fn(async () => ({
      ok: true as const,
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      workspaceNodeIds: buildCanonicalNodes().map((node) => node.id),
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      canonicalNodes: buildCanonicalNodes(),
      canonicalEdges: buildCanonicalEdges(),
      flushDraftForExecution,
      canPlan: false,
    });
    await harness.render();

    await harness.clickPlan();

    expect(flushDraftForExecution).not.toHaveBeenCalled();
    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(
      canvasViewCopy.planPermissionDeniedMessage
    );
  });
});
