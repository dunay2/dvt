import { describe, expect, it, vi } from 'vitest';

import { StoredPlanExecutabilityValidator } from '../../../../src/application/services/StoredPlanExecutabilityValidator.js';

import { makeAdapter, PLAN_REF, storedPlanArtifact } from './harness.js';

/**
 * Plan-fetch and ref-alignment cases for `StoredPlanExecutabilityValidator`.
 */
export function describeStoredPlanExecutabilityValidatorFetchAndAlignmentCases(): void {
  describe('StoredPlanExecutabilityValidator fetch and alignment checks', () => {
    it('rejects when the persisted executable plan metadata no longer matches the ref', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              planId: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            })
          ),
        },
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'temporal');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: 'PLAN_REF_MISMATCH: planId',
        cause: 'plan_ref',
      });
    });

    it('rejects when fetching the persisted executable plan fails', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () => {
            throw new Error('PLAN_NOT_FOUND: plan-1');
          }),
        },
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'temporal');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: 'PLAN_NOT_FOUND: plan-1',
        cause: 'plan_fetch',
      });
    });
  });
}
