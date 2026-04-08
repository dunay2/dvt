/**
 * @file packages/@dvt/run-domain/test/applyRunEvent.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Verify shared run projection guards and fail-open compatibility.
 * @version 1.0.0
 * @date 2026-03-15
 */
import type { EventEnvelope, WorkflowSnapshot } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  applyRunEvent,
  InvalidRunEventShapeError,
  InvalidStateTransitionError,
} from '../src/index.js';

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
        expect(() => applyRunEvent(snap, makeRunEvent(eventType))).toThrow(
          InvalidStateTransitionError
        );
      });

      it(`includes stable error details for ${eventType} on ${terminalStatus}`, () => {
        const snap = makeSnap(terminalStatus);
        let caught: unknown;
        try {
          applyRunEvent(snap, makeRunEvent(eventType));
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

  it('does not throw for RunQueued on terminal statuses', () => {
    for (const status of TERMINAL_RUN_STATUSES) {
      expect(() => applyRunEvent(makeSnap(status), makeRunEvent('RunQueued'))).not.toThrow();
    }
  });

  it('treats RunQueued as lifecycle evidence without mutating the snapshot', () => {
    const snap = makeSnap('PENDING');

    applyRunEvent(snap, makeRunEvent('RunQueued'));

    expect(snap).toEqual(makeSnap('PENDING'));
  });

  it('does not throw for unknown event types on terminal runs', () => {
    expect(() =>
      applyRunEvent(makeSnap('COMPLETED'), makeRunEvent('SomeUnknownEvent'))
    ).not.toThrow();
  });
});

describe('applyRunEvent - step terminal guard', () => {
  const stepEvents = ['StepStarted', 'StepCompleted', 'StepFailed', 'StepSkipped'];
  const terminalStepStatuses = ['COMPLETED', 'SKIPPED'] as const;

  for (const terminalStepStatus of terminalStepStatuses) {
    for (const eventType of stepEvents) {
      it(`throws for ${eventType} on step already in ${terminalStepStatus}`, () => {
        const snap = makeSnap('RUNNING');
        snap.steps['step-a'] = { status: terminalStepStatus, attempts: 1 };
        expect(() => applyRunEvent(snap, makeStepEvent(eventType, 'step-a'))).toThrow(
          InvalidStateTransitionError
        );
      });

      it(`includes step details for ${eventType} on ${terminalStepStatus}`, () => {
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

  it('allows StepStarted on FAILED step for retry', () => {
    const snap = makeSnap('RUNNING');
    snap.steps['step-c'] = { status: 'FAILED', attempts: 1 };
    applyRunEvent(snap, makeStepEvent('StepStarted', 'step-c'));
    expect(snap.steps['step-c']?.status).toBe('RUNNING');
    expect(snap.steps['step-c']?.attempts).toBe(2);
  });

  it('records gatewayDecision on StepCompleted', () => {
    const snap = makeSnap('RUNNING');
    applyRunEvent(snap, makeStepEvent('StepStarted', 'step-gw'));
    const event = {
      ...makeStepEvent('StepCompleted', 'step-gw'),
      payload: { gatewayDecision: true },
    } as unknown as EventEnvelope;
    applyRunEvent(snap, event);
    expect(snap.gatewayDecisions?.['step-gw']).toBe(true);
  });
});

describe('applyRunEvent - explicit transition guards', () => {
  it('allows RunCancelRequested when run is PENDING', () => {
    const snap = makeSnap('PENDING');
    applyRunEvent(snap, makeRunEvent('RunCancelRequested'));
    expect(snap.cancelling).toBe(true);
    expect(snap.status).toBe('PENDING');
  });

  it('rejects RunPaused when run is not RUNNING', () => {
    expect(() => applyRunEvent(makeSnap('PENDING'), makeRunEvent('RunPaused'))).toThrow(
      InvalidStateTransitionError
    );
  });

  it('rejects RunResumed when run is not PAUSED', () => {
    expect(() => applyRunEvent(makeSnap('RUNNING'), makeRunEvent('RunResumed'))).toThrow(
      InvalidStateTransitionError
    );
  });

  it('rejects RunCancelled without cancellation intent state', () => {
    expect(() => applyRunEvent(makeSnap('RUNNING'), makeRunEvent('RunCancelled'))).toThrow(
      InvalidStateTransitionError
    );
  });

  it('rejects StepCompleted when step is still PENDING', () => {
    expect(() =>
      applyRunEvent(makeSnap('RUNNING'), makeStepEvent('StepCompleted', 'step-p'))
    ).toThrow(InvalidStateTransitionError);
  });

  it('rejects StepFailed when step is still PENDING', () => {
    expect(() => applyRunEvent(makeSnap('RUNNING'), makeStepEvent('StepFailed', 'step-p'))).toThrow(
      InvalidStateTransitionError
    );
  });

  it('rejects StepSkipped when step is already RUNNING', () => {
    const snap = makeSnap('RUNNING');
    applyRunEvent(snap, makeStepEvent('StepStarted', 'step-running'));
    expect(() => applyRunEvent(snap, makeStepEvent('StepSkipped', 'step-running'))).toThrow(
      InvalidStateTransitionError
    );
  });

  it('rejects malformed step events without stepId', () => {
    const malformed = {
      ...makeRunEvent('StepStarted'),
      stepId: undefined,
    } as unknown as EventEnvelope;
    let caught: unknown;
    try {
      applyRunEvent(makeSnap('RUNNING'), malformed);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidRunEventShapeError);
    expect((caught as InvalidRunEventShapeError).code).toBe('INVALID_RUN_EVENT_SHAPE');
    expect((caught as InvalidRunEventShapeError).details).toMatchObject({
      eventType: 'StepStarted',
    });
  });

  it('rejects malformed step events with empty stepId', () => {
    const malformed = {
      ...makeStepEvent('StepStarted', ''),
      stepId: '',
    } as unknown as EventEnvelope;
    let caught: unknown;
    try {
      applyRunEvent(makeSnap('RUNNING'), malformed);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidRunEventShapeError);
    expect((caught as InvalidRunEventShapeError).code).toBe('INVALID_RUN_EVENT_SHAPE');
    expect((caught as InvalidRunEventShapeError).details).toMatchObject({
      eventType: 'StepStarted',
    });
  });
});

describe('applyRunEvent - TF-C2-B read-surface evidence', () => {
  it('projects current and failed step diagnostics from step lifecycle events', () => {
    const snap = makeSnap('RUNNING');

    applyRunEvent(snap, makeStepEvent('StepStarted', 'step-transform'));
    expect(snap.execution?.activeStepId).toBe('step-transform');
    expect(snap.execution?.failure).toBeUndefined();

    applyRunEvent(snap, {
      ...makeStepEvent('StepFailed', 'step-transform'),
      payload: {
        reason: 'SINK_WRITE_FAILED',
        message: 'duplicate key value violates unique constraint',
      },
    } as unknown as EventEnvelope);

    expect(snap.execution?.activeStepId).toBeUndefined();
    expect(snap.execution?.failure).toMatchObject({
      stepId: 'step-transform',
      reason: 'SINK_WRITE_FAILED',
      message: 'duplicate key value violates unique constraint',
    });
  });

  it('captures materialization evidence from step completion payloads', () => {
    const snap = makeSnap('RUNNING');

    applyRunEvent(snap, makeStepEvent('StepStarted', 'step-evidence'));
    applyRunEvent(snap, {
      ...makeStepEvent('StepCompleted', 'step-evidence'),
      payload: {
        materialization: {
          executor: 'postgres',
          environmentId: 'env-1',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
          startedAt: '2026-01-01T00:00:05Z',
          completedAt: '2026-01-01T00:00:08Z',
          durationMs: 3000,
        },
      },
    } as unknown as EventEnvelope);

    expect(snap.execution?.activeStepId).toBeUndefined();
    expect(snap.execution?.materialization).toEqual({
      executor: 'postgres',
      environmentId: 'env-1',
      sinkTable: 'analytics.orders_daily',
      rowsWritten: 42,
      startedAt: '2026-01-01T00:00:05Z',
      completedAt: '2026-01-01T00:00:08Z',
      durationMs: 3000,
    });
  });
});
