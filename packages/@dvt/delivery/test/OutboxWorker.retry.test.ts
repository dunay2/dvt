import type { DeadLetterRecord, OutboxRecord } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { OutboxWorker } from '../src/application/OutboxWorker.js';
import type { IEventBus, IOutboxStorage } from '../src/contracts.js';
import { InMemoryOutboxStorage } from '../src/testing/InMemoryOutboxStorage.js';

import { CapturingBus, FailFirstBus, makeEvent } from './support/outboxWorkerTestSupport.js';

describe('OutboxWorker retry behavior', () => {
  it('marks failed record and continues with other runs when stopOnError=false', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const bus = new FailFirstBus();
    const worker = new OutboxWorker(store, bus, { batchSize: 10, stopOnError: false });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1)]);
    await store.enqueueTx('run-2', [makeEvent('2', 'run-2', 1)]);

    const firstResult = await worker.tick();
    expect(firstResult).toMatchObject({
      claimedCount: 2,
      deliveredCount: 1,
      retriedCount: 1,
      deadLetteredCount: 0,
      retryBacklogActive: true,
    });

    const pendingAfterFirstTick = await store.listPending(10);
    expect(pendingAfterFirstTick).toHaveLength(0);

    now.value = 1_001;
    const pendingAfterBackoff = await store.listPending(10);
    expect(pendingAfterBackoff).toHaveLength(1);
    expect(pendingAfterBackoff[0]?.attempts).toBe(1);
    expect(pendingAfterBackoff[0]?.nextAttemptAt).toBeDefined();

    now.value = 2_000;
    const secondResult = await worker.tick();
    expect(secondResult).toMatchObject({
      claimedCount: 1,
      deliveredCount: 1,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });

    await expect(store.listPending(10)).resolves.toHaveLength(0);
    expect(bus.published).toHaveLength(2);
  });

  it('does not bypass a failed record with a later event from the same runId', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const bus = new FailFirstBus();
    const worker = new OutboxWorker(store, bus, { batchSize: 10, stopOnError: false });

    await store.enqueueTx('run-ordered', [
      makeEvent('1', 'run-ordered', 1),
      makeEvent('2', 'run-ordered', 2),
    ]);

    const firstResult = await worker.tick();
    expect(firstResult).toMatchObject({
      claimedCount: 1,
      deliveredCount: 0,
      retriedCount: 1,
      deadLetteredCount: 0,
      retryBacklogActive: true,
    });
    expect(bus.published).toHaveLength(0);

    now.value = 1_001;
    const pendingAfterBackoff = await store.listPending(10);
    expect(pendingAfterBackoff).toHaveLength(1);
    expect(pendingAfterBackoff[0]?.payload.runSeq).toBe(1);

    const secondResult = await worker.tick();
    expect(secondResult).toMatchObject({
      claimedCount: 2,
      deliveredCount: 2,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });
    expect(bus.published.map((event) => event.runSeq)).toEqual([1, 2]);
  });

  it('falls back to local retry state when probing pending retries fails', async () => {
    const storage: IOutboxStorage = {
      async enqueueTx(): Promise<void> {},
      async listPending(): Promise<OutboxRecord[]> {
        return [
          {
            id: 'outbox_1',
            createdAt: '2026-02-27T00:00:00.000Z',
            idempotencyKey: 'k-1',
            payload: makeEvent('1'),
            attempts: 0,
          },
        ];
      },
      async markDelivered(): Promise<void> {},
      async markFailed(): Promise<void> {},
      async hasPendingRetries(): Promise<boolean> {
        throw new Error('synthetic retry probe failure');
      },
      async listDeadLetter(): Promise<DeadLetterRecord[]> {
        return [];
      },
      async replayDeadLetters(): Promise<number> {
        return 0;
      },
    };
    const alwaysFailBus: IEventBus = {
      publish: async () => {
        throw new Error('publish failed');
      },
    };
    const worker = new OutboxWorker(storage, alwaysFailBus, {
      batchSize: 10,
      stopOnError: false,
    });

    const result = await worker.tick();

    expect(result).toMatchObject({
      claimedCount: 1,
      deliveredCount: 0,
      retriedCount: 1,
      deadLetteredCount: 0,
      retryBacklogActive: true,
    });
  });

  it('treats retry backlog probing as best-effort when the batch is empty', async () => {
    const storage: IOutboxStorage = {
      async enqueueTx(): Promise<void> {},
      async listPending(): Promise<OutboxRecord[]> {
        return [];
      },
      async markDelivered(): Promise<void> {},
      async markFailed(): Promise<void> {},
      async hasPendingRetries(): Promise<boolean> {
        throw new Error('empty-batch retry probe failed');
      },
      async listDeadLetter(): Promise<DeadLetterRecord[]> {
        return [];
      },
      async replayDeadLetters(): Promise<number> {
        return 0;
      },
    };
    const worker = new OutboxWorker(storage, new CapturingBus(), {
      batchSize: 10,
      stopOnError: false,
    });

    const result = await worker.tick();

    expect(result).toMatchObject({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });
  });
});
