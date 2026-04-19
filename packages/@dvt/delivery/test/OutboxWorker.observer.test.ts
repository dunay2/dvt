import { describe, expect, it } from 'vitest';

import { OutboxWorker } from '../src/application/OutboxWorker.js';
import type { OutboxFailureDisposition, OutboxRecord } from '../src/contracts.js';
import { InMemoryOutboxStorage } from '../src/testing/InMemoryOutboxStorage.js';

import { FailFirstBus, makeAlwaysFailBus, makeEvent } from './support/outboxWorkerTestSupport.js';

describe('OutboxWorker observer behavior', () => {
  it('treats observer callbacks as best-effort and preserves delivery semantics', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const bus = new FailFirstBus();
    const worker = new OutboxWorker(store, bus, {
      batchSize: 10,
      stopOnError: false,
      observer: {
        onBatchClaimed() {
          throw new Error('claim observer failed');
        },
        onRecordDelivered() {
          throw new Error('delivery observer failed');
        },
        onRecordFailed() {
          throw new Error('failure observer failed');
        },
      },
    });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1), makeEvent('2', 'run-1', 2)]);

    const firstResult = await worker.tick();
    expect(firstResult).toMatchObject({
      claimedCount: 1,
      deliveredCount: 0,
      retriedCount: 1,
      deadLetteredCount: 0,
      retryBacklogActive: true,
    });

    now.value = 2_000;
    const secondResult = await worker.tick();
    expect(secondResult).toMatchObject({
      claimedCount: 2,
      deliveredCount: 2,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });

    expect(bus.published).toHaveLength(2);
    await expect(store.listPending(10)).resolves.toHaveLength(0);
  });

  it('passes a stable pre-failure snapshot to observers', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const observed: Array<{
      attempts: number;
      nextAttemptAt: string | undefined;
      lastError: string | undefined;
    }> = [];
    const worker = new OutboxWorker(store, makeAlwaysFailBus('synthetic bus failure'), {
      batchSize: 10,
      observer: {
        onRecordFailed(record) {
          observed.push({
            attempts: record.attempts,
            nextAttemptAt: record.nextAttemptAt,
            lastError: record.lastError,
          });
        },
      },
    });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1)]);

    await worker.tick();

    expect(observed).toEqual([
      {
        attempts: 0,
        nextAttemptAt: undefined,
        lastError: undefined,
      },
    ]);
    now.value = 1_001;
    const [pending] = await store.listPending(10);
    expect(pending?.attempts).toBe(1);
    expect(pending?.nextAttemptAt).toBeDefined();
    expect(pending?.lastError).toBe('synthetic bus failure');
  });

  it('emits observer transitions for claim, delivery, retry, and dead-letter', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const transitions: string[] = [];
    const failures: Array<{ disposition: OutboxFailureDisposition; outboxId: string }> = [];
    const observer = {
      onBatchClaimed(records: readonly OutboxRecord[]) {
        transitions.push(`claim:${records.length}`);
      },
      onRecordDelivered(record: OutboxRecord) {
        transitions.push(`delivered:${record.id}`);
      },
      onRecordFailed(record: OutboxRecord, _error: string, disposition: OutboxFailureDisposition) {
        failures.push({ disposition, outboxId: record.id });
      },
    };

    const retryThenSuccessBus = new FailFirstBus();
    const retryWorker = new OutboxWorker(store, retryThenSuccessBus, {
      batchSize: 10,
      observer,
      nowMs: () => now.value,
    });

    await store.enqueueTx('run-1', [makeEvent('1', 'run-1', 1), makeEvent('2', 'run-1', 2)]);
    await retryWorker.tick();

    expect(transitions).toEqual(['claim:1']);
    expect(failures).toContainEqual({ disposition: 'retry', outboxId: 'outbox_1' });

    now.value = 1_001;
    await retryWorker.tick();

    expect(transitions.filter((transition) => transition === 'claim:1')).toHaveLength(3);
    expect(transitions).toContain('delivered:outbox_1');
    expect(transitions).toContain('delivered:outbox_2');

    const dlqStore = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const dlqWorker = new OutboxWorker(dlqStore, makeAlwaysFailBus(), {
      batchSize: 10,
      observer,
      nowMs: () => now.value,
    });
    await dlqStore.enqueueTx('run-dlq', [makeEvent('3', 'run-dlq', 1)]);

    for (let index = 0; index < 10; index += 1) {
      now.value = 100_000 + index * 65_000;
      await dlqWorker.tick();
    }

    expect(failures).toContainEqual({ disposition: 'dead_letter', outboxId: 'outbox_1' });
  });
});
