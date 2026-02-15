import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseExecuteStepRequest,
  parsePlanRef,
  parseRunContext,
  parseSignalRequest,
  toValidationErrorResponse,
} from '../src/validation';

describe('contracts: validation helpers', () => {
  it('parses PlanRef with valid input', () => {
    const planRef = parsePlanRef({
      uri: 's3://bucket/plan.json',
      sha256: 'abc123',
      schemaVersion: '1.0.0',
      planId: 'plan-1',
      planVersion: 'v1',
    });

    expect(planRef.planId).toBe('plan-1');
  });

  it('returns structured errors with field path and constraint violation', () => {
    try {
      parseExecuteStepRequest({
        tenantId: '',
        planId: 'plan-1',
        runId: 'run-1',
        stepId: 'step-1',
        stepType: 'task',
        stepData: {},
      });
      throw new Error('expected parseExecuteStepRequest to throw');
    } catch (error) {
      const response = toValidationErrorResponse(error);
      expect(response.statusCode).toBe(400);
      expect(response.error).toBe('Bad Request');
      expect(response.message).toBe('Validation failed');
      expect(response.details.length).toBeGreaterThan(0);
      expect(response.details[0]).toHaveProperty('path');
      expect(response.details[0]).toHaveProperty('code');
      expect(response.details[0]).toHaveProperty('message');
      expect(response.details.some((d) => d.path === 'tenantId')).toBe(true);
    }
  });

  it('throws ContractValidationError for invalid signal type', () => {
    expect(() =>
      parseSignalRequest({
        signalId: 'sig-1',
        type: 'INVALID_SIGNAL',
      })
    ).toThrow(ContractValidationError);
  });

  it('parses RunContext with valid provider', () => {
    const ctx = parseRunContext({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      runId: 'run-1',
      targetAdapter: 'temporal',
    });

    expect(ctx.targetAdapter).toBe('temporal');
  });
});
