import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../../types/engine';
import { buildRunEventPresentationModel, levelForEventType } from './runEventPresentationModel';

function makeEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    eventId: 'evt_1',
    eventType: 'StepStarted',
    runId: 'run_1',
    emittedAt: '2026-04-06T10:35:14.000Z',
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'e1',
    planId: 'plan_1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'run_1-evt_1',
    payloadVersion: 1,
    stepId: 'stg_orders',
    runSeq: 1,
    persistedAt: '2026-04-06T10:35:14.000Z',
    ...overrides,
  } as RunEvent;
}

describe('buildRunEventPresentationModel', () => {
  it('builds semantic state for step-started events', () => {
    expect(buildRunEventPresentationModel(makeEvent())).toEqual({
      level: 'INFO',
      headlineKey: 'stepStarted',
      fallbackHeadline: null,
      detail: null,
      stepId: 'stg_orders',
    });
  });

  it('preserves payload detail for step failures', () => {
    expect(
      buildRunEventPresentationModel(
        makeEvent({
          eventType: 'StepFailed',
          payload: { message: 'OOM killed' },
        })
      )
    ).toEqual({
      level: 'ERROR',
      headlineKey: 'stepFailed',
      fallbackHeadline: null,
      detail: 'OOM killed',
      stepId: 'stg_orders',
    });
  });

  it('omits step identity for run-level events', () => {
    expect(
      buildRunEventPresentationModel(
        makeEvent({
          eventType: 'RunCompleted',
          stepId: undefined as never,
        })
      )
    ).toEqual({
      level: 'SUCCESS',
      headlineKey: 'runCompleted',
      fallbackHeadline: null,
      detail: null,
      stepId: null,
    });
  });

  it('falls back gracefully for unknown event types', () => {
    expect(
      buildRunEventPresentationModel(
        makeEvent({
          eventType: 'CustomEvent' as never,
          payload: { message: 'custom detail' },
        })
      )
    ).toEqual({
      level: 'INFO',
      headlineKey: 'fallback',
      fallbackHeadline: 'CustomEvent',
      detail: 'custom detail',
      stepId: 'stg_orders',
    });
  });
});

describe('levelForEventType', () => {
  it('returns WARN/ERROR/SUCCESS/INFO according to the shared event map', () => {
    expect(levelForEventType('RunPaused')).toBe('WARN');
    expect(levelForEventType('RunFailed')).toBe('ERROR');
    expect(levelForEventType('RunCompleted')).toBe('SUCCESS');
    expect(levelForEventType('SomethingElse')).toBe('INFO');
  });
});
