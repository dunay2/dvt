import { describe, expect, it } from 'vitest';
import { InMemoryOutboxStore } from '../src/testing/InMemoryOutboxStore.js';

interface InternalMutableRecord {
  status: string;
  lastReasonCode?: string;
  lastDetail?: string;
  leaseOwnerId?: string;
  leaseExpiresAt?: Date;
}

interface TransitionCase {
  readonly name: string;
  readonly expectedStatus: string;
  readonly expectedReasonCode: string;
  readonly run: (store: InMemoryOutboxStore) => Promise<void>;
}

function seedClaimedRecord(store: InMemoryOutboxStore): void {
  store.append({
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
    attemptCount: 0,
    maxAttempts: 3,
    status: 'pending',
  });
}

async function claimRecord(store: InMemoryOutboxStore): Promise<void> {
  const claimed = await store.claimNextBatch({
    now: new Date('2026-03-08T00:00:00.000Z'),
    leaseOwnerId: 'worker-a',
    batchSize: 1,
    leaseDurationMs: 1000,
  });

  expect(claimed).toHaveLength(1);
}

function getInternalRecord(store: InMemoryOutboxStore): InternalMutableRecord {
  const records = (store as unknown as { records: Map<string, InternalMutableRecord> }).records;
  const record = records.get('rec-1');
  if (record === undefined) {
    throw new Error('missing internal record rec-1');
  }

  return record;
}

const transitionCases: readonly TransitionCase[] = [
  {
    name: 'ackIgnored',
    expectedStatus: 'ignored',
    expectedReasonCode: 'ignored-by-policy',
    run: async (store: InMemoryOutboxStore): Promise<void> => {
      await store.ackIgnored({
        recordId: 'rec-1',
        now: new Date('2026-03-08T00:01:00.000Z'),
        leaseOwnerId: 'worker-a',
        reasonCode: 'ignored-by-policy',
      });
    },
  },
  {
    name: 'scheduleRetry',
    expectedStatus: 'retry_scheduled',
    expectedReasonCode: 'retryable-error',
    run: async (store: InMemoryOutboxStore): Promise<void> => {
      await store.scheduleRetry({
        recordId: 'rec-1',
        now: new Date('2026-03-08T00:01:00.000Z'),
        nextAttemptAt: new Date('2026-03-08T00:05:00.000Z'),
        leaseOwnerId: 'worker-a',
        reasonCode: 'retryable-error',
      });
    },
  },
  {
    name: 'moveToDeadLetter',
    expectedStatus: 'dead_letter',
    expectedReasonCode: 'permanent-error',
    run: async (store: InMemoryOutboxStore): Promise<void> => {
      await store.moveToDeadLetter({
        recordId: 'rec-1',
        now: new Date('2026-03-08T00:01:00.000Z'),
        leaseOwnerId: 'worker-a',
        reasonCode: 'permanent-error',
      });
    },
  },
  {
    name: 'releaseLease',
    expectedStatus: 'pending',
    expectedReasonCode: 'worker-shutdown',
    run: async (store: InMemoryOutboxStore): Promise<void> => {
      await store.releaseLease({
        recordId: 'rec-1',
        now: new Date('2026-03-08T00:01:00.000Z'),
        leaseOwnerId: 'worker-a',
        reasonCode: 'worker-shutdown',
      });
    },
  },
];

describe('InMemoryOutboxStore', () => {
  it('removes lease metadata instead of assigning undefined after ackDelivered', async () => {
    const store = new InMemoryOutboxStore();
    seedClaimedRecord(store);
    await claimRecord(store);

    await store.ackDelivered({
      recordId: 'rec-1',
      now: new Date('2026-03-08T00:01:00.000Z'),
      leaseOwnerId: 'worker-a',
    });

    const record = getInternalRecord(store);

    expect(record.status).toBe('delivered');
    expect(Object.prototype.hasOwnProperty.call(record, 'leaseOwnerId')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(record, 'leaseExpiresAt')).toBe(false);
  });

  it.each(transitionCases)(
    '$name omits lastDetail when detail is absent and clears lease metadata',
    async ({ expectedReasonCode, expectedStatus, run }): Promise<void> => {
      const store = new InMemoryOutboxStore();
      seedClaimedRecord(store);
      await claimRecord(store);

      const seededRecord = getInternalRecord(store);
      seededRecord.lastDetail = 'existing detail';

      await run(store);

      const record = getInternalRecord(store);

      expect(record.status).toBe(expectedStatus);
      expect(record.lastReasonCode).toBe(expectedReasonCode);
      expect(Object.prototype.hasOwnProperty.call(record, 'lastDetail')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(record, 'leaseOwnerId')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(record, 'leaseExpiresAt')).toBe(false);
    }
  );
});
