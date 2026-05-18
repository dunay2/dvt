import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../../types/engine';
import { iso } from '../../testing/contractTestUtils';
import {
  isRunEventStreamLiveStatus,
  mergeRunEventTimelinePage,
  normalizeRunEventTimelinePage,
  RUN_EVENT_LIVE_POLL_INTERVAL_MS,
} from './runEventTimelineModel';

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

describe('runEventTimelineModel', () => {
  it('normalizes a page by deduplicating event IDs and ordering by runtime sequence', () => {
    const normalized = normalizeRunEventTimelinePage({
      nextAfterSeq: 5,
      events: [
        makeEvent({ eventId: 'evt_3', runSeq: 3, emittedAt: iso('2026-04-06T10:35:16.000Z') }),
        makeEvent({ eventId: 'evt_1', runSeq: 1, emittedAt: iso('2026-04-06T10:35:14.000Z') }),
        makeEvent({ eventId: 'evt_2', runSeq: 2, emittedAt: iso('2026-04-06T10:35:15.000Z') }),
        makeEvent({ eventId: 'evt_1', runSeq: 1, emittedAt: iso('2026-04-06T10:35:14.000Z') }),
      ],
    });

    expect(normalized.nextAfterSeq).toBe(5);
    expect(normalized.events.map((event) => event.eventId)).toEqual(['evt_1', 'evt_2', 'evt_3']);
  });

  it('merges overlapping pages without duplicating existing visible events', () => {
    const merged = mergeRunEventTimelinePage(
      {
        nextAfterSeq: 3,
        events: [
          makeEvent({ eventId: 'evt_1', runSeq: 1 }),
          makeEvent({ eventId: 'evt_2', runSeq: 2 }),
        ],
      },
      {
        nextAfterSeq: 4,
        events: [
          makeEvent({ eventId: 'evt_2', runSeq: 2 }),
          makeEvent({ eventId: 'evt_3', runSeq: 3 }),
        ],
      }
    );

    expect(merged.nextAfterSeq).toBe(4);
    expect(merged.events.map((event) => event.eventId)).toEqual(['evt_1', 'evt_2', 'evt_3']);
  });

  it('falls back to the highest visible sequence when the adapter omits nextAfterSeq', () => {
    const merged = mergeRunEventTimelinePage(
      { events: [makeEvent({ eventId: 'evt_1', runSeq: 1 })] },
      { events: [makeEvent({ eventId: 'evt_2', runSeq: 2 })] }
    );

    expect(merged.nextAfterSeq).toBe(2);
  });

  it('identifies active statuses for live event polling', () => {
    expect(RUN_EVENT_LIVE_POLL_INTERVAL_MS).toBe(2_000);
    expect(isRunEventStreamLiveStatus('pending')).toBe(true);
    expect(isRunEventStreamLiveStatus('running')).toBe(true);
    expect(isRunEventStreamLiveStatus('completed')).toBe(false);
    expect(isRunEventStreamLiveStatus('failed')).toBe(false);
    expect(isRunEventStreamLiveStatus('cancelled')).toBe(false);
    expect(isRunEventStreamLiveStatus(undefined)).toBe(false);
  });
});
