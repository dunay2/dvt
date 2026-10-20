/**
 * @ownedConcern First failure selection in canonical run read projections.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 */
import {
  asIsoUtcString,
  asStepId,
  CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
  type EventEnvelope,
  type WorkflowSnapshot,
} from '@dvt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { applyRunEvent } from '../src/applyRunEvent.js';

const runEvent: EventEnvelope = {
  eventId: 'event-1',
  eventType: 'RunFailed',
  runId: 'run-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  planId: 'plan-1',
  planVersion: '1.0',
  engineAttemptId: 1,
  logicalAttemptId: 1,
  idempotencyKey: 'event-1',
  payloadVersion: 1,
  runSeq: 1,
  emittedAt: asIsoUtcString('2026-10-15T00:00:00.000Z'),
  persistedAt: asIsoUtcString('2026-10-15T00:00:00.000Z'),
};

describe('canonical failure summary', () => {
  let snapshot: WorkflowSnapshot;
  beforeEach(() => {
    snapshot = {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId: 'run-1',
      status: 'RUNNING',
      paused: false,
      cancelling: false,
      steps: {},
    };
  });

  function applyStep(eventType: 'StepStarted' | 'StepFailed', stepId: string): void {
    applyRunEvent(snapshot, {
      ...runEvent,
      eventType,
      stepId: asStepId(stepId),
      payload: { reason: `${stepId}_FAILED`, message: `${stepId} failed` },
    });
  }

  it('keeps the first recorded failure while preserving every failed step state', () => {
    applyStep('StepStarted', 'a');
    applyStep('StepStarted', 'b');
    applyStep('StepFailed', 'a');
    const selectedFailure = snapshot.execution?.failure;
    applyStep('StepFailed', 'b');
    applyRunEvent(snapshot, runEvent);

    expect(snapshot.status).toBe('FAILED');
    expect(snapshot.steps['a']?.status).toBe('FAILED');
    expect(snapshot.steps['b']?.status).toBe('FAILED');
    expect(snapshot.execution?.failure).toEqual(selectedFailure);
    expect(snapshot.execution?.failure).toMatchObject({
      stepId: 'a',
      reason: 'a_FAILED',
      message: 'a failed',
    });
    expect(snapshot.execution?.materialization).toBeUndefined();
  });

  it('preserves the existing new-attempt reset rather than retaining stale failure evidence', () => {
    applyStep('StepStarted', 'a');
    applyStep('StepFailed', 'a');
    applyStep('StepStarted', 'a');
    expect(snapshot.execution?.failure).toBeUndefined();
    expect(snapshot.execution?.activeStepId).toBe('a');
    expect(snapshot.steps['a']?.attempts).toBe(2);
    applyStep('StepFailed', 'a');
    expect(snapshot.execution?.failure?.stepId).toBe('a');
  });
});
