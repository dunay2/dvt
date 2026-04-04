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
    expect(secondStatus.hash).toBe(firstStatus.hash);
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
});
