/**
 * @file packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts
 *
 * Verifies that applyRunEvent throws InvalidStateTransitionError when an event
 * targets a run or step already in a terminal status.
 *
 * Terminal run statuses: COMPLETED, FAILED, CANCELLED
 * Terminal step statuses: COMPLETED, SKIPPED (FAILED is not terminal; retries allowed)
 */
import { describe, expect, it } from 'vitest';

import { InvalidStateTransitionError } from '../../src/contracts/errors.js';
import type { EventEnvelope, WorkflowSnapshot } from '../../src/contracts/runEvents.js';
import { applyRunEvent } from '../../src/core/SnapshotProjector.js';

// Helpers

function makeSnap(status: WorkflowSnapshot['status']): WorkflowSnapshot {
  return {
    runId: 'run-test',
    status,
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };
}

function makeRunEvent(eventType: string): EventEnvelope {
  return {
    eventId: 'ev-1',
    runId: 'run-test',
    tenantId: 'tenant-1',
    eventType,
    emittedAt: '2026-01-01T00:00:00Z',
    runSeq: 1,
    payload: {},
  } as unknown as EventEnvelope;
}

function makeStepEvent(eventType: string, stepId: string): EventEnvelope {
  return {
    eventId: 'ev-1',
    runId: 'run-test',
    tenantId: 'tenant-1',
    eventType,
    stepId,
    emittedAt: '2026-01-01T00:00:00Z',
    runSeq: 1,
    payload: {},
  } as unknown as EventEnvelope;
}

// Run-level terminal guards

const RUN_MUTATING_EVENTS = [
  'RunStarted',
  'RunPaused',
  'RunResumed',
  'RunCancelRequested',
  'RunCancelled',
  'RunCompleted',
  'RunFailed',
];

const TERMINAL_RUN_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'] as const;

describe('applyRunEvent - run terminal guard', () => {
  for (const terminalStatus of TERMINAL_RUN_STATUSES) {
    for (const eventType of RUN_MUTATING_EVENTS) {
      it(`throws InvalidStateTransitionError for ${eventType} on ${terminalStatus} run`, () => {
        const snap = makeSnap(terminalStatus);
        const event = makeRunEvent(eventType);
        expect(() => applyRunEvent(snap, event)).toThrow(InvalidStateTransitionError);
      });

      it(`error code is INVALID_STATE_TRANSITION for ${eventType} on ${terminalStatus}`, () => {
        const snap = makeSnap(terminalStatus);
        const event = makeRunEvent(eventType);
        let caught: unknown;
        try {
          applyRunEvent(snap, event);
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(InvalidStateTransitionError);
        expect((caught as InvalidStateTransitionError).code).toBe('INVALID_STATE_TRANSITION');
        expect((caught as InvalidStateTransitionError).details).toMatchObject({
          fromStatus: terminalStatus,
          eventType,
        });
      });
    }
  }

  it('does not throw for RunQueued on any status (no-op handler)', () => {
    for (const status of TERMINAL_RUN_STATUSES) {
      const snap = makeSnap(status);
      expect(() => applyRunEvent(snap, makeRunEvent('RunQueued'))).not.toThrow();
    }
  });

  it('does not throw for unknown event types on terminal runs (fail-open)', () => {
    const snap = makeSnap('COMPLETED');
    expect(() => applyRunEvent(snap, makeRunEvent('SomeUnknownEvent'))).not.toThrow();
  });
});

// Step terminal guards

describe('applyRunEvent - step terminal guard', () => {
  const stepEvents = ['StepStarted', 'StepCompleted', 'StepFailed', 'StepSkipped'];
  const terminalStepStatuses = ['COMPLETED', 'SKIPPED'] as const;

  for (const terminalStepStatus of terminalStepStatuses) {
    for (const eventType of stepEvents) {
      it(`throws for ${eventType} on step already in ${terminalStepStatus}`, () => {
        const snap = makeSnap('RUNNING');
        snap.steps['step-a'] = {
          status: terminalStepStatus,
          attempts: 1,
          completedAt: '2026-01-01T00:00:00Z',
        };
        expect(() => applyRunEvent(snap, makeStepEvent(eventType, 'step-a'))).toThrow(
          InvalidStateTransitionError
        );
      });

      it(`error includes stepId for ${eventType} on ${terminalStepStatus} step`, () => {
        const snap = makeSnap('RUNNING');
        snap.steps['step-b'] = { status: terminalStepStatus, attempts: 1 };
        let caught: unknown;
        try {
          applyRunEvent(snap, makeStepEvent(eventType, 'step-b'));
        } catch (error) {
          caught = error;
        }
        expect((caught as InvalidStateTransitionError).details).toMatchObject({
          stepId: 'step-b',
          fromStatus: terminalStepStatus,
        });
      });
    }
  }

  it('allows StepStarted on FAILED step (retry path)', () => {
    const snap = makeSnap('RUNNING');
    snap.steps['step-c'] = {
      status: 'FAILED',
      attempts: 1,
      completedAt: '2026-01-01T00:00:00Z',
    };
    expect(() => applyRunEvent(snap, makeStepEvent('StepStarted', 'step-c'))).not.toThrow();
    expect(snap.steps['step-c']?.status).toBe('RUNNING');
    expect(snap.steps['step-c']?.attempts).toBe(2);
  });

  it('allows all step events on new (unseen) steps', () => {
    const snap = makeSnap('RUNNING');
    expect(() => applyRunEvent(snap, makeStepEvent('StepStarted', 'step-new'))).not.toThrow();
  });
});
