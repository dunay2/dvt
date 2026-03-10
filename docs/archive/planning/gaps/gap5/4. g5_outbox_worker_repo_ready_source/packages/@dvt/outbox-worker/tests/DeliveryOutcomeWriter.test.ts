import { describe, expect, it, vi } from 'vitest';

import type { IBackoffCalculator } from '../src/contracts/IBackoffCalculator.js';
import type { IClock } from '../src/contracts/IClock.js';
import type { IOutboxStore } from '../src/contracts/IOutboxStore.js';
import { DeliveryOutcomeWriter } from '../src/delivery/DeliveryOutcomeWriter.js';
import type { ClaimedOutboxRecord } from '../src/types.js';

const now = new Date('2026-03-08T00:00:00.000Z');
const nextAttemptAt = new Date('2026-03-08T00:05:00.000Z');

const baseRecord: ClaimedOutboxRecord = {
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

function createStore(): IOutboxStore & {
  ackDelivered: ReturnType<typeof vi.fn>;
  ackIgnored: ReturnType<typeof vi.fn>;
  scheduleRetry: ReturnType<typeof vi.fn>;
  moveToDeadLetter: ReturnType<typeof vi.fn>;
  releaseLease: ReturnType<typeof vi.fn>;
} {
  return {
    claimNextBatch: vi.fn(),
    ackDelivered: vi.fn(async () => undefined),
    ackIgnored: vi.fn(async () => undefined),
    scheduleRetry: vi.fn(async () => undefined),
    moveToDeadLetter: vi.fn(async () => undefined),
    releaseLease: vi.fn(async () => undefined),
  };
}

function createClock(): IClock {
  return {
    now: () => now,
  };
}

function createBackoffCalculator(): IBackoffCalculator {
  return {
    computeNextAttempt: () => nextAttemptAt,
  };
}

describe('DeliveryOutcomeWriter', () => {
  it('omits optional receipt when ACK_DELIVERED has no receipt', async () => {
    const store = createStore();
    const writer = new DeliveryOutcomeWriter(store, createClock(), createBackoffCalculator());

    await writer.write(baseRecord, { kind: 'ACK_DELIVERED' });

    expect(store.ackDelivered).toHaveBeenCalledWith({
      recordId: 'rec-1',
      now,
      leaseOwnerId: 'worker-a',
    });
  });

  it('omits optional detail when ACK_IGNORED has no detail', async () => {
    const store = createStore();
    const writer = new DeliveryOutcomeWriter(store, createClock(), createBackoffCalculator());

    await writer.write(baseRecord, { kind: 'ACK_IGNORED', reasonCode: 'FILTERED' });

    expect(store.ackIgnored).toHaveBeenCalledWith({
      recordId: 'rec-1',
      now,
      leaseOwnerId: 'worker-a',
      reasonCode: 'FILTERED',
    });
  });

  it('omits optional detail when MOVE_TO_DLQ has no detail', async () => {
    const store = createStore();
    const writer = new DeliveryOutcomeWriter(store, createClock(), createBackoffCalculator());

    await writer.write(baseRecord, {
      kind: 'MOVE_TO_DLQ',
      source: 'RETRY_EXHAUSTED',
      reasonCode: 'HTTP_503',
    });

    expect(store.moveToDeadLetter).toHaveBeenCalledWith({
      recordId: 'rec-1',
      now,
      leaseOwnerId: 'worker-a',
      reasonCode: 'HTTP_503',
    });
  });

  it('omits optional detail when SCHEDULE_RETRY has no detail', async () => {
    const store = createStore();
    const writer = new DeliveryOutcomeWriter(store, createClock(), createBackoffCalculator());

    await writer.write(baseRecord, {
      kind: 'SCHEDULE_RETRY',
      reasonCode: 'HTTP_503',
    });

    expect(store.scheduleRetry).toHaveBeenCalledWith({
      recordId: 'rec-1',
      now,
      nextAttemptAt,
      leaseOwnerId: 'worker-a',
      reasonCode: 'HTTP_503',
    });
  });
});
