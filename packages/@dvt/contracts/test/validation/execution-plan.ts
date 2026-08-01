import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseExecutionPlan,
  parseRunExecutionPolicy,
} from '../../src/validation.js';
import { VALID_EXECUTION_PLAN_V1_FIXTURE } from '../fixtures/planner-contract.fixtures.js';

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
        ...VALID_EXECUTION_PLAN_V1_FIXTURE,
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
      expect(plan.metadata.ownership).toEqual({
        tenantId: 'tenant-a',
        projectId: 'analytics',
        environmentId: 'prod',
      });
    });

    it('rejects ExecutionPlan when ownership metadata contains blank fields', () => {
      expect(() =>
        parseExecutionPlan({
          ...VALID_EXECUTION_PLAN_V1_FIXTURE,
          metadata: {
            ...VALID_EXECUTION_PLAN_V1_FIXTURE.metadata,
            ownership: {
              tenantId: 'tenant-a',
              projectId: ' ',
              environmentId: 'prod',
            },
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects ExecutionPlan when retryPolicy maximumInterval is lower than initialInterval', () => {
      expect(() =>
        parseExecutionPlan({
          ...VALID_EXECUTION_PLAN_V1_FIXTURE,
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
          ...VALID_EXECUTION_PLAN_V1_FIXTURE,
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

    it('parses planner-owned execution decisions from the immutable plan', () => {
      const plan = parseExecutionPlan({
        ...VALID_EXECUTION_PLAN_V1_FIXTURE,
        decisions: [
          {
            subjectId: 'selection',
            subjectKind: 'selection',
            status: 'PARTIAL',
            reasonCode: 'BOUNDED_SELECTION',
            includedNodeIds: ['model.analytics.customers'],
            excludedNodeIds: ['model.analytics.orders'],
          },
          {
            subjectId: 'model.analytics.customers',
            subjectKind: 'node',
            status: 'RUN',
            reasonCode: 'SELECTED_ROOT',
          },
          {
            subjectId: 'model.analytics.orders',
            subjectKind: 'node',
            status: 'SKIP',
            reasonCode: 'OUTSIDE_SELECTED_CLOSURE',
          },
        ],
      });

      expect(plan.decisions).toHaveLength(3);
    });

    it('rejects partial decisions without disjoint included and excluded scope', () => {
      expect(() =>
        parseExecutionPlan({
          ...VALID_EXECUTION_PLAN_V1_FIXTURE,
          decisions: [
            {
              subjectId: 'selection',
              subjectKind: 'selection',
              status: 'PARTIAL',
              reasonCode: 'BOUNDED_SELECTION',
              includedNodeIds: ['model.analytics.customers'],
              excludedNodeIds: ['model.analytics.customers'],
            },
          ],
        })
      ).toThrow(ContractValidationError);
    });
  });
}
