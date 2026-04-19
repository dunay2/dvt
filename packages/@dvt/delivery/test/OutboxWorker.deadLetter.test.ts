import { describe, expect, it } from 'vitest';

import { OutboxWorker } from '../src/application/OutboxWorker.js';
import { InMemoryOutboxStorage } from '../src/testing/InMemoryOutboxStorage.js';

import { makeAlwaysFailBus, makeEvent } from './support/outboxWorkerTestSupport.js';

describe('OutboxWorker dead-letter behavior', () => {
  it('moves event to DLQ after MAX_OUTBOX_ATTEMPTS and supports manual replay', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const worker = new OutboxWorker(store, makeAlwaysFailBus(), {
      batchSize: 10,
      stopOnError: false,
    });
    await store.enqueueTx('run-dlq', [makeEvent('dlq', 'run-dlq', 1)]);

    for (let index = 0; index < 10; index += 1) {
      now.value = index * 65_000;
      const result = await worker.tick();
      expect(result.retryBacklogActive).toBe(index < 9);
    }

    await expect(store.listPending(10)).resolves.toHaveLength(0);
    const dlq = await store.listDeadLetter(10, 't1');
    expect(dlq).toHaveLength(1);
    expect(dlq[0]?.runId).toBe('run-dlq');

    const moved = await store.replayDeadLetters({ tenantId: 't1', runId: 'run-dlq' });
    expect(moved).toBe(1);
    await expect(store.listDeadLetter(10, 't1')).resolves.toHaveLength(0);
    await expect(store.listPending(10)).resolves.toHaveLength(1);
  });

  it('replay clears failure state before a dead-lettered record is retried again', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const failingWorker = new OutboxWorker(store, makeAlwaysFailBus(), {
      batchSize: 10,
      stopOnError: false,
    });
    await store.enqueueTx('run-replay-clean', [makeEvent('replay-clean', 'run-replay-clean', 1)]);

    for (let index = 0; index < 10; index += 1) {
      now.value = index * 65_000;
      await failingWorker.tick();
    }

    const moved = await store.replayDeadLetters({ tenantId: 't1', runId: 'run-replay-clean' });
    expect(moved).toBe(1);

    const [replayed] = await store.listPending(10);
    expect(replayed?.attempts).toBe(0);
    expect(replayed?.lastError).toBeUndefined();
    expect(replayed?.nextAttemptAt).toBeUndefined();
  });

  it('listDeadLetter returns only records belonging to the requesting tenant', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const worker = new OutboxWorker(store, makeAlwaysFailBus(), {
      batchSize: 10,
      stopOnError: false,
    });

    await store.enqueueTx('run-t1', [makeEvent('t1-evt', 'run-t1', 1, 't1')]);
    await store.enqueueTx('run-t2', [makeEvent('t2-evt', 'run-t2', 1, 't2')]);

    for (let index = 0; index < 10; index += 1) {
      now.value = index * 65_000;
      await worker.tick();
    }

    const t1Records = await store.listDeadLetter(10, 't1');
    expect(t1Records).toHaveLength(1);
    expect(t1Records[0]?.runId).toBe('run-t1');

    const t2Records = await store.listDeadLetter(10, 't2');
    expect(t2Records).toHaveLength(1);
    expect(t2Records[0]?.runId).toBe('run-t2');
  });

  it('replayDeadLetters only restores dead letters belonging to the requesting tenant', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const worker = new OutboxWorker(store, makeAlwaysFailBus(), {
      batchSize: 10,
      stopOnError: false,
    });

    await store.enqueueTx('run-t1', [makeEvent('t1-evt', 'run-t1', 1, 't1')]);

    for (let index = 0; index < 10; index += 1) {
      now.value = index * 65_000;
      await worker.tick();
    }

    const movedByT2 = await store.replayDeadLetters({ tenantId: 't2' });
    expect(movedByT2).toBe(0);

    await expect(store.listDeadLetter(10, 't1')).resolves.toHaveLength(1);

    const movedByT1 = await store.replayDeadLetters({ tenantId: 't1' });
    expect(movedByT1).toBe(1);
    await expect(store.listDeadLetter(10, 't1')).resolves.toHaveLength(0);
  });
});
