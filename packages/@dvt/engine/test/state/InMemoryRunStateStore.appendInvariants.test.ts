import { describe, expect, it } from 'vitest';

import { RunNotFoundError } from '../../src/contracts/errors.js';
import { InMemoryRunStateStore } from '../../src/state/InMemoryRunStateStore.js';

describe('InMemoryRunStateStore append invariants', () => {
  it('rejects append when run metadata does not exist', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'missing-run';

    await expect(
      store.appendAndEnqueueTx(runId, [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey: `${runId}:queued`,
          payloadVersion: 1,
        },
      ])
    ).rejects.toBeInstanceOf(RunNotFoundError);

    await expect(store.listEvents('t1', runId)).resolves.toEqual([]);
  });
});
