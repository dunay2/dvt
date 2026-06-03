import type { DeadLetterRecord, OutboxRecord } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { OutboxWorker } from '../src/application/OutboxWorker.js';
import type { IOutboxStorage } from '../src/contracts.js';
import { InMemoryOutboxStorage } from '../src/testing/InMemoryOutboxStorage.js';

import {
  CapturingBus,
  findTenantIdForShard,
  makeEvent,
} from './support/outboxWorkerTestSupport.js';

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

    const shard1TenantId = findTenantIdForShard(1, 2);
    const shard1RunId = 'run-owned-by-shard-1-tenant';
    await storage.enqueueTx(shard1RunId, [makeEvent('shard-1', shard1RunId, 1, shard1TenantId)]);
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

  it('does not let one noisy tenant spread across all worker shards', async () => {
    const shardCount = 4;
    const noisyTenantId = findTenantIdForShard(0, shardCount);
    const quietTenantId = findTenantIdForShard(1, shardCount);
    const storage = new InMemoryOutboxStorage({ shardCount });

    for (let index = 0; index < 16; index += 1) {
      const runId = `noisy-run-${index}`;
      await storage.enqueueTx(runId, [makeEvent(`noisy-${index}`, runId, 1, noisyTenantId)]);
    }
    await storage.enqueueTx('quiet-run', [makeEvent('quiet', 'quiet-run', 1, quietTenantId)]);

    const noisyShardBatch = await storage.listPendingForClaim(100, { shardIds: [0] });
    const quietShardBatch = await storage.listPendingForClaim(100, { shardIds: [1] });
    const unrelatedShardBatch = await storage.listPendingForClaim(100, { shardIds: [2, 3] });

    expect(new Set(noisyShardBatch.map((record) => record.payload.tenantId))).toEqual(
      new Set([noisyTenantId])
    );
    expect(quietShardBatch.map((record) => record.payload.tenantId)).toEqual([quietTenantId]);
    expect(unrelatedShardBatch).toHaveLength(0);
  });

  it('keeps equal run ids from different tenants as independent ordering streams', async () => {
    const now = { value: 0 };
    const storage = new InMemoryOutboxStorage({ nowMs: () => now.value, shardCount: 2 });
    const sharedRunId = 'shared-run-id';

    await storage.enqueueTx(sharedRunId, [
      makeEvent('tenant-a-1', sharedRunId, 1, 'tenant-a'),
      makeEvent('tenant-a-2', sharedRunId, 2, 'tenant-a'),
    ]);
    await storage.enqueueTx(sharedRunId, [makeEvent('tenant-b-1', sharedRunId, 1, 'tenant-b')]);

    const [tenantAHead] = (await storage.listPending(10)).filter(
      (record) => record.payload.tenantId === 'tenant-a'
    );
    if (!tenantAHead) {
      throw new Error('expected tenant-a head record');
    }
    await storage.markFailed(tenantAHead.id, 'tenant-a backoff');

    const pendingDuringBackoff = await storage.listPending(10);

    expect(
      pendingDuringBackoff.some(
        (record) => record.payload.tenantId === 'tenant-b' && record.payload.runId === sharedRunId
      )
    ).toBe(true);
    expect(
      pendingDuringBackoff.some(
        (record) => record.payload.tenantId === 'tenant-a' && record.payload.runSeq === 2
      )
    ).toBe(false);
  });
});
