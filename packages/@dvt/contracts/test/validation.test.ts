import { describe, expect, it } from 'vitest';

import { CONTRACTS_ERROR_CODE, CONTRACTS_ERROR_MESSAGE_KEY } from '../src/errorContract.js';
import {
  ContractValidationError,
  parseGenericGraphSourceV1,
  parsePlanAdmissionLink,
  parsePlanExecutabilityRecord,
  parsePlanRecord,
  parsePlannerInputEnvelopeV1,
  parsePlanRef,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  parseResolvedRunContext,
  parseRunContext,
  parseSignalRequest,
  toValidationErrorResponse,
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
      pluginCompatibilityFingerprint:
        '1111111111111111111111111111111111111111111111111111111111111111',
    });

    expect(planRef.planId).toBe('plan-1');
    expect(planRef.pluginCompatibilityFingerprint).toHaveLength(64);
  });

  it('throws ContractValidationError for invalid signal type', () => {
    expect(() =>
      parseSignalRequest({
        signalId: 'sig-1',
        type: 'INVALID_SIGNAL',
      })
    ).toThrow(ContractValidationError);
  });

  it('uses canonical validation message keys instead of hardcoded english text', () => {
    try {
      parseSignalRequest({
        signalId: 'sig-1',
        type: 'INVALID_SIGNAL',
      });
      throw new Error('Expected parseSignalRequest to fail');
    } catch (error) {
      const response = toValidationErrorResponse(error);
      expect(response.code).toBe(CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED);
      expect(response.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED);
      expect(response.messageParams).toEqual({});
      expect(response.message).toBe('Validation failed');
    }

    const response = toValidationErrorResponse(new Error('boom'));
    expect(response.code).toBe(CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED);
    expect(response.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED);
    expect(response.messageParams).toEqual({});
    expect(response.message).toBe('Validation failed');
    expect(response.details[0]?.message).toBe('Unknown validation error');
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

  it('parses RunContext with optional runExecutionContextRef', () => {
    const ctx = parseRunContext({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      runId: 'run-1',
      targetAdapter: 'temporal',
      runExecutionContextRef: {
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'abc123',
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
      },
    });

    expect(ctx.runExecutionContextRef?.uri).toContain('dvt-runctx://');
  });

  it('parses RunExecutionContextRef with valid input', () => {
    const ref = parseRunExecutionContextRef({
      uri: 'dvt-runctx://tenant-a/run-1/context.json',
      sha256: 'abc123',
      schemaVersion: 'v1.0',
      planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
      planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
      pluginCompatibilityFingerprint:
        '1111111111111111111111111111111111111111111111111111111111111111',
    });

    expect(ref.planId).toBe(VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId);
    expect(ref.pluginCompatibilityFingerprint).toHaveLength(64);
  });

  it('rejects malformed RunExecutionContextRef', () => {
    expect(() =>
      parseRunExecutionContextRef({
        uri: '',
        sha256: 'abc123',
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
      })
    ).toThrow(ContractValidationError);
  });

  it('parses RunExecutionContext with governed provenance fields', () => {
    const runExecutionContext = parseRunExecutionContext({
      schemaVersion: 'v1.0',
      planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
      planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
      planSha256: 'a'.repeat(64),
      pluginCompatibilityFingerprint:
        '1111111111111111111111111111111111111111111111111111111111111111',
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      targetAdapter: 'temporal',
      createdAtIso: '2026-04-03T10:00:00.000Z',
      createdBy: 'planner-runtime',
      pluginContexts: {
        dbt: {
          projectBundleRef: 'artifacts://runs/run-1/dbt-project.tgz',
        },
      },
    });

    expect(runExecutionContext.pluginContexts.dbt.projectBundleRef).toContain('artifacts://');
    expect(runExecutionContext.pluginCompatibilityFingerprint).toHaveLength(64);
  });

  it('rejects RunExecutionContext when top-level provenance fields are missing', () => {
    expect(() =>
      parseRunExecutionContext({
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        targetAdapter: 'temporal',
        createdAtIso: '2026-04-03T10:00:00.000Z',
        createdBy: 'planner-runtime',
        pluginContexts: { dbt: { projectBundleRef: 'artifacts://x' } },
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects RunExecutionContext when plugin contexts include non-ref payload objects', () => {
    expect(() =>
      parseRunExecutionContext({
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        planSha256: 'a'.repeat(64),
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        targetAdapter: 'temporal',
        createdAtIso: '2026-04-03T10:00:00.000Z',
        createdBy: 'planner-runtime',
        pluginContexts: {
          dbt: {
            varsRef: { secret: 'inline' },
          },
        },
      })
    ).toThrow(ContractValidationError);
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

  it('parses GenericGraphSourceV1 with step-oriented nodes', () => {
    const source = parseGenericGraphSourceV1({
      kind: 'generic-graph-v1',
      sourceFamily: 'integration-suite',
      sourceVersion: '1.0',
      nodes: [
        {
          nodeId: 'extract.iot-readings',
          stepKind: 'API_CALL',
          dependsOn: [],
          stepTypeConfig: {
            operationRef: 'artifacts://operations/iot-readings.json',
          },
        },
      ],
    });

    expect(source.kind).toBe('generic-graph-v1');
    expect(source.nodes[0]?.stepKind).toBe('API_CALL');
  });

  it('rejects GenericGraphSourceV1 when stepKind is missing', () => {
    expect(() =>
      parseGenericGraphSourceV1({
        kind: 'generic-graph-v1',
        sourceFamily: 'integration-suite',
        sourceVersion: '1.0',
        nodes: [
          {
            nodeId: 'extract.iot-readings',
            dependsOn: [],
          },
        ],
      })
    ).toThrow(ContractValidationError);
  });

  it('throws ContractValidationError when planner input has no active source', () => {
    expect(() =>
      parsePlannerInputEnvelopeV1({
        selection: {
          selectedNodeIds: ['model.analytics.orders'],
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('throws ContractValidationError when planner input has more than one active source', () => {
    expect(() =>
      parsePlannerInputEnvelopeV1({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [{ nodeId: 'model.analytics.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        manifestRef: {
          uri: 's3://bucket/manifest.json',
          sha256: 'a'.repeat(64),
        },
        selection: {
          selectedNodeIds: ['model.analytics.orders'],
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects GenericGraphSourceV1 when nodes is empty', () => {
    expect(() =>
      parseGenericGraphSourceV1({
        kind: 'generic-graph-v1',
        sourceFamily: 'integration-suite',
        sourceVersion: '1.0',
        nodes: [],
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects planner input with legacy manifest inline payload', () => {
    expect(() =>
      parsePlannerInputEnvelopeV1({
        manifest: { nodes: {} },
        selection: {
          selectedNodeIds: ['model.analytics.orders'],
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects planner input with legacy nodes payload', () => {
    expect(() =>
      parsePlannerInputEnvelopeV1({
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
