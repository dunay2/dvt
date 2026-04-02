import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parsePlanAdmissionLink,
  parsePlanExecutabilityRecord,
  parsePlanRecord,
  parsePlannerGraphSourceV1,
  parsePlannerInputEnvelopeV2,
  parsePlanRef,
  parseResolvedRunContext,
  parseRunContext,
  parseSignalRequest,
} from '../src/validation.js';

import { VALID_EXECUTION_PLAN_V2_FIXTURE } from './fixtures/planner-contract.fixtures.js';

describe('contracts: validation helpers', () => {
  const validCanonicalPlanJson = JSON.stringify(VALID_EXECUTION_PLAN_V2_FIXTURE);
  const validPlanRecord = {
    planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
    canonicalPlanJson: validCanonicalPlanJson,
    canonicalHash: 'a'.repeat(64),
    planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
    schemaVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.schemaVersion,
    contractVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.contractVersion,
    sourceRef: 'planner://build/123',
    state: 'ACTIVE',
    createdAtIso: '2026-04-02T10:00:00.000Z',
    updatedAtIso: '2026-04-02T10:00:00.000Z',
  } as const;

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

  it('parses PlanRecord with canonical persisted artifact fields', () => {
    const record = parsePlanRecord(validPlanRecord);

    expect(record.state).toBe('ACTIVE');
    expect(record.canonicalHash).toHaveLength(64);
  });

  it('rejects PlanRecord when canonicalPlanJson metadata does not match top-level identity', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        planId: 'a'.repeat(64),
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanRecord when state ARCHIVED omits archivedAtIso', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        state: 'ARCHIVED',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanRecord when state ACTIVE includes archivedAtIso', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        archivedAtIso: '2026-04-02T11:00:00.000Z',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanRecord when schemaVersion is not the governed canonical value', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        schemaVersion: 'v1',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanRecord when canonicalPlanJson is not valid JSON', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        canonicalPlanJson: '{not-json}',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanRecord when canonicalPlanJson is not a valid ExecutionPlan', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        canonicalPlanJson: JSON.stringify({ metadata: { planId: 'a'.repeat(64) } }),
      })
    ).toThrow(ContractValidationError);
  });

  it('parses INVALID PlanExecutabilityRecord with canonical rejection code', () => {
    const record = parsePlanExecutabilityRecord({
      planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
      adapterId: 'temporal',
      state: 'INVALID',
      validatedAtIso: '2026-04-02T10:03:00.000Z',
      rejectionReport: {
        code: 'MISSING_CAPABILITY',
        reason: 'Temporal worker missing capability',
        degradable: false,
      },
    });

    expect(record.state).toBe('INVALID');
    if (record.state === 'INVALID') {
      expect(record.rejectionReport.code).toBe('MISSING_CAPABILITY');
    }
  });

  it('rejects PlanExecutabilityRecord with unknown state', () => {
    expect(() =>
      parsePlanExecutabilityRecord({
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        adapterId: 'temporal',
        state: 'READY',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects VALID PlanExecutabilityRecord when rejectionReport is present', () => {
    expect(() =>
      parsePlanExecutabilityRecord({
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        adapterId: 'temporal',
        state: 'VALID',
        validatedAtIso: '2026-04-02T10:03:00.000Z',
        rejectionReport: {
          code: 'MISSING_CAPABILITY',
          reason: 'should not exist for VALID',
          degradable: false,
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects INVALID PlanExecutabilityRecord without rejectionReport', () => {
    expect(() =>
      parsePlanExecutabilityRecord({
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        adapterId: 'temporal',
        state: 'INVALID',
        validatedAtIso: '2026-04-02T10:03:00.000Z',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanExecutabilityRecord with non-canonical rejection code', () => {
    expect(() =>
      parsePlanExecutabilityRecord({
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        adapterId: 'temporal',
        state: 'INVALID',
        validatedAtIso: '2026-04-02T10:03:00.000Z',
        rejectionReport: {
          code: 'PLAN_HASH_MISMATCH',
          reason: 'not part of executability rejection vocabulary',
          degradable: false,
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('parses PlanAdmissionLink relation without overloading PlanRecord state', () => {
    const link = parsePlanAdmissionLink({
      planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
      runId: 'run-1',
      adapterId: 'temporal',
      admittedAtIso: '2026-04-02T10:05:00.000Z',
    });

    expect(link.runId).toBe('run-1');
    expect(link.adapterId).toBe('temporal');
  });
});
