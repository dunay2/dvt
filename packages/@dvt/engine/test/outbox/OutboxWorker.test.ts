import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { RunEventPersisted } from '../../src/contracts/runEvents.js';
import { InMemoryOutboxStorage } from '../../src/outbox/InMemoryOutboxStorage.js';
import { OutboxWorker } from '../../src/outbox/OutboxWorker.js';
import type {
  IEventBus,
  IOutboxStorage,
  OutboxFailureDisposition,
  OutboxRecord,
} from '../../src/outbox/types.js';

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

class FailFirstMarkDeliveredStorage implements IOutboxStorage {
  private failed = false;

  constructor(private readonly inner: InMemoryOutboxStorage) {}

  async enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void> {
    await this.inner.enqueueTx(runId, events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.inner.listPending(limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (!this.failed) {
      this.failed = true;
      throw new Error('synthetic ack failure');
    }
    await this.inner.markDelivered(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.inner.markFailed(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    return (await this.inner.hasPendingRetries?.(selection)) ?? false;
  }
}

describe('OutboxWorker', () => {
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
    };
    const worker = new OutboxWorker(storage, new CapturingBus(), {
      batchSize: 10,
      nowMs: () => Date.parse('2026-02-27T00:01:00.000Z'),
    });

    const result = await worker.tick();

    expect(result.oldestClaimedAgeMs).toBe(60_000);
  });

  it('uses shard-aware claim selection when storage supports it', async () => {
    let receivedSelection:
      | {
          shardIds?: readonly number[];
        }
      | undefined;
    let receivedRetrySelection:
      | {
          shardIds?: readonly number[];
        }
      | undefined;
    const storage: IOutboxStorage = {
      async enqueueTx(): Promise<void> {},
      async listPending(): Promise<OutboxRecord[]> {
        throw new Error('listPending fallback should not be used for shard-aware storage');
      },
      async listPendingForClaim(
        _limit: number,
        selection?: {
          shardIds?: readonly number[];
        }
      ): Promise<OutboxRecord[]> {
        receivedSelection = selection;
        return [];
      },
      async markDelivered(): Promise<void> {},
      async markFailed(): Promise<void> {},
      async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
        receivedRetrySelection = selection;
        return false;
      },
    };
    const worker = new OutboxWorker(storage, new CapturingBus(), {
      batchSize: 10,
      claimSelection: { shardIds: [1, 3] },
    });

    const result = await worker.tick();

    expect(receivedSelection).toEqual({ shardIds: [1, 3] });
    expect(receivedRetrySelection).toEqual({ shardIds: [1, 3] });
    expect(result).toMatchObject({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });
  });

  it('keeps retry backlog scoped to the worker-owned shards', async () => {
    const storage = new InMemoryOutboxStorage({ nowMs: () => 0, shardCount: 2 });
    const worker = new OutboxWorker(storage, new CapturingBus(), {
      batchSize: 10,
      claimSelection: { shardIds: [0] },
    });

    const shard1RunId = findRunIdForShard(1, 2);
    await storage.enqueueTx(shard1RunId, [makeEvent('shard-1', shard1RunId, 1)]);
    const shard1Pending = await storage.listPendingForClaim(10, { shardIds: [1] });
    expect(shard1Pending).toHaveLength(1);
    await storage.markFailed(shard1Pending[0]!.id, 'synthetic shard-1 retry');

    const result = await worker.tick();

    expect(result).toMatchObject({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      retryBacklogActive: false,
    });
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
    const alwaysFailBus: IEventBus = {
      publish: async () => {
        throw new Error('synthetic bus failure');
      },
    };
    const worker = new OutboxWorker(store, alwaysFailBus, {
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
      const result = await worker.tick();
      expect(result.retryBacklogActive).toBe(i < 9);
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

  it('replay clears failure state before a dead-lettered record is retried again', async () => {
    const now = { value: 0 };
    const store = new InMemoryOutboxStorage({ nowMs: () => now.value });
    const alwaysFailBus: IEventBus = {
      publish: async () => {
        throw new Error('always fail');
      },
    };

    const failingWorker = new OutboxWorker(store, alwaysFailBus, {
      batchSize: 10,
      stopOnError: false,
    });
    await store.enqueueTx('run-replay-clean', [makeEvent('replay-clean', 'run-replay-clean', 1)]);

    for (let i = 0; i < 10; i += 1) {
      now.value = i * 65_000;
      await failingWorker.tick();
    }

    const moved = await store.replayDeadLetters({ runId: 'run-replay-clean' });
    expect(moved).toBe(1);

    const [replayed] = await store.listPending(10);
    expect(replayed?.attempts).toBe(0);
    expect(replayed?.lastError).toBeUndefined();
    expect(replayed?.nextAttemptAt).toBeUndefined();
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
    const alwaysFailBus: IEventBus = {
      publish: async () => {
        throw new Error('always fail');
      },
    };
    const dlqWorker = new OutboxWorker(dlqStore, alwaysFailBus, {
      batchSize: 10,
      observer,
      nowMs: () => now.value,
    });
    await dlqStore.enqueueTx('run-dlq', [makeEvent('3', 'run-dlq', 1)]);

    for (let i = 0; i < 10; i += 1) {
      now.value = 100_000 + i * 65_000;
      await dlqWorker.tick();
    }

    expect(failures).toContainEqual({ disposition: 'dead_letter', outboxId: 'outbox_1' });
  });
});

function findRunIdForShard(targetShardId: number, shardCount: number): string {
  for (let index = 0; index < 256; index += 1) {
    const candidate = `run-shard-${targetShardId}-${index}`;
    if (resolveShardId(candidate, shardCount) === targetShardId) {
      return candidate;
    }
  }
  throw new Error(`Unable to find run id for shard ${targetShardId}`);
}

function resolveShardId(runId: string, shardCount: number): number {
  const hash = createHash('md5').update(runId, 'utf8').digest('hex').slice(0, 16);
  const shardCountBigInt = BigInt(shardCount);
  let hashValue = BigInt(`0x${hash}`);
  if (hashValue >= SIGNED_BIGINT_HIGH_BIT) {
    hashValue -= UINT64_MODULUS;
  }
  return Number(((hashValue % shardCountBigInt) + shardCountBigInt) % shardCountBigInt);
}

const SIGNED_BIGINT_HIGH_BIT = 1n << 63n;
const UINT64_MODULUS = 1n << 64n;
