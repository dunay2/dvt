import { describe, expect, it } from 'vitest';
import type { DeliveryCoordinator } from '../src/delivery/DeliveryCoordinator.js';
import { CrashWindowInjectedError } from '../src/delivery/CrashWindowInjectedError.js';
import { BatchProcessor } from '../src/engine/BatchProcessor.js';
import type { ClaimedOutboxRecord } from '../src/types.js';

interface Deferred {
  readonly promise: Promise<void>;
  resolve(): void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return {
    promise,
    resolve,
  };
}

function createClaimedRecord(recordId: string): ClaimedOutboxRecord {
  return {
    recordId,
    topic: 'workflow.run.events',
    deliveryChannel: 'internal_projection',
    sideEffectKind: 'snapshot_projection',
    payload: { runId: recordId },
    headers: {},
    idempotencyKey: `idem-${recordId}`,
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
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error('condition not reached');
}

describe('BatchProcessor', () => {
  it('limits concurrent coordinator executions to maxConcurrency', async () => {
    const releases = [createDeferred(), createDeferred(), createDeferred()];
    const started: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const coordinator = {
      execute: async (record: ClaimedOutboxRecord): Promise<void> => {
        const release = releases[started.length];
        started.push(record.recordId);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await release.promise;
        inFlight -= 1;
      },
    } as DeliveryCoordinator;

    const processor = new BatchProcessor(coordinator, 2);
    const processing = processor.process([
      createClaimedRecord('rec-1'),
      createClaimedRecord('rec-2'),
      createClaimedRecord('rec-3'),
    ]);

    await waitFor(() => started.length === 2);

    expect(started).toEqual(['rec-1', 'rec-2']);
    expect(maxInFlight).toBe(2);

    releases[0].resolve();
    await waitFor(() => started.length === 3);

    expect(started).toEqual(['rec-1', 'rec-2', 'rec-3']);
    expect(maxInFlight).toBe(2);

    releases[1].resolve();
    releases[2].resolve();

    await expect(processing).resolves.toEqual({
      claimedCount: 3,
      processedCount: 3,
    });
  });

  it('rethrows CrashWindowInjectedError without wrapping it', async () => {
    const fatal = new CrashWindowInjectedError('rec-2');
    const coordinator = {
      execute: async (record: ClaimedOutboxRecord): Promise<void> => {
        if (record.recordId === 'rec-2') {
          throw fatal;
        }
      },
    } as DeliveryCoordinator;

    const processor = new BatchProcessor(coordinator, 2);

    await expect(
      processor.process([createClaimedRecord('rec-1'), createClaimedRecord('rec-2')])
    ).rejects.toBe(fatal);
  });
});
