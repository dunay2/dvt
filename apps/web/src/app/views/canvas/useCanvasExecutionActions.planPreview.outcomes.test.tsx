// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import {
  buildPersistedPreviewPlan,
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

describe('useCanvasExecutionActions authoritative preview outcomes', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('clears a previous plan and blocks readiness after selection rejection', async () => {
    const plansService = createPlansServiceMock();
    plansService.previewPlan = vi.fn<IPlansPort['previewPlan']>(async () => ({
      kind: 'selection-rejected',
      rejection: {
        code: 'REJECTED',
        cause: 'selection_scope',
        reason: 'Selection is outside the authorized scope.',
      },
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      stateful: true,
      initialPlan: buildPersistedPreviewPlan(),
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.text('latest-preview-outcome')).toBe('selection-rejected');
    expect(harness.text('current-plan-sha')).toBe('none');
    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-run-readiness-blockers')).toContain('plan_integrity');
    expect(harness.text('plan-status-summary')).toBe('Selection is outside the authorized scope.');
  });

  it('retains the exact invalid plan and maps capability failures once', async () => {
    const invalidPlan = buildPersistedPreviewPlan();
    const plansService = createPlansServiceMock();
    plansService.previewPlan = vi.fn<IPlansPort['previewPlan']>(async () => ({
      kind: 'plan-invalid',
      plan: { ...invalidPlan, planRef: invalidPlan.planRef! },
      validation: {
        status: 'ERROR',
        planId: invalidPlan.planId,
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        cause: 'executor.dbt',
        degradable: false,
        reason: 'The target adapter lacks executor.dbt.',
      },
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      stateful: true,
      initialPlan: null,
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.text('latest-preview-outcome')).toBe('plan-invalid');
    expect(harness.text('current-plan-sha')).toBe(invalidPlan.planRef?.sha256);
    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-run-readiness-blockers')).toContain('capability_mismatch');
    expect(harness.text('plan-status-summary')).toBe('The target adapter lacks executor.dbt.');
  });

  it('keeps local authorization before the authoritative blocker deterministically', async () => {
    const invalidPlan = buildPersistedPreviewPlan();
    const plansService = createPlansServiceMock();
    plansService.previewPlan = vi.fn<IPlansPort['previewPlan']>(async () => ({
      kind: 'plan-invalid',
      plan: { ...invalidPlan, planRef: invalidPlan.planRef! },
      validation: {
        status: 'ERROR',
        planId: invalidPlan.planId,
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'The target adapter lacks executor.dbt.',
      },
    }));

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      stateful: true,
      initialPlan: null,
      canRun: false,
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.text('plan-run-readiness-blockers')).toBe(
      'authorization_denied,capability_mismatch'
    );
    expect(harness.text('plan-status-summary')).toBe('The target adapter lacks executor.dbt.');
  });

  it('keeps an accepted outcome on the existing runnable path', async () => {
    const acceptedPlan = buildPersistedPreviewPlan();

    harness = renderExecutionActionsHarness({
      plansService: createPlansServiceMock(acceptedPlan),
      runsService: createRunsServiceMock(),
      stateful: true,
      initialPlan: null,
    });
    await harness.render();

    await harness.clickPlan();

    expect(harness.text('latest-preview-outcome')).toBe('accepted');
    expect(harness.text('current-plan-sha')).toBe(acceptedPlan.planRef?.sha256);
    expect(harness.text('can-start-run')).toBe('true');
    expect(harness.text('plan-run-readiness-blockers')).toBe('none');
  });
});
