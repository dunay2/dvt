import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../../types/engine';
import {
  createRunEventFeedState,
  RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES,
  RUN_EVENT_FEED_MAX_TERMINAL_DRAIN_PAGES,
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

    state = apply(state, {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
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

    state = apply(state, {
      type: 'transient-failure',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:11.000Z',
      failure: { kind: 'transport', message: 'Temporary failure.', retryable: true },
    });
    expect(state).toMatchObject({ phase: 'retrying', consecutiveFailures: 1 });

    state = apply(state, {
      type: 'transient-failure',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:21.000Z',
      failure: { kind: 'transport', message: 'Temporary failure.', retryable: true },
    });
    expect(state).toMatchObject({ phase: 'stale', consecutiveFailures: 2 });

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

    state = apply(state, {
      type: 'terminal-observed',
      runId: 'run_1',
      expectedEventType: 'RunCompleted',
    });
    expect(state.phase).toBe('terminal-draining');

    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:30.000Z',
      page: {
        events: [{ ...makeEvent('evt_3', 3), eventType: 'RunCompleted', stepId: undefined }],
        nextAfterSeq: 3,
      },
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
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });
    state = apply(state, {
      type: 'transient-failure',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:20.000Z',
      failure: { kind: 'transport', message: 'Temporary failure.', retryable: true },
    });
    state = apply(state, {
      type: 'transient-failure',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:21.000Z',
      failure: { kind: 'transport', message: 'Temporary failure.', retryable: true },
    });

    expect(state).toMatchObject({
      phase: 'stale',
      consecutiveFailures: 2,
      latestObservedSeq: 1,
      lastSuccessfulFetchAt: '2026-07-10T10:00:10.000Z',
    });
    expect(state.phase === 'idle' ? [] : state.events).toHaveLength(1);
  });

  it('enters failed only after an explicit non-retryable failure', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'non-retryable-failure',
      runId: 'run_1',
      failure: { kind: 'authorization', message: 'Access denied.', retryable: false },
    });

    expect(state).toMatchObject({ phase: 'failed', runId: 'run_1' });
  });

  it('resets every run-bound state without retaining events or cursors', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });

    state = apply(state, { type: 'reset' });

    expect(state).toEqual({ phase: 'idle' });
  });

  it('exposes deterministic bounded retry timing and marks an old projection stale', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:01.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });
    state = apply(state, {
      type: 'transient-failure',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:20.000Z',
      failure: {
        kind: 'transport',
        message: 'Runtime event service is unavailable.',
        retryable: true,
      },
    });

    expect(state).toMatchObject({
      phase: 'stale',
      consecutiveFailures: 1,
      nextRetryAt: '2026-07-10T10:00:21.000Z',
      failure: { kind: 'transport', retryable: true },
    });

    for (
      let failureCount = 1;
      failureCount <= RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES;
      failureCount += 1
    ) {
      state = apply(state, {
        type: 'transient-failure',
        runId: 'run_1',
        observedAt: `2026-07-10T10:00:2${failureCount}.000Z`,
        failure: {
          kind: 'transport',
          message: 'Runtime event service is unavailable.',
          retryable: true,
        },
      });
    }

    expect(state).toMatchObject({
      phase: 'stale',
      consecutiveFailures: RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES + 1,
    });
    expect(state.phase === 'idle' ? undefined : state.nextRetryAt).toBeUndefined();
  });

  it('does not leave a fresh buffered projection retrying after recovery is exhausted', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:01.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });

    for (
      let failureCount = 1;
      failureCount <= RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES + 1;
      failureCount += 1
    ) {
      state = apply(state, {
        type: 'transient-failure',
        runId: 'run_1',
        observedAt: `2026-07-10T10:00:0${failureCount + 1}.000Z`,
        failure: {
          kind: 'transport',
          message: 'Runtime event service is unavailable.',
          retryable: true,
        },
      });
    }

    expect(state).toMatchObject({
      phase: 'stale',
      events: [{ eventId: 'evt_1' }],
      consecutiveFailures: RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES + 1,
      failure: { kind: 'transport', retryable: true },
    });
    expect(state.phase === 'idle' ? undefined : state.nextRetryAt).toBeUndefined();
  });

  it('fails explicitly when initial loading exhausts recovery without buffered data', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });

    for (
      let failureCount = 1;
      failureCount <= RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES + 1;
      failureCount += 1
    ) {
      state = apply(state, {
        type: 'transient-failure',
        runId: 'run_1',
        observedAt: `2026-07-10T10:00:0${failureCount}.000Z`,
        failure: {
          kind: 'transport',
          message: 'Runtime event service is unavailable.',
          retryable: true,
        },
      });
    }

    expect(state).toMatchObject({
      phase: 'failed',
      events: [],
      failure: { kind: 'transport', retryable: true },
    });
  });

  it('completes terminal drain only after the authoritative terminal event is observed', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'terminal-observed',
      runId: 'run_1',
      expectedEventType: 'RunCompleted',
    });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:01.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });
    expect(state).toMatchObject({ phase: 'terminal-draining', terminalDrainPages: 1 });

    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:02.000Z',
      page: {
        events: [
          {
            ...makeEvent('evt_2', 2),
            eventType: 'RunCompleted',
            stepId: undefined,
          },
        ],
        nextAfterSeq: 2,
      },
    });

    expect(state).toMatchObject({
      phase: 'complete',
      latestObservedSeq: 2,
      expectedTerminalEventType: 'RunCompleted',
    });
  });

  it('fails terminal drain explicitly when bounded successful pages omit the terminal event', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'terminal-observed',
      runId: 'run_1',
      expectedEventType: 'RunFailed',
    });

    for (let page = 1; page <= RUN_EVENT_FEED_MAX_TERMINAL_DRAIN_PAGES; page += 1) {
      state = apply(state, {
        type: 'page-received',
        runId: 'run_1',
        observedAt: `2026-07-10T10:00:0${page}.000Z`,
        page: { events: [] },
      });
    }

    expect(state).toMatchObject({
      phase: 'failed',
      failure: {
        kind: 'terminal-drain-incomplete',
        retryable: true,
      },
    });
  });

  it('allows manual retry without resetting events or cursor state', () => {
    let state = apply(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:00.000Z',
    });
    state = apply(state, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:01.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });
    state = apply(state, {
      type: 'transient-failure',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:02.000Z',
      failure: { kind: 'transport', message: 'Network unavailable.', retryable: true },
    });
    state = apply(state, { type: 'retry-requested', runId: 'run_1' });

    expect(state).toMatchObject({
      phase: 'retrying',
      nextAfterSeq: 1,
      events: [{ eventId: 'evt_1' }],
    });
    expect(state.phase === 'idle' ? undefined : state.nextRetryAt).toBeUndefined();
  });
});
