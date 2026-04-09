import { describe, expect, it } from 'vitest';

import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import {
  appendRunStarted,
  bootstrapQueuedRun,
  makeRunRef,
} from '../helpers/runLifecycle.fixture.js';

describe('MockAdapter cancellation lifecycle', () => {
  it('cancelRun emits RunCancelRequested before RunCancelled and replays deterministically', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-cancel-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'mock',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'mock' });

    await adapter.cancelRun(runRef);

    const events = await store.listEvents('t', runId);
    expect(events.map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunStarted',
      'RunCancelRequested',
      'RunCancelled',
    ]);

    const firstStatus = await adapter.getRunStatus(runRef);
    const secondStatus = await adapter.getRunStatus(runRef);
    expect(firstStatus.status).toBe('CANCELLED');
    expect(secondStatus.status).toBe(firstStatus.status);
  });

  it('signal(CANCEL) follows the same lifecycle ordering as cancelRun', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-cancel-signal-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'mock',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'mock' });

    await adapter.signal(runRef, {
      signalId: 'sig-mock-cancel-1',
      type: 'CANCEL',
      reason: 'operator-request',
    });

    expect((await store.listEvents('t', runId)).map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunStarted',
      'RunCancelRequested',
      'RunCancelled',
    ]);
  });

  it('signal(PAUSE) and signal(RESUME) emit runtime-owned lifecycle events', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-pause-resume-signal-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'mock',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'mock' });

    await adapter.signal(runRef, {
      signalId: 'sig-mock-pause-1',
      type: 'PAUSE',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-mock-resume-1',
      type: 'RESUME',
    });

    expect((await store.listEvents('t', runId)).map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunStarted',
      'RunPaused',
      'RunResumed',
    ]);
  });

  it('allows a second PAUSE after RESUME when the signalId is new', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-pause-resume-pause-signal-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'mock',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'mock' });

    await adapter.signal(runRef, {
      signalId: 'sig-mock-pause-1',
      type: 'PAUSE',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-mock-resume-1',
      type: 'RESUME',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-mock-pause-2',
      type: 'PAUSE',
    });

    expect((await store.listEvents('t', runId)).map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunStarted',
      'RunPaused',
      'RunResumed',
      'RunPaused',
    ]);
  });

  it('deduplicates stale PAUSE signal ids after a pause-resume cycle', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-pause-signal-id-dedupe-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'mock',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'mock' });

    await adapter.signal(runRef, {
      signalId: 'sig-mock-pause-1',
      type: 'PAUSE',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-mock-resume-1',
      type: 'RESUME',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-mock-pause-1',
      type: 'PAUSE',
    });

    expect((await store.listEvents('t', runId)).map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunStarted',
      'RunPaused',
      'RunResumed',
    ]);
  });
});
