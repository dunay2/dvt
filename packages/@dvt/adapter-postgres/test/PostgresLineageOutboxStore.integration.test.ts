import { expect, it } from 'vitest';

import { describeIfPg, NOW, withLineageStores } from './helpers/lineageOutboxIntegrationHarness.js';
import { makePayload } from './helpers/lineageOutboxUnitSupport.js';

describeIfPg('PostgresLineageOutboxStore integration (real PostgreSQL)', () => {
  it('enforces lineage claim-timeout boundary using real Postgres state', async () => {
    const nowRef = { value: NOW };
    await withLineageStores(
      { nowA: nowRef, claimTimeoutMs: 90_000 },
      async ({ storeA, storeB }) => {
        await storeA.enqueue('run-claim-timeout', makePayload('evt-claim-timeout'));

        const firstClaim = await storeA.listPending(10);
        expect(firstClaim).toHaveLength(1);
        const claimed = firstClaim[0];
        expect(claimed?.runId).toBe('run-claim-timeout');

        nowRef.value = '2026-03-28T00:01:29.000Z';
        const beforeExpiry = await storeB.listPending(10);
        expect(beforeExpiry.find((record) => record.id === claimed?.id)).toBeUndefined();

        nowRef.value = '2026-03-28T00:01:31.000Z';
        const afterExpiry = await storeB.listPending(10);
        expect(afterExpiry.find((record) => record.id === claimed?.id)).toBeDefined();
      }
    );
  });

  it('keeps stale claimer writes fenced after timeout while a fresh worker can reclaim', async () => {
    const nowRef = { value: NOW };
    await withLineageStores(
      { nowA: nowRef, claimTimeoutMs: 60_000 },
      async ({ storeA, storeB }) => {
        await storeA.enqueue('run-stale-race', makePayload('evt-stale-race'));

        const firstClaim = await storeA.listPending(10);
        expect(firstClaim).toHaveLength(1);
        const claimed = firstClaim[0];
        expect(claimed?.runId).toBe('run-stale-race');
        if (!claimed) {
          throw new Error('expected claimed lineage outbox record');
        }

        nowRef.value = '2026-03-28T00:01:01.000Z';
        await expect(storeA.markFailed(claimed.id, 'stale worker attempt')).resolves.toBe(
          'not_found'
        );

        const reclaimed = await storeB.listPending(10);
        const reclaimedRecord = reclaimed.find((record) => record.id === claimed.id);
        expect(reclaimedRecord).toBeDefined();
        expect(reclaimedRecord?.id).toBe(claimed.id);
      }
    );
  });
});
