import { describe, expect, it } from 'vitest';

import { CONTRACTS_ERROR_CODE, CONTRACTS_ERROR_MESSAGE_KEY } from '../src/errorContract.js';
import { jcsCanonicalize } from '../src/utils/jcsCanonicalize.js';
import { sha256HexUtf8 } from '../src/utils/sha256HexUtf8.js';
import {
  ContractValidationError,
  parseGenericGraphSourceV1,
  parsePlanAdmissionLink,
  parsePlanExecutabilityRecord,
  parseExecutionPlan,
  parsePlanRecord,
  parseCanonicalRunStatus,
  parsePlannerInputEnvelopeV1,
  parsePlanRef,
  parseRunExecutionPolicy,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  parseEngineRunRef,
  parseRunEventWrite,
  parseRunStatusSnapshot,
  parseRecoverRunCommand,
  parseResolvedRunContext,
  parseRunContext,
  parseSignalRequest,
  toValidationErrorResponse,
} from '../src/validation.js';

import { VALID_EXECUTION_PLAN_V2_FIXTURE } from './fixtures/planner-contract.fixtures.js';

describe('contracts: validation helpers', () => {
  const validCanonicalPlanJson = jcsCanonicalize(VALID_EXECUTION_PLAN_V2_FIXTURE);
  const validPlanRecord = {
    planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
    canonicalPlanJson: validCanonicalPlanJson,
    canonicalHash: sha256HexUtf8(validCanonicalPlanJson),
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
    expect(planRef.sha256).toBe('abc123');
  });

  it('throws ContractValidationError for invalid signal type', () => {
    expect(() =>
      parseSignalRequest({
        signalId: 'sig-1',
        type: 'INVALID_SIGNAL',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects SignalRequest when signalId is only whitespace', () => {
    expect(() =>
      parseSignalRequest({
        signalId: '   ',
        type: 'PAUSE',
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

  it('rejects RETRY_STEP because it is no longer part of canonical SignalType', () => {
    expect(() =>
      parseSignalRequest({
        signalId: 'sig-retry-step-1',
        type: 'RETRY_STEP',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects RETRY_RUN because recovery is no longer part of canonical SignalType', () => {
    expect(() =>
      parseSignalRequest({
        signalId: 'sig-retry-run-1',
        type: 'RETRY_RUN',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects RecoverRunCommand when recovery runId equals source runId', () => {
    expect(() =>
      parseRecoverRunCommand({
        sourceRunId: 'run-1',
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0.0',
        },
        context: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
          targetAdapter: 'temporal',
        },
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

  it('parses RunStatusSnapshot with TF-C2-B result evidence fields', () => {
    const snapshot = parseRunStatusSnapshot({
      runId: 'run-1',
      status: 'COMPLETED',
      execution: {
        activeStepId: 'step-evidence',
        failure: {
          stepId: 'step-transform',
          reason: 'SINK_WRITE_FAILED',
          message: 'duplicate key value violates unique constraint',
          failedAt: '2026-04-08T10:00:03.000Z',
        },
        materialization: {
          executor: 'postgres',
          environmentId: 'prod',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:00:04.000Z',
          durationMs: 4000,
        },
      },
    });

    expect(snapshot.execution?.activeStepId).toBe('step-evidence');
    expect(snapshot.execution?.failure?.stepId).toBe('step-transform');
    expect(snapshot.execution?.materialization?.sinkTable).toBe('analytics.orders_daily');
    expect(snapshot.execution?.materialization?.rowsWritten).toBe(42);
  });

  it('rejects RunStatusSnapshot when failure.failedAt is only whitespace', () => {
    expect(() =>
      parseRunStatusSnapshot({
        runId: 'run-1',
        status: 'FAILED',
        execution: {
          failure: {
            stepId: 'step-transform',
            reason: 'SINK_WRITE_FAILED',
            failedAt: '   ',
          },
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects RunStatusSnapshot when failure.failedAt is not strict ISO UTC', () => {
    expect(() =>
      parseRunStatusSnapshot({
        runId: 'run-1',
        status: 'FAILED',
        execution: {
          failure: {
            stepId: 'step-transform',
            reason: 'SINK_WRITE_FAILED',
            failedAt: '2026-02-30T10:00:00.000Z',
          },
        },
      })
    ).toThrow(ContractValidationError);
  });

  it('parses CanonicalRunStatus when timestamps are strict ISO UTC strings', () => {
    const status = parseCanonicalRunStatus({
      runId: 'run-1',
      status: 'RUNNING',
      startedAt: '2026-04-08T10:00:00.000Z',
      completedAt: '2026-04-08T10:05:00.000Z',
    });

    expect(status.startedAt).toBe('2026-04-08T10:00:00.000Z');
    expect(status.completedAt).toBe('2026-04-08T10:05:00.000Z');
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

  it('rejects CanonicalRunStatus when timestamps are not strict ISO UTC strings', () => {
    expect(() =>
      parseCanonicalRunStatus({
        runId: 'run-1',
        status: 'RUNNING',
        startedAt: '2026-04-08 10:00:00Z',
      })
    ).toThrow(ContractValidationError);

    expect(() =>
      parseCanonicalRunStatus({
        runId: 'run-1',
        status: 'COMPLETED',
        completedAt: 'not-a-date',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects RunEventWrite when emittedAt is not strict ISO UTC', () => {
    expect(() =>
      parseRunEventWrite({
        eventId: 'evt-run-started-invalid-time',
        eventType: 'RunStarted',
        payloadVersion: 1,
        emittedAt: '2026-04-08 10:00:00Z',
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        runId: 'run-1',
        planId: 'plan-1',
        planVersion: '1.0.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: 'run-started-invalid-time',
      })
    ).toThrow(ContractValidationError);
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

  it('rejects EngineRunRef when provider identifiers are only whitespace', () => {
    expect(() =>
      parseEngineRunRef({
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'temporal-main',
        workflowId: '   ',
        runId: 'run-1',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects EngineRunRef when temporal taskQueue is empty', () => {
    expect(() =>
      parseEngineRunRef({
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'temporal-main',
        workflowId: 'workflow-1',
        runId: 'run-1',
        taskQueue: '',
      })
    ).toThrow(ContractValidationError);
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

  it('rejects RunExecutionContextRef when pluginCompatibilityFingerprint is not canonical sha256', () => {
    expect(() =>
      parseRunExecutionContextRef({
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'abc123',
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        pluginCompatibilityFingerprint: 'invalid-fingerprint',
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects RunExecutionContext when createdAtIso is not strict ISO UTC', () => {
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
        createdAtIso: '2026-13-01T00:00:00.000Z',
        createdBy: 'system',
        pluginContexts: {
          temporal: {
            namespace: 'default',
          },
        },
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

  it('throws ContractValidationError when planner input uses legacy manifestRef source', () => {
    expect(() =>
      parsePlannerInputEnvelopeV1({
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

  it('rejects PlanRecord when canonicalHash does not match canonicalPlanJson', () => {
    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        canonicalHash: 'f'.repeat(64),
      })
    ).toThrow(ContractValidationError);
  });

  it('rejects PlanRecord when canonicalPlanJson is not JCS(canonical ExecutionPlan)', () => {
    const nonCanonicalPlanJson = JSON.stringify({
      steps: VALID_EXECUTION_PLAN_V2_FIXTURE.steps,
      metadata: {
        createdAtIso: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.createdAtIso,
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        inputHashSha256: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.inputHashSha256,
        contractVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.contractVersion,
        schemaVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.schemaVersion,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
      },
    });

    expect(() =>
      parsePlanRecord({
        ...validPlanRecord,
        canonicalPlanJson: nonCanonicalPlanJson,
        canonicalHash: sha256HexUtf8(nonCanonicalPlanJson),
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
