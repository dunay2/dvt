import { describe, expect, it } from 'vitest';

import type { RunEventPersisted } from '../../src/contracts/runEvents.js';
import { InMemoryOutboxStorage } from '../../src/outbox/InMemoryOutboxStorage.js';
import { OutboxWorker } from '../../src/outbox/OutboxWorker.js';
import type { IEventBus } from '../../src/outbox/types.js';

function makeEvent(id: string, runId = 'run-1', runSeq = 1): RunEventPersisted {
  return {
    eventId: `evt-${id}`,
    eventType: 'RunQueued',
    runId,
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-02-27T00:00:00.000Z',
    idempotencyKey: `k-${id}`,
    runSeq,
    persistedAt: '2026-02-27T00:00:00.000Z',
  };
}

class CapturingBus implements IEventBus {
  public readonly published: RunEventPersisted[] = [];

  async publish(events: RunEventPersisted[]): Promise<void> {
    this.published.push(...events);
  }
}

class FailFirstBus implements IEventBus {
  public calls = 0;
  public readonly published: RunEventPersisted[] = [];

  async publish(events: RunEventPersisted[]): Promise<void> {
    this.calls += 1;
    if (this.calls === 1) {
      throw new Error('synthetic bus failure');
    }
    this.published.push(...events);
  }
}

describe('OutboxWorker', () => {
  it('drains pending outbox on successful publish', async () => {
    const store = new InMemoryOutboxStorage({ nowMs: () => 0 });
    const bus = new CapturingBus();
    const worker = new OutboxWorker(store, bus, { batchSize: 10 });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1), makeEvent('2', 'run-1', 2)]);

    await worker.tick();

    expect(bus.published).toHaveLength(2);
    await expect(store.listPending(10)).resolves.toHaveLength(0);
  });

  it('marks failed record and continues with the rest when stopOnError=false', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const bus = new FailFirstBus();
    const worker = new OutboxWorker(store, bus, { batchSize: 10, stopOnError: false });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1), makeEvent('2', 'run-1', 2)]);

    await worker.tick();

    // First record failed and remains pending with attempts=1 + nextAttemptAt backoff.
    // Immediate poll should not surface the failed item yet due to backoff gate.
    const pendingAfterFirstTick = await store.listPending(10);
    expect(pendingAfterFirstTick).toHaveLength(0);

    // Advance clock and confirm failed item is eligible with attempts=1.
    now.value = 1_001;
    const pendingAfterBackoff = await store.listPending(10);
    expect(pendingAfterBackoff).toHaveLength(1);
    expect(pendingAfterBackoff[0]?.attempts).toBe(1);
    expect(pendingAfterBackoff[0]?.nextAttemptAt).toBeDefined();

    // Retry and drain.
    now.value = 2_000;
    await worker.tick();

    await expect(store.listPending(10)).resolves.toHaveLength(0);
    expect(bus.published).toHaveLength(2);
  });

  it('moves event to DLQ after MAX_OUTBOX_ATTEMPTS and supports manual replay', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const alwaysFailBus: IEventBus = {
      publish: async () => {
        throw new Error('always fail');
      },
    };

    const worker = new OutboxWorker(store, alwaysFailBus, { batchSize: 10, stopOnError: false });
    await store.enqueueTx('run-dlq', [makeEvent('dlq', 'run-dlq', 1)]);

    // 10 failures -> DLQ
    for (let i = 0; i < 10; i += 1) {
      now.value = i * 65_000;
      await worker.tick();
    }

    await expect(store.listPending(10)).resolves.toHaveLength(0);
    const dlq = await store.listDeadLetter(10);
    expect(dlq).toHaveLength(1);
    expect(dlq[0]?.runId).toBe('run-dlq');

    const moved = await store.replayDeadLetters({ runId: 'run-dlq' });
    expect(moved).toBe(1);
    await expect(store.listDeadLetter(10)).resolves.toHaveLength(0);
    await expect(store.listPending(10)).resolves.toHaveLength(1);
  });
});
