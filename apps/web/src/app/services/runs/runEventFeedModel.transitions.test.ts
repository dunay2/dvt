import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../../types/engine';
import {
  createRunEventFeedState,
  transitionRunEventFeed,
  type RunEventFeedState,
} from './runEventFeedModel';

function makeEvent(eventId: string, runSeq: number): RunEvent {
  return {
    eventId,
    eventType: 'StepStarted',
    runId: 'run_1',
    emittedAt: `2026-07-10T10:00:0${runSeq}.000Z`,
    tenantId: 'tenant_1',
    projectId: 'project_1',
    environmentId: 'environment_1',
    planId: 'plan_1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: `${eventId}-key`,
    payloadVersion: 1,
    stepId: 'model.orders',
    runSeq,
    persistedAt: `2026-07-10T10:00:0${runSeq}.000Z`,
  } as RunEvent;
}

function apply(
  state: RunEventFeedState,
  transition: Parameters<typeof transitionRunEventFeed>[1]
): RunEventFeedState {
  const result = transitionRunEventFeed(state, transition);
  expect(result.disposition).toBe('applied');
  return result.state;
}

describe('runEventFeedModel transitions', () => {
  it('moves through initial load, retry, stale recovery, terminal drain, and completion', () => {
    let state = createRunEventFeedState();
    expect(state).toEqual({ phase: 'idle' });

    state = apply(state, { type: 'start', runId: 'run_1' });
    expect(state).toMatchObject({
      phase: 'initial-loading',
      runId: 'run_1',
      events: [],
      consecutiveFailures: 0,
    });

    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });
    expect(state).toMatchObject({
      phase: 'live',
      latestObservedSeq: 1,
      nextAfterSeq: 1,
      lastSuccessfulFetchAt: '2026-07-10T10:00:10.000Z',
      consecutiveFailures: 0,
    });

    state = apply(state, { type: 'transient-failure', runId: 'run_1' });
    expect(state).toMatchObject({ phase: 'retrying', consecutiveFailures: 1 });

    state = apply(state, { type: 'mark-stale', runId: 'run_1' });
    expect(state).toMatchObject({ phase: 'stale', consecutiveFailures: 1 });

    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:20.000Z',
      page: {
        events: [makeEvent('evt_1', 1), makeEvent('evt_2', 2)],
        nextAfterSeq: 2,
      },
    });
    expect(state).toMatchObject({
      phase: 'live',
      latestObservedSeq: 2,
      consecutiveFailures: 0,
    });

    state = apply(state, { type: 'terminal-observed', runId: 'run_1' });
    expect(state.phase).toBe('terminal-draining');

    state = apply(state, {
      type: 'terminal-drain-completed',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:30.000Z',
      page: { events: [makeEvent('evt_3', 3)], nextAfterSeq: 3 },
    });
    expect(state).toMatchObject({
      phase: 'complete',
      latestObservedSeq: 3,
      nextAfterSeq: 3,
      lastSuccessfulFetchAt: '2026-07-10T10:00:30.000Z',
      consecutiveFailures: 0,
    });
    expect(state.phase === 'idle' ? [] : state.events.map((event) => event.eventId)).toEqual([
      'evt_1',
      'evt_2',
      'evt_3',
    ]);
  });

  it('preserves buffered events while failures progress from retrying to stale', () => {
    let state = apply(createRunEventFeedState(), { type: 'start', runId: 'run_1' });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });
    state = apply(state, { type: 'transient-failure', runId: 'run_1' });
    state = apply(state, { type: 'transient-failure', runId: 'run_1' });
    state = apply(state, { type: 'mark-stale', runId: 'run_1' });

    expect(state).toMatchObject({
      phase: 'stale',
      consecutiveFailures: 2,
      latestObservedSeq: 1,
      lastSuccessfulFetchAt: '2026-07-10T10:00:10.000Z',
    });
    expect(state.phase === 'idle' ? [] : state.events).toHaveLength(1);
  });

  it('enters failed only after an explicit non-retryable failure', () => {
    let state = apply(createRunEventFeedState(), { type: 'start', runId: 'run_1' });
    state = apply(state, { type: 'non-retryable-failure', runId: 'run_1' });

    expect(state).toMatchObject({ phase: 'failed', runId: 'run_1' });
  });

  it('resets every run-bound state without retaining events or cursors', () => {
    let state = apply(createRunEventFeedState(), { type: 'start', runId: 'run_1' });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });

    state = apply(state, { type: 'reset' });

    expect(state).toEqual({ phase: 'idle' });
  });
});
