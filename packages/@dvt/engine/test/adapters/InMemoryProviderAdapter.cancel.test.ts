import { describe, expect, it } from 'vitest';

import { InMemoryProviderAdapter } from '../../src/adapters/inMemory/InMemoryProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import {
  appendRunStarted,
  bootstrapQueuedRun,
  makeRunRef,
} from '../helpers/runLifecycle.fixture.js';

describe('InMemoryProviderAdapter cancellation lifecycle', () => {
  it('cancelRun emits RunCancelRequested before RunCancelled and replays deterministically', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'temporal-cancel-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'temporal',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'temporal' });

    await adapter.cancelRun(runRef);

    const events = await store.listEvents('t', runId);
    expect(events.map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunStarted',
      'RunCancelRequested',
      'RunCancelled',
    ]);

    const firstStatus = await adapter.getProviderStatusView(runRef);
    const secondStatus = await adapter.getProviderStatusView(runRef);
    expect(firstStatus.providerStatus).toBe('CANCELLED');
    expect(secondStatus.providerStatus).toBe(firstStatus.providerStatus);
  });

  it('signal(CANCEL) follows the same lifecycle ordering as cancelRun', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'temporal-cancel-signal-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'temporal',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'temporal' });

    await adapter.signal(runRef, {
      signalId: 'sig-temporal-cancel-1',
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
    const adapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'temporal-pause-resume-signal-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'temporal',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'temporal' });

    await adapter.signal(runRef, {
      signalId: 'sig-temporal-pause-1',
      type: 'PAUSE',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-temporal-resume-1',
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
    const adapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'temporal-pause-resume-pause-signal-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'temporal',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'temporal' });

    await adapter.signal(runRef, {
      signalId: 'sig-temporal-pause-1',
      type: 'PAUSE',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-temporal-resume-1',
      type: 'RESUME',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-temporal-pause-2',
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
    const adapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'temporal-pause-signal-id-dedupe-1';
    await bootstrapQueuedRun(store, runId, {
      provider: 'temporal',
      emittedAt: '2026-03-31T00:00:00.000Z',
    });
    await appendRunStarted(store, runId, { emittedAt: '2026-03-31T00:00:00.001Z' });
    const runRef = makeRunRef(runId, { provider: 'temporal' });

    await adapter.signal(runRef, {
      signalId: 'sig-temporal-pause-1',
      type: 'PAUSE',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-temporal-resume-1',
      type: 'RESUME',
    });
    await adapter.signal(runRef, {
      signalId: 'sig-temporal-pause-1',
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
