import type { DeadLetterRecord, OutboxRecord } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { OutboxWorker } from '../src/application/OutboxWorker.js';
import type { IOutboxStorage } from '../src/contracts.js';
import { InMemoryOutboxStorage } from '../src/testing/InMemoryOutboxStorage.js';

import {
  CapturingBus,
  FailFirstMarkDeliveredStorage,
  makeEvent,
} from './support/outboxWorkerTestSupport.js';

describe('OutboxWorker delivery behavior', () => {
  it('drains pending outbox on successful publish', async () => {
    const store = new InMemoryOutboxStorage({ nowMs: () => 0 });
    const bus = new CapturingBus();
    const worker = new OutboxWorker(store, bus, { batchSize: 10 });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1), makeEvent('2', 'run-1', 2)]);

    const result = await worker.tick();

    expect(bus.published).toHaveLength(2);
    expect(result).toMatchObject({
      claimedCount: 2,
      deliveredCount: 2,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });
    await expect(store.listPending(10)).resolves.toHaveLength(0);
  });

  it('treats markDelivered failures after publish as redelivery-worthy ack failures', async () => {
    const now = { value: 0 };
    const storage = new FailFirstMarkDeliveredStorage(
      new InMemoryOutboxStorage({ nowMs: () => now.value })
    );
    const bus = new CapturingBus();
    const worker = new OutboxWorker(storage, bus, { batchSize: 10, stopOnError: false });

    await storage.enqueueTx('run-ack', [makeEvent('ack', 'run-ack', 1)]);

    const firstResult = await worker.tick();
    expect(firstResult).toMatchObject({
      claimedCount: 1,
      deliveredCount: 0,
      retriedCount: 1,
      deadLetteredCount: 0,
      retryBacklogActive: true,
    });
    expect(bus.published.map((event) => event.runSeq)).toEqual([1]);

    now.value = 1_001;
    const secondResult = await worker.tick();
    expect(secondResult).toMatchObject({
      claimedCount: 1,
      deliveredCount: 1,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });

    expect(bus.published.map((event) => event.runSeq)).toEqual([1, 1]);
  });

  it('computes claimed lag from the oldest record in the claimed batch', async () => {
    const storage: IOutboxStorage = {
      async enqueueTx(): Promise<void> {},
      async listPending(): Promise<OutboxRecord[]> {
        return [
          {
            id: 'outbox_newer',
            createdAt: '2026-02-27T00:00:30.000Z',
            idempotencyKey: 'k-newer',
            payload: makeEvent('newer'),
            attempts: 0,
          },
          {
            id: 'outbox_older_retry',
            createdAt: '2026-02-27T00:00:00.000Z',
            idempotencyKey: 'k-older',
            payload: makeEvent('older'),
            attempts: 1,
            nextAttemptAt: '2026-02-27T00:00:20.000Z',
          },
        ];
      },
      async markDelivered(): Promise<void> {},
      async markFailed(): Promise<void> {},
      async listDeadLetter(): Promise<DeadLetterRecord[]> {
        return [];
      },
      async replayDeadLetters(): Promise<number> {
        return 0;
      },
    };
    const worker = new OutboxWorker(storage, new CapturingBus(), {
      batchSize: 10,
      nowMs: () => Date.parse('2026-02-27T00:01:00.000Z'),
    });

    const result = await worker.tick();

    expect(result.oldestClaimedAgeMs).toBe(60_000);
  });
});
