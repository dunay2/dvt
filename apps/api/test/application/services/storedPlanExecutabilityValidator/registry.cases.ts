import { describe, expect, it, vi } from 'vitest';

import { StoredPlanExecutabilityValidator } from '../../../../src/application/services/StoredPlanExecutabilityValidator.js';

import {
  makeAdapter,
  makeRegistryForKind,
  PLAN_REF,
  storedPlanArtifact,
} from './harness.js';

/**
 * Step-registry-oriented cases for `StoredPlanExecutabilityValidator`.
 */
export function describeStoredPlanExecutabilityValidatorRegistryCases(): void {
  describe('StoredPlanExecutabilityValidator step-registry checks', () => {
    it('accepts custom step kinds when an explicit stepTypeRegistry is injected', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              stepKind: 'SPARK_SQL',
            })
          ),
        },
        adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
        stepTypeRegistry: makeRegistryForKind('SPARK_SQL'),
      });

      const result = await validator.validatePlan(PLAN_REF, 'mock');

      expect(result).toEqual({
        status: 'OK',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'mock',
      });
    });

    it('rejects when a step kind is not executable on the selected adapter', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              stepKind: 'SPARK_SQL',
            })
          ),
        },
        adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
        stepTypeRegistry: makeRegistryForKind('SPARK_SQL', {
          supportedAdapters: ['temporal'],
          requiredCapabilities: [],
        }),
      });

      const result = await validator.validatePlan(PLAN_REF, 'mock');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'mock',
        code: 'INVALID_STEP_KIND',
        degradable: false,
        reason: 'Step kind SPARK_SQL is not executable on adapter mock',
        cause: 'SPARK_SQL',
      });
    });

    it('derives required capabilities from step-kind registry profiles', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              stepKind: 'SPARK_SQL',
            })
          ),
        },
        adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
        stepTypeRegistry: makeRegistryForKind('SPARK_SQL', {
          supportedAdapters: ['mock'],
          requiredCapabilities: ['spark.submit'],
        }),
      });

      const result = await validator.validatePlan(PLAN_REF, 'mock');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'mock',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'Missing adapter capability: spark.submit',
        cause: 'spark.submit',
      });
    });

    it('rejects unknown step kinds when no custom stepTypeRegistry is injected', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              stepKind: 'SPARK_SQL',
            })
          ),
        },
        adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'mock');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'mock',
        code: 'REJECTED',
        degradable: false,
        reason: expect.stringContaining('INVALID_STEP_KIND'),
        cause: 'plan_fetch',
      });
    });
  });
}
