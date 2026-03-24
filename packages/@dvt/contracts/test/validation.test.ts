import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parsePlannerGraphSourceV1,
  parsePlannerInputEnvelopeV2,
  parsePlanRef,
  parseResolvedRunContext,
  parseRunContext,
  parseSignalRequest,
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

  it('rejects caller-owned logicalAttemptId on public RunContext', () => {
    expect(() =>
      parseRunContext({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        runId: 'run-1',
        targetAdapter: 'temporal',
        logicalAttemptId: 2,
      })
    ).toThrow(ContractValidationError);
  });

  it('parses ResolvedRunContext with engine-owned retry lineage', () => {
    const ctx = parseResolvedRunContext({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      runId: 'run-2',
      targetAdapter: 'temporal',
      logicalAttemptId: 2,
      parentRunId: 'run-1',
      originRunId: 'run-0',
    });

    expect(ctx.logicalAttemptId).toBe(2);
    expect(ctx.parentRunId).toBe('run-1');
    expect(ctx.originRunId).toBe('run-0');
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
