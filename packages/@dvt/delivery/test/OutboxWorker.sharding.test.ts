import type { DeadLetterRecord, OutboxRecord } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { OutboxWorker } from '../src/application/OutboxWorker.js';
import type { IOutboxStorage } from '../src/contracts.js';
import { InMemoryOutboxStorage } from '../src/testing/InMemoryOutboxStorage.js';

import { CapturingBus, findRunIdForShard, makeEvent } from './support/outboxWorkerTestSupport.js';

describe('OutboxWorker shard-aware behavior', () => {
  it('uses shard-aware claim selection when storage supports it', async () => {
    let receivedSelection: { shardIds?: readonly number[] } | undefined;
    let receivedRetrySelection: { shardIds?: readonly number[] } | undefined;
    const storage: IOutboxStorage = {
      async enqueueTx(): Promise<void> {},
      async listPending(): Promise<OutboxRecord[]> {
        throw new Error('listPending fallback should not be used for shard-aware storage');
      },
      async listPendingForClaim(
        _limit: number,
        selection?: { shardIds?: readonly number[] }
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
      async listDeadLetter(): Promise<DeadLetterRecord[]> {
        return [];
      },
      async replayDeadLetters(): Promise<number> {
        return 0;
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
    const shard1Record = shard1Pending[0];
    if (!shard1Record) {
      throw new Error('expected pending record for shard 1');
    }
    await storage.markFailed(shard1Record.id, 'synthetic shard-1 retry');

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
