import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseExecutionPlan,
  parseRunExecutionPolicy,
} from '../../src/validation.js';
import { VALID_EXECUTION_PLAN_V2_FIXTURE } from '../fixtures/planner-contract.fixtures.js';

export function registerValidationExecutionPlanSuite(): void {
  describe('execution plan and policy contracts', () => {
    it('rejects RunExecutionPolicy when pluginCompatibilityFingerprint is not canonical sha256', () => {
      expect(() =>
        parseRunExecutionPolicy({
          pluginCompatibilityFingerprint: 'not-a-sha',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RunExecutionPolicy when requiresCapabilities contains whitespace-only entries', () => {
      expect(() =>
        parseRunExecutionPolicy({
          requiresCapabilities: ['basic-execution', '   '],
        })
      ).toThrow(ContractValidationError);
    });

    it('parses ExecutionPlan when steps carry explicit retryPolicy metadata', () => {
      const plan = parseExecutionPlan({
        ...VALID_EXECUTION_PLAN_V2_FIXTURE,
        steps: [
          {
            stepId: 'model.analytics.customers',
            kind: 'DBT_MODEL',
            dependsOn: [],
            retryPolicy: {
              maxAttempts: 4,
              initialInterval: '2s',
              maximumInterval: '30s',
              backoffCoefficient: 2,
            },
          },
        ],
      });

      expect(plan.steps[0]?.retryPolicy).toEqual({
        maxAttempts: 4,
        initialInterval: '2s',
        maximumInterval: '30s',
        backoffCoefficient: 2,
      });
    });

    it('rejects ExecutionPlan when retryPolicy maximumInterval is lower than initialInterval', () => {
      expect(() =>
        parseExecutionPlan({
          ...VALID_EXECUTION_PLAN_V2_FIXTURE,
          steps: [
            {
              stepId: 'model.analytics.customers',
              kind: 'DBT_MODEL',
              dependsOn: [],
              retryPolicy: {
                maxAttempts: 3,
                initialInterval: '30s',
                maximumInterval: '2s',
                backoffCoefficient: 2,
              },
            },
          ],
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects ExecutionPlan when retryPolicy uses unsupported shape or invalid bounds', () => {
      expect(() =>
        parseExecutionPlan({
          ...VALID_EXECUTION_PLAN_V2_FIXTURE,
          steps: [
            {
              stepId: 'model.analytics.customers',
              kind: 'DBT_MODEL',
              dependsOn: [],
              retryPolicy: {
                maxAttempts: 0,
                initialInterval: '1s',
                maximumInterval: '60s',
                backoffCoefficient: 0,
                jitter: 'full',
              },
            },
          ],
        })
      ).toThrow(ContractValidationError);
    });
  });
}
