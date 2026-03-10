import { describe, expect, it, vi } from 'vitest';

import { NoopLogger } from '../src/contracts/ILogger.js';
import type { IOutboxStore } from '../src/contracts/IOutboxStore.js';
import { DeliveryTelemetry } from '../src/delivery/DeliveryTelemetry.js';
import type { BatchProcessingReport } from '../src/engine/BatchProcessor.js';
import { OutboxWorkerEngine } from '../src/engine/OutboxWorkerEngine.js';
import { CollectingMetrics } from '../src/testing/CollectingMetrics.js';
import { FakeClock } from '../src/testing/FakeClock.js';
import type { ClaimedOutboxRecord } from '../src/types.js';

const claimedRecord: ClaimedOutboxRecord = {
  recordId: 'rec-1',
  topic: 'workflow.run.events',
  deliveryChannel: 'internal_projection',
  sideEffectKind: 'snapshot_projection',
  payload: { runId: 'run-1' },
  headers: {},
  idempotencyKey: 'idem-1',
  partitionKey: null,
  orderingKey: null,
  createdAt: new Date('2026-03-08T00:00:00.000Z'),
  dueAt: new Date('2026-03-08T00:00:00.000Z'),
  attemptCount: 1,
  maxAttempts: 3,
  status: 'leased',
  leaseOwnerId: 'worker-a',
  leaseExpiresAt: new Date('2026-03-08T00:01:00.000Z'),
};

function createStore() {
  return {
    claimNextBatch: vi.fn<() => Promise<readonly ClaimedOutboxRecord[]>>(),
    ackDelivered: vi.fn(async () => undefined),
    ackIgnored: vi.fn(async () => undefined),
    scheduleRetry: vi.fn(async () => undefined),
    moveToDeadLetter: vi.fn(async () => undefined),
    releaseLease: vi.fn(async () => undefined),
  } satisfies IOutboxStore;
}

function createBatchProcessor() {
  return {
    process: vi.fn<(records: readonly ClaimedOutboxRecord[]) => Promise<BatchProcessingReport>>(),
  };
}

describe('OutboxWorkerEngine', () => {
  it('omits optional filters when config does not set them', async () => {
    const store = createStore();
    store.claimNextBatch.mockResolvedValue([]);
    const batchProcessor = createBatchProcessor();
    batchProcessor.process.mockResolvedValue({ claimedCount: 1, processedCount: 1 });
    const engine = new OutboxWorkerEngine(
      store,
      batchProcessor as never,
      new DeliveryTelemetry(new NoopLogger(), new CollectingMetrics()),
      new FakeClock(new Date('2026-03-08T00:00:00.000Z')),
      {
        leaseOwnerId: 'worker-a',
        batchSize: 10,
        leaseDurationMs: 1000,
      }
    );

    const report = await engine.processBatch();

    expect(report).toEqual({ claimedCount: 0, processedCount: 0 });
    expect(store.claimNextBatch).toHaveBeenCalledWith({
      now: new Date('2026-03-08T00:00:00.000Z'),
      leaseOwnerId: 'worker-a',
      batchSize: 10,
      leaseDurationMs: 1000,
    });
    expect(batchProcessor.process).not.toHaveBeenCalled();
  });

  it('forwards optional filters only when present', async () => {
    const store = createStore();
    store.claimNextBatch.mockResolvedValue([claimedRecord]);
    const batchProcessor = createBatchProcessor();
    batchProcessor.process.mockResolvedValue({ claimedCount: 1, processedCount: 1 });
    const engine = new OutboxWorkerEngine(
      store,
      batchProcessor as never,
      new DeliveryTelemetry(new NoopLogger(), new CollectingMetrics()),
      new FakeClock(new Date('2026-03-08T00:00:00.000Z')),
      {
        leaseOwnerId: 'worker-a',
        batchSize: 10,
        leaseDurationMs: 1000,
        topics: ['workflow.run.events'],
        deliveryChannels: ['internal_projection'],
        sideEffectKinds: ['snapshot_projection'],
      }
    );

    await engine.processBatch();

    expect(store.claimNextBatch).toHaveBeenCalledWith({
      now: new Date('2026-03-08T00:00:00.000Z'),
      leaseOwnerId: 'worker-a',
      batchSize: 10,
      leaseDurationMs: 1000,
      topics: ['workflow.run.events'],
      deliveryChannels: ['internal_projection'],
      sideEffectKinds: ['snapshot_projection'],
    });
    expect(batchProcessor.process).toHaveBeenCalledWith([claimedRecord]);
  });
});
