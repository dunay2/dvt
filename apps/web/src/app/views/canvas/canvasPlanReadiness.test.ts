import { describe, expect, it } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import { makePlanRef } from '../../testing/contractTestUtils';
import {
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  resolvePlanRefForStartRun,
} from './canvasPlanReadiness';

describe('canvasPlanReadiness', () => {
  it('returns planRef from the execution plan when available', () => {
    const planRef = resolvePlanRefForStartRun(mockExecutionPlan);

    expect(planRef).toEqual(mockExecutionPlan.planRef);
  });

  it('returns null when planRef is missing', () => {
    const planRef = resolvePlanRefForStartRun({
      ...mockExecutionPlan,
      planRef: undefined,
    });

    expect(planRef).toBeNull();
  });

  it('accepts persisted preview proof when plan identity aligns even if canonical and executable hashes differ', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_live_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_live_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_live_1',
          canonicalPlanSha256: 'b'.repeat(64),
        },
      },
    };

    expect(hasPersistedPreviewProof(plan)).toBe(true);
    expect(hasPersistedPreviewIdentityMismatch(plan)).toBe(false);
  });

  it('reports persisted preview mismatch when plan record identity drifts from the active plan', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_live_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_live_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_other',
          canonicalPlanSha256: 'b'.repeat(64),
        },
      },
    };

    expect(hasPersistedPreviewProof(plan)).toBe(false);
    expect(hasPersistedPreviewIdentityMismatch(plan)).toBe(true);
  });
});
