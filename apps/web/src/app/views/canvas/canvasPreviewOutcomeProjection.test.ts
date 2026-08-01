import type { PlanPreviewOutcome } from '../../ports/plans';
import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import { describe, expect, it } from 'vitest';

import { projectCanvasPreviewOutcome } from './canvasPreviewOutcomeProjection';

const previewedPlan = {
  ...mockExecutionPlan,
  planRef: mockExecutionPlan.planRef!,
};

describe('projectCanvasPreviewOutcome', () => {
  it('keeps an accepted plan outside the blocker set', () => {
    expect(projectCanvasPreviewOutcome({ kind: 'accepted', plan: previewedPlan })).toEqual({
      currentPlan: previewedPlan,
      readinessBlocker: null,
      diagnostic: null,
    });
  });

  it('clears plan identity when selection is rejected before planning', () => {
    expect(
      projectCanvasPreviewOutcome({
        kind: 'selection-rejected',
        rejection: {
          code: 'REJECTED',
          cause: 'selection_scope',
          reason: 'Selection is outside the authorized scope.',
        },
      })
    ).toEqual({
      currentPlan: null,
      readinessBlocker: 'plan_integrity',
      diagnostic: {
        code: 'REJECTED',
        cause: 'selection_scope',
        reason: 'Selection is outside the authorized scope.',
      },
    });
  });

  it.each(['MISSING_CAPABILITY', 'POLICY_UNSUPPORTED', 'INVALID_STEP_KIND'] as const)(
    'maps %s to the existing capability blocker',
    (code) => {
      const outcome: PlanPreviewOutcome = {
        kind: 'plan-invalid',
        plan: previewedPlan,
        validation: {
          status: 'ERROR',
          planId: previewedPlan.planId,
          adapterId: 'temporal',
          code,
          degradable: false,
          reason: `Rejected with ${code}`,
        },
      };

      expect(projectCanvasPreviewOutcome(outcome)).toMatchObject({
        currentPlan: previewedPlan,
        readinessBlocker: 'capability_mismatch',
        diagnostic: { code, reason: `Rejected with ${code}` },
      });
    }
  );

  it.each(['UNSUPPORTED_PLAN_VERSION', 'REJECTED'] as const)(
    'maps %s to the existing integrity blocker',
    (code) => {
      const outcome: PlanPreviewOutcome = {
        kind: 'plan-invalid',
        plan: previewedPlan,
        validation: {
          status: 'ERROR',
          planId: previewedPlan.planId,
          adapterId: 'temporal',
          code,
          degradable: false,
          reason: `Rejected with ${code}`,
        },
      };

      expect(projectCanvasPreviewOutcome(outcome)).toMatchObject({
        currentPlan: previewedPlan,
        readinessBlocker: 'plan_integrity',
        diagnostic: { code, reason: `Rejected with ${code}` },
      });
    }
  );

  it('fails closed when a future executability code reaches the mapper', () => {
    const outcome = {
      kind: 'plan-invalid',
      plan: previewedPlan,
      validation: {
        status: 'ERROR',
        planId: previewedPlan.planId,
        adapterId: 'temporal',
        code: 'FUTURE_REJECTION',
        degradable: false,
        reason: 'A future validator rejected this plan.',
      },
    } as unknown as PlanPreviewOutcome;

    expect(projectCanvasPreviewOutcome(outcome)).toEqual({
      currentPlan: previewedPlan,
      readinessBlocker: 'plan_integrity',
      diagnostic: { code: 'FUTURE_REJECTION' },
    });
  });

  it('drops untrusted diagnostics when a future selection code reaches the mapper', () => {
    const outcome = {
      kind: 'selection-rejected',
      rejection: {
        code: 'FUTURE_SELECTION_REJECTION',
        cause: '<unsafe>future selection cause</unsafe>',
        reason: '<unsafe>future selection reason</unsafe>',
      },
    } as unknown as PlanPreviewOutcome;

    expect(projectCanvasPreviewOutcome(outcome)).toEqual({
      currentPlan: null,
      readinessBlocker: 'plan_integrity',
      diagnostic: { code: 'FUTURE_SELECTION_REJECTION' },
    });
  });

  it('fails closed without inventing copy when a future outcome kind reaches the mapper', () => {
    const outcome = { kind: 'future-outcome' } as unknown as PlanPreviewOutcome;

    expect(projectCanvasPreviewOutcome(outcome)).toEqual({
      currentPlan: null,
      readinessBlocker: 'plan_integrity',
      diagnostic: {
        code: 'UNKNOWN_PREVIEW_OUTCOME',
        cause: 'future-outcome',
      },
    });
  });
});
