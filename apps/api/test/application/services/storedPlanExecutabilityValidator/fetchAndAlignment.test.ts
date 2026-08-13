import { describe, expect, it } from 'vitest';

import { StoredPlanMaterializationError } from '../../../../src/application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../../../../src/application/services/StoredPlanExecutabilityValidator.js';

import { makeAdapter, makeMaterializer, validationInput } from './harness.js';

/**
 * Plan-fetch and ref-alignment cases for `StoredPlanExecutabilityValidator`.
 */
function describeStoredPlanExecutabilityValidatorFetchAndAlignmentCases(): void {
  describe('StoredPlanExecutabilityValidator fetch and alignment checks', () => {
    it('maps a typed plan-reference materialization failure', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        materializer: makeMaterializer(() => {
          throw new StoredPlanMaterializationError('plan_ref', 'PLAN_REF_MISMATCH: planId');
        }),
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(validationInput());

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
        materializer: makeMaterializer(() => {
          throw new StoredPlanMaterializationError('artifact_fetch', 'PLAN_NOT_FOUND: plan-1');
        }),
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: 'PLAN_NOT_FOUND: plan-1',
        cause: 'artifact_fetch',
      });
    });
  });
}

describeStoredPlanExecutabilityValidatorFetchAndAlignmentCases();
