import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseExecuteStepRequest,
  parsePlannerGraphSourceV1,
  parsePlannerInputEnvelopeV2,
  parsePlanRef,
  parseRunContext,
  parseSignalRequest,
  toValidationErrorResponse,
} from '../src/validation.js';

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

  it('throws ContractValidationError for malformed planner graph source', () => {
    expect(() =>
      parsePlannerGraphSourceV1({
        kind: 'legacy-graph',
        nodes: [],
      })
    ).toThrow(ContractValidationError);
  });

  it('throws ContractValidationError when planner input has no active source', () => {
    expect(() =>
      parsePlannerInputEnvelopeV2({
        selection: {
          selectedNodeIds: ['model.analytics.orders'],
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('throws ContractValidationError when planner input has more than one active source', () => {
    expect(() =>
      parsePlannerInputEnvelopeV2({
        graphSource: {
          kind: 'normalized-graph-v1',
          nodes: [],
        },
        nodes: [],
        selection: {
          selectedNodeIds: ['model.analytics.orders'],
        },
      })
    ).toThrow(ContractValidationError);
  });
});
