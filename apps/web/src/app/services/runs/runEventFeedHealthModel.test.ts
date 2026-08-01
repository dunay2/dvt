import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../../types/engine';
import type { RunEventFeedState } from './runEventFeedModel';
import { buildRunEventFeedHealthModel } from './runEventFeedHealthModel';

const event = {
  eventId: 'evt-1',
  runId: 'run-1',
  eventType: 'StepStarted',
  emittedAt: '2026-08-01T10:00:00.000Z',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'environment-1',
  planId: 'plan-1',
  planVersion: '1.0.0',
  engineAttemptId: 1,
  logicalAttemptId: 1,
  idempotencyKey: 'run-1-evt-1',
  payloadVersion: 1,
  stepId: 'model.orders',
  runSeq: 1,
  persistedAt: '2026-08-01T10:00:00.000Z',
} as RunEvent;

const failure = {
  kind: 'transport' as const,
  message: 'Runtime unavailable',
  retryable: true,
};

function feed(
  phase: Exclude<RunEventFeedState['phase'], 'idle'>,
  overrides: Partial<Exclude<RunEventFeedState, { phase: 'idle' }>> = {}
): RunEventFeedState {
  return {
    phase,
    runId: 'run-1',
    events: [],
    consecutiveFailures: 0,
    ...overrides,
  } as RunEventFeedState;
}

describe('buildRunEventFeedHealthModel', () => {
  it.each([
    [{ phase: 'idle' }, 'idle'],
    [feed('initial-loading'), 'loading'],
    [feed('live'), 'live'],
    [feed('retrying', { consecutiveFailures: 1, failure }), 'degraded'],
    [feed('stale', { consecutiveFailures: 4, failure }), 'degraded'],
    [feed('terminal-draining', { expectedTerminalEventType: 'RunCompleted' }), 'degraded'],
    [feed('complete', { expectedTerminalEventType: 'RunCompleted' }), 'complete'],
    [feed('failed', { consecutiveFailures: 4, failure }), 'failed'],
  ] satisfies Array<[RunEventFeedState, string]>)(
    'maps %s to the MVP %s health state',
    (state, expected) => {
      expect(buildRunEventFeedHealthModel(state).state).toBe(expected);
    }
  );

  it('preserves accumulated events and retry eligibility while degraded', () => {
    const model = buildRunEventFeedHealthModel(
      feed('stale', {
        events: [event],
        consecutiveFailures: 4,
        failure,
        lastSuccessfulFetchAt: '2026-08-01T10:00:05.000Z',
      })
    );

    expect(model).toMatchObject({
      state: 'degraded',
      events: [event],
      canRetry: true,
      lastSuccessfulFetchAt: '2026-08-01T10:00:05.000Z',
    });
  });

  it('reports buffered terminal failures as degraded instead of hiding usable evidence', () => {
    const model = buildRunEventFeedHealthModel(
      feed('failed', {
        events: [event],
        consecutiveFailures: 1,
        failure: { ...failure, retryable: false },
      })
    );

    expect(model).toMatchObject({ state: 'degraded', events: [event], canRetry: false });
  });
});
