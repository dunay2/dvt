import { describe, expect, it } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import { makePlanRef } from '../../testing/contractTestUtils';
import { canvasViewCopy } from './copy';
import {
  observePlanRunReadiness,
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

  it('publishes a ready ObservePlanRunReadiness read model when run inputs are admitted', () => {
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

    expect(
      observePlanRunReadiness({
        canRun: true,
        currentPlan: plan,
        isCurrentPlanStale: false,
        persistedPreviewIdentityMismatch: false,
        hasPersistedPlanForRun: true,
      })
    ).toEqual({
      blockers: [],
      rail: 'ObservePlanRunReadiness',
      status: 'ready',
      summary: canvasViewCopy.planStatusPreviewReadyMessage,
    });
  });

  it.each([
    ['plan_integrity', { currentPlan: null }],
    ['backpressure', { backpressure: true }],
    ['capability_mismatch', { capabilityMismatch: true }],
    ['adapter_degraded', { adapterDegraded: true }],
    ['authorization_denied', { canRun: false }],
  ] as const)(
    'keeps %s explicit in the ObservePlanRunReadiness read model',
    (expectedBlocker, overrides) => {
      expect(
        observePlanRunReadiness({
          canRun: true,
          currentPlan: {
            ...mockExecutionPlan,
            preview: {
              ...mockExecutionPlan.preview!,
              persisted: {
                planRecordId: mockExecutionPlan.planId,
                canonicalPlanSha256: 'b'.repeat(64),
              },
            },
          },
          isCurrentPlanStale: false,
          persistedPreviewIdentityMismatch: false,
          hasPersistedPlanForRun: true,
          ...overrides,
        }).blockers
      ).toContain(expectedBlocker);
    }
  );
});
