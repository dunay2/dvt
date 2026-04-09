import { describe, expect, it } from 'vitest';

import { parseRunEventRecord, parseRunEventWrite } from '../src/validation.js';

import {
  STEP_STARTED_WITHOUT_COMPILED_CODE_REF_RECORD_FIXTURE,
  STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE,
  STEP_STARTED_WITH_STEP_ARTIFACT_REF_WRITE_FIXTURE,
  STEP_STARTED_WITH_COMPILED_CODE_REF_RECORD_FIXTURE,
  STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE,
  VALID_COMPILED_CODE_REF_FIXTURE,
  VALID_STEP_ARTIFACT_REF_FIXTURE,
} from './fixtures/run-event-compiled-code-ref.fixtures';

describe('contracts: StepStarted compiledCodeRef fixtures (ADR-0032)', () => {
  it('accepts StepStarted write event with compiledCodeRef payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.payloadVersion).toBe(1);
    expect(parsed.stepId).toBe('model.analytics.orders');
    expect(parsed.payload?.['compiledCodeRef']).toEqual(VALID_COMPILED_CODE_REF_FIXTURE);
  });

  it('accepts StepStarted write event without compiledCodeRef payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.payloadVersion).toBe(1);
    expect(parsed.stepId).toBe('model.analytics.orders');
    expect(parsed.payload?.['compiledCodeRef']).toBeUndefined();
  });

  it('accepts StepStarted write event with stepArtifactRef payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITH_STEP_ARTIFACT_REF_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.payloadVersion).toBe(1);
    expect(parsed.stepId).toBe('model.analytics.orders');
    expect(parsed.payload?.['stepArtifactRef']).toEqual(VALID_STEP_ARTIFACT_REF_FIXTURE);
  });

  it('accepts persisted StepStarted record fixtures with and without compiledCodeRef', () => {
    const withRef = parseRunEventRecord(STEP_STARTED_WITH_COMPILED_CODE_REF_RECORD_FIXTURE);
    const withoutRef = parseRunEventRecord(STEP_STARTED_WITHOUT_COMPILED_CODE_REF_RECORD_FIXTURE);

    expect(withRef.runSeq).toBe(10);
    expect(withRef.payloadVersion).toBe(1);
    expect(withRef.payload?.['compiledCodeRef']).toEqual(VALID_COMPILED_CODE_REF_FIXTURE);
    expect(withoutRef.runSeq).toBe(11);
    expect(withoutRef.payloadVersion).toBe(1);
    expect(withoutRef.payload?.['compiledCodeRef']).toBeUndefined();
  });

  it('rejects StepStarted payloads that do not match the eventType contract', () => {
    expect(() =>
      parseRunEventWrite({
        ...STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE,
        payload: { gatewayDecision: true },
      })
    ).toThrow();
  });

  it('accepts StepCompleted write events with gatewayDecision payload', () => {
    const parsed = parseRunEventWrite({
      eventId: 'evt-step-completed-1',
      eventType: 'StepCompleted',
      payloadVersion: 1,
      emittedAt: '2026-03-07T10:00:00.000Z',
      runId: 'run-compiled-code-ref-1',
      tenantId: 'tenant-a',
      projectId: 'project-analytics',
      environmentId: 'prod',
      planId: 'plan-compiled-code-ref-1',
      planVersion: '1.0',
      engineAttemptId: 1,
      logicalAttemptId: 1,
      stepId: 'model.analytics.orders',
      idempotencyKey: 'StepCompleted|tenant-a|run-compiled-code-ref-1|1|model.analytics.orders',
      payload: { gatewayDecision: false },
    });

    expect(parsed.eventType).toBe('StepCompleted');
    expect(parsed.payloadVersion).toBe(1);
    expect(parsed.stepId).toBe('model.analytics.orders');
    expect(parsed.payload?.gatewayDecision).toBe(false);
  });

  it('accepts StepCompleted payloads with materialization evidence', () => {
    const parsed = parseRunEventWrite({
      eventId: 'evt-step-completed-materialized',
      eventType: 'StepCompleted',
      payloadVersion: 1,
      emittedAt: '2026-03-07T10:00:00.000Z',
      runId: 'run-compiled-code-ref-1',
      tenantId: 'tenant-a',
      projectId: 'project-analytics',
      environmentId: 'prod',
      planId: 'plan-compiled-code-ref-1',
      planVersion: '1.0',
      engineAttemptId: 1,
      logicalAttemptId: 1,
      stepId: 'model.analytics.orders',
      idempotencyKey: 'StepCompleted|tenant-a|run-compiled-code-ref-1|1|materialized',
      payload: {
        materialization: {
          executor: 'postgres',
          environmentId: 'prod',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
          startedAt: '2026-03-07T10:00:00.000Z',
          completedAt: '2026-03-07T10:00:03.000Z',
          durationMs: 3000,
        },
      },
    });

    expect(parsed.eventType).toBe('StepCompleted');
    expect(parsed.payload?.materialization).toMatchObject({
      executor: 'postgres',
      sinkTable: 'analytics.orders_daily',
      rowsWritten: 42,
    });
  });

  it('accepts StepFailed payloads with reason and message diagnostics', () => {
    const parsed = parseRunEventWrite({
      eventId: 'evt-step-failed-1',
      eventType: 'StepFailed',
      payloadVersion: 1,
      emittedAt: '2026-03-07T10:00:00.000Z',
      runId: 'run-compiled-code-ref-1',
      tenantId: 'tenant-a',
      projectId: 'project-analytics',
      environmentId: 'prod',
      planId: 'plan-compiled-code-ref-1',
      planVersion: '1.0',
      engineAttemptId: 1,
      logicalAttemptId: 1,
      stepId: 'model.analytics.orders',
      idempotencyKey: 'StepFailed|tenant-a|run-compiled-code-ref-1|1|model.analytics.orders',
      payload: {
        reason: 'SINK_WRITE_FAILED',
        message: 'duplicate key value violates unique constraint',
        failedAt: '2026-03-07T10:00:04.000Z',
      },
    });

    expect(parsed.eventType).toBe('StepFailed');
    expect(parsed.payload?.reason).toBe('SINK_WRITE_FAILED');
    expect(parsed.payload?.message).toContain('duplicate key value');
  });

  it('rejects unsupported payload versions', () => {
    expect(() =>
      parseRunEventWrite({
        ...STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE,
        payloadVersion: 2,
      })
    ).toThrow();
  });

  it('rejects write envelopes that omit payloadVersion', () => {
    const withoutPayloadVersion = {
      ...STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE,
    } as Record<string, unknown>;
    delete withoutPayloadVersion['payloadVersion'];

    expect(() => parseRunEventWrite(withoutPayloadVersion)).toThrow();
  });

  it('rejects write envelopes whose runId is only whitespace', () => {
    expect(() =>
      parseRunEventWrite({
        ...STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE,
        runId: '   ',
      })
    ).toThrow();
  });

  it('rejects RunFailed payloads that do not expose a reason', () => {
    expect(() =>
      parseRunEventWrite({
        eventId: 'evt-run-failed-invalid',
        eventType: 'RunFailed',
        payloadVersion: 1,
        emittedAt: '2026-03-07T10:00:00.000Z',
        runId: 'run-compiled-code-ref-1',
        tenantId: 'tenant-a',
        projectId: 'project-analytics',
        environmentId: 'prod',
        planId: 'plan-compiled-code-ref-1',
        planVersion: '1.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: 'RunFailed|tenant-a|run-compiled-code-ref-1|1|reason-missing',
        payload: { gatewayDecision: true },
      })
    ).toThrow();
  });

  it('accepts RunFailed write events with a domain reason', () => {
    const parsed = parseRunEventWrite({
      eventId: 'evt-run-failed-1',
      eventType: 'RunFailed',
      payloadVersion: 1,
      emittedAt: '2026-03-07T10:00:00.000Z',
      runId: 'run-compiled-code-ref-1',
      tenantId: 'tenant-a',
      projectId: 'project-analytics',
      environmentId: 'prod',
      planId: 'plan-compiled-code-ref-1',
      planVersion: '1.0',
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: 'RunFailed|tenant-a|run-compiled-code-ref-1|1|step-failure',
      payload: { reason: 'STEP_FAILURE' },
    });

    expect(parsed.eventType).toBe('RunFailed');
    expect(parsed.payload?.reason).toBe('STEP_FAILURE');
  });

  it('rejects RunFailed write events with unknown reasons', () => {
    expect(() =>
      parseRunEventWrite({
        eventId: 'evt-run-failed-2',
        eventType: 'RunFailed',
        payloadVersion: 1,
        emittedAt: '2026-03-07T10:00:00.000Z',
        runId: 'run-compiled-code-ref-1',
        tenantId: 'tenant-a',
        projectId: 'project-analytics',
        environmentId: 'prod',
        planId: 'plan-compiled-code-ref-1',
        planVersion: '1.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: 'RunFailed|tenant-a|run-compiled-code-ref-1|1|bad-reason',
        payload: { reason: 'oops' },
      })
    ).toThrow();
  });
});
