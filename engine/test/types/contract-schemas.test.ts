/**
 * Tests for Zod Contract Schemas
 */

import { describe, it, expect } from 'vitest';

import {
  ExecutionPlanSchema,
  parseExecutionPlan,
  safeParseExecutionPlan,
  ValidationReportSchema,
  parseValidationReport,
  safeParseValidationReport,
} from '../../src/contracts/schemas';

describe('ExecutionPlan Schema', () => {
  describe('valid plans', () => {
    it('accepts minimal execution plan', () => {
      const plan = {
        metadata: {
          planId: 'plan-1',
          planVersion: 'v1.0',
        },
        steps: [{ stepId: 'step-1' }],
      };

      const result = ExecutionPlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    });

    it('accepts plan with all fields', () => {
      const plan = {
        metadata: {
          planId: 'plan-1',
          planVersion: '1.2.3',
          requiresCapabilities: ['cap1', 'cap2'],
          fallbackBehavior: 'degrade',
          targetAdapter: 'temporal',
        },
        steps: [{ stepId: 'step-1' }, { stepId: 'step-2' }],
      };

      const result = ExecutionPlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    });

    it('accepts v-prefixed and non-prefixed versions', () => {
      const versions = ['v1.0', '1.0', 'v1.2.3', '1.2.3'];

      versions.forEach((version) => {
        const plan = {
          metadata: { planId: 'p', planVersion: version },
          steps: [{ stepId: 's' }],
        };
        expect(ExecutionPlanSchema.safeParse(plan).success).toBe(true);
      });
    });

    it('accepts all fallback behaviors', () => {
      const behaviors = ['reject', 'emulate', 'degrade'];

      behaviors.forEach((behavior) => {
        const plan = {
          metadata: {
            planId: 'p',
            planVersion: 'v1.0',
            fallbackBehavior: behavior,
          },
          steps: [{ stepId: 's' }],
        };
        expect(ExecutionPlanSchema.safeParse(plan).success).toBe(true);
      });
    });

    it('accepts both target adapters', () => {
      const adapters = ['temporal', 'conductor'];

      adapters.forEach((adapter) => {
        const plan = {
          metadata: {
            planId: 'p',
            planVersion: 'v1.0',
            targetAdapter: adapter,
          },
          steps: [{ stepId: 's' }],
        };
        expect(ExecutionPlanSchema.safeParse(plan).success).toBe(true);
      });
    });
  });

  describe('invalid plans', () => {
    it('rejects empty planId', () => {
      const plan = {
        metadata: { planId: '', planVersion: 'v1.0' },
        steps: [{ stepId: 's' }],
      };
      expect(ExecutionPlanSchema.safeParse(plan).success).toBe(false);
    });

    it('rejects invalid version format', () => {
      const plan = {
        metadata: { planId: 'p', planVersion: 'invalid' },
        steps: [{ stepId: 's' }],
      };
      expect(ExecutionPlanSchema.safeParse(plan).success).toBe(false);
    });

    it('rejects empty steps array', () => {
      const plan = {
        metadata: { planId: 'p', planVersion: 'v1.0' },
        steps: [],
      };
      expect(ExecutionPlanSchema.safeParse(plan).success).toBe(false);
    });

    it('rejects extra properties', () => {
      const plan = {
        metadata: {
          planId: 'p',
          planVersion: 'v1.0',
          unknownProp: 'value',
        },
        steps: [{ stepId: 's' }],
      };
      expect(ExecutionPlanSchema.safeParse(plan).success).toBe(false);
    });
  });

  describe('parseExecutionPlan', () => {
    it('throws on invalid data', () => {
      expect(() => parseExecutionPlan({ invalid: 'data' })).toThrow();
    });

    it('returns typed data on valid input', () => {
      const plan = parseExecutionPlan({
        metadata: { planId: 'p', planVersion: 'v1.0' },
        steps: [{ stepId: 's' }],
      });

      expect(plan.metadata.planId).toBe('p');
      expect(plan.steps).toHaveLength(1);
    });
  });

  describe('safeParseExecutionPlan', () => {
    it('returns success result for valid data', () => {
      const result = safeParseExecutionPlan({
        metadata: { planId: 'p', planVersion: 'v1.0' },
        steps: [{ stepId: 's' }],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.planId).toBe('p');
      }
    });

    it('returns error result for invalid data', () => {
      const result = safeParseExecutionPlan({ invalid: 'data' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('ValidationReport Schema', () => {
  describe('valid reports', () => {
    it('accepts minimal report', () => {
      const report = {
        planId: 'plan-1',
        planVersion: 'v1.0',
        generatedAt: new Date().toISOString(),
        targetAdapter: 'temporal',
        adapterVersion: '1.0.0',
        status: 'VALID',
      };

      expect(ValidationReportSchema.safeParse(report).success).toBe(true);
    });

    it('accepts report with errors and warnings', () => {
      const report = {
        planId: 'plan-1',
        planVersion: 'v1.0',
        generatedAt: new Date().toISOString(),
        targetAdapter: 'conductor',
        adapterVersion: '2.0.0',
        status: 'ERRORS',
        errors: [
          {
            code: 'CAPABILITY_NOT_SUPPORTED',
            message: 'Feature not supported',
          },
        ],
        warnings: [{ code: 'CAPABILITY_DEGRADED', message: 'Performance impact' }],
      };

      expect(ValidationReportSchema.safeParse(report).success).toBe(true);
    });

    it('accepts all status values', () => {
      const statuses = ['VALID', 'WARNINGS', 'ERRORS'];

      statuses.forEach((status) => {
        const report = {
          planId: 'p',
          planVersion: 'v1.0',
          generatedAt: new Date().toISOString(),
          targetAdapter: 'temporal',
          adapterVersion: '1.0.0',
          status,
        };
        expect(ValidationReportSchema.safeParse(report).success).toBe(true);
      });
    });
  });

  describe('invalid reports', () => {
    it('rejects invalid datetime', () => {
      const report = {
        planId: 'p',
        planVersion: 'v1.0',
        generatedAt: 'not-a-datetime',
        targetAdapter: 'temporal',
        adapterVersion: '1.0.0',
        status: 'VALID',
      };
      expect(ValidationReportSchema.safeParse(report).success).toBe(false);
    });

    it('rejects invalid status', () => {
      const report = {
        planId: 'p',
        planVersion: 'v1.0',
        generatedAt: new Date().toISOString(),
        targetAdapter: 'temporal',
        adapterVersion: '1.0.0',
        status: 'INVALID',
      };
      expect(ValidationReportSchema.safeParse(report).success).toBe(false);
    });
  });

  describe('parseValidationReport', () => {
    it('throws on invalid data', () => {
      expect(() => parseValidationReport({ invalid: 'data' })).toThrow();
    });

    it('returns typed data on valid input', () => {
      const report = parseValidationReport({
        planId: 'p',
        planVersion: 'v1.0',
        generatedAt: new Date().toISOString(),
        targetAdapter: 'temporal',
        adapterVersion: '1.0.0',
        status: 'VALID',
      });

      expect(report.planId).toBe('p');
      expect(report.status).toBe('VALID');
    });
  });

  describe('safeParseValidationReport', () => {
    it('returns success result for valid data', () => {
      const result = safeParseValidationReport({
        planId: 'p',
        planVersion: 'v1.0',
        generatedAt: new Date().toISOString(),
        targetAdapter: 'temporal',
        adapterVersion: '1.0.0',
        status: 'VALID',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('VALID');
      }
    });

    it('returns error result for invalid data', () => {
      const result = safeParseValidationReport({ invalid: 'data' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
