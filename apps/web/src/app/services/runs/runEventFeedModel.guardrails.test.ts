import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../../types/engine';
import { createRunEventFeedState, transitionRunEventFeed } from './runEventFeedModel';

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

describe('runEventFeedModel guardrails', () => {
  it('rejects transitions that are invalid for the current phase', () => {
    const idle = createRunEventFeedState();

    const result = transitionRunEventFeed(idle, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [] },
    });

    expect(result).toEqual({ disposition: 'rejected-invalid-transition', state: idle });
  });

  it('ignores a late update belonging to a previously selected run', () => {
    const loading = transitionRunEventFeed(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_2',
    }).state;

    const result = transitionRunEventFeed(loading, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_1', 1)], nextAfterSeq: 1 },
    });

    expect(result).toEqual({ disposition: 'ignored-stale-run', state: loading });
  });

  it('ignores an explicit cursor regression without discarding buffered events', () => {
    const loading = transitionRunEventFeed(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
    }).state;
    const live = transitionRunEventFeed(loading, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [makeEvent('evt_3', 3)], nextAfterSeq: 3 },
    }).state;

    const result = transitionRunEventFeed(live, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:11.000Z',
      page: { events: [makeEvent('evt_2', 2)], nextAfterSeq: 2 },
    });

    expect(result.disposition).toBe('ignored-stale-page');
    expect(result.state).toBe(live);
  });

  it('retains an advanced cursor when the next successful page omits it', () => {
    const loading = transitionRunEventFeed(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
    }).state;
    const cursorOnlyPage = transitionRunEventFeed(loading, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [], nextAfterSeq: 11 },
    }).state;

    const result = transitionRunEventFeed(cursorOnlyPage, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:11.000Z',
      page: { events: [] },
    });

    expect(result.disposition).toBe('applied');
    expect(result.state).toMatchObject({ phase: 'live', nextAfterSeq: 11 });
  });

  it('rejects a page containing events from a different run', () => {
    const loading = transitionRunEventFeed(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
    }).state;
    const foreignEvent = { ...makeEvent('evt_foreign', 1), runId: 'run_2' };

    const result = transitionRunEventFeed(loading, {
      type: 'page-received',
      runId: 'run_1',
      observedAt: '2026-07-10T10:00:10.000Z',
      page: { events: [foreignEvent], nextAfterSeq: 1 },
    });

    expect(result).toEqual({ disposition: 'rejected-invalid-page', state: loading });
  });

  it('does not accept more updates after a terminal phase', () => {
    const loading = transitionRunEventFeed(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
    }).state;
    const failed = transitionRunEventFeed(loading, {
      type: 'non-retryable-failure',
      runId: 'run_1',
    }).state;

    const result = transitionRunEventFeed(failed, {
      type: 'transient-failure',
      runId: 'run_1',
    });

    expect(result).toEqual({ disposition: 'rejected-invalid-transition', state: failed });
  });

  it('starts a different run with a clean buffer', () => {
    const firstRun = transitionRunEventFeed(createRunEventFeedState(), {
      type: 'start',
      runId: 'run_1',
    }).state;

    const result = transitionRunEventFeed(firstRun, { type: 'start', runId: 'run_2' });

    expect(result).toEqual({
      disposition: 'applied',
      state: {
        phase: 'initial-loading',
        runId: 'run_2',
        events: [],
        consecutiveFailures: 0,
      },
    });
  });
});
