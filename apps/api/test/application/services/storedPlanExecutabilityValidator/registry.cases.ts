import { describe, expect, it } from 'vitest';

import { StoredPlanExecutabilityValidator } from '../../../../src/application/services/StoredPlanExecutabilityValidator.js';

import {
  makeAdapter,
  makeValidationReader,
  makeRegistryForKind,
  storedPlanArtifact,
  validationInput,
} from './harness.js';

/**
 * Step-registry-oriented cases for `StoredPlanExecutabilityValidator`.
 */
export function describeStoredPlanExecutabilityValidatorRegistryCases(): void {
  describe('StoredPlanExecutabilityValidator step-registry checks', () => {
    it('accepts custom step kinds when an explicit stepTypeRegistry is injected', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: makeValidationReader(() =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
        stepTypeRegistry: makeRegistryForKind('SPARK_SQL'),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'OK',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
      });
    });

    it('rejects when a step kind is not executable on the selected adapter', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: makeValidationReader(() =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
        stepTypeRegistry: makeRegistryForKind('SPARK_SQL', {
          supportedAdapters: [],
          requiredCapabilities: [],
        }),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'INVALID_STEP_KIND',
        degradable: false,
        reason: 'Step kind SPARK_SQL is not executable on adapter temporal',
        cause: 'SPARK_SQL',
      });
    });

    it('derives required capabilities from step-kind registry profiles', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: makeValidationReader(() =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
        stepTypeRegistry: makeRegistryForKind('SPARK_SQL', {
          supportedAdapters: ['temporal'],
          requiredCapabilities: ['spark.submit'],
        }),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'Missing adapter capability: spark.submit',
        cause: 'spark.submit',
      });
    });

    it('rejects unknown step kinds when no custom stepTypeRegistry is injected', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: makeValidationReader(() =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: expect.stringContaining('INVALID_STEP_KIND'),
        cause: 'plan_fetch',
      });
    });
  });
}
