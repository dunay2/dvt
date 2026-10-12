import { randomUUID } from 'node:crypto';

import type { CreateIntentInput, StartRunIntentClaimResult } from '@dvt/engine';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { IntentActiveConflictError, PostgresStartRunIntentStore } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const connectionString = process.env.DVT_PG_URL;
const ref = {
  provider: 'temporal' as const,
  tenantId: 't1',
  workflowId: 'workflow',
  runId: 'run',
  namespace: 'default',
};

describe.runIf(process.env.DVT_PG_INTEGRATION === '1' && connectionString !== undefined)(
  'PostgresStartRunIntentStore integration',
  () => {
    const schema = `dvt_intents_it_${randomUUID().replaceAll('-', '')}`;
    const store = new PostgresStartRunIntentStore({ connectionString, schema });
    const admin = new Client({ connectionString });
    const input = (intentId: string): CreateIntentInput => ({
      intentId,
      tenantId: 't1',
      runId: intentId,
      provider: 'temporal' as const,
      createdAt: new Date().toISOString(),
    });
    async function claim(
      intentId: string
    ): Promise<Extract<StartRunIntentClaimResult, { kind: 'acquired' }>> {
      const result = await store.claimIntent(input(intentId));
      if (result.kind !== 'acquired') throw new Error('Expected exclusive acquisition');
      return result;
    }
    beforeAll(async () => {
      await admin.connect();
      await store.migrate();
    });
    afterAll(async () => {
      await store.close();
      await admin.query(`DROP SCHEMA ${quoteIdentifier(schema)} CASCADE`);
      await admin.end();
    });

    test('initialization is idempotent but duplicate claims do not return a receipt', async () => {
      await store.migrate();
      const owner = await claim('idempotent');
      expect(await store.claimIntent(input('idempotent'))).toEqual({
        kind: 'existing',
        intent: owner.intent,
      });
    });

    test('dispatch returns missing for a nonexistent intent', async () => {
      const owner = await claim('missing-owner');
      expect(await store.markDispatched({ ...owner.receipt, intentId: 'absent' }, ref)).toBe(
        'missing'
      );
    });

    test('repeating the same observed provider reference does not reopen a resolved intent', async () => {
      const owner = await claim('same-ref');
      await store.authorizeDispatch(owner.receipt);
      expect(await store.markDispatched(owner.receipt, ref)).toBe('applied');
      await store.markResolved(owner.receipt);
      const before = await store.getIntent(owner.receipt);
      expect(await store.markDispatched(owner.receipt, ref)).toBe('already_applied');
      expect(await store.getIntent(owner.receipt)).toEqual(before);
      expect(before?.status).toBe('RESOLVED');
    });

    test('conflicting provider references leave the intent unchanged', async () => {
      const owner = await claim('conflicting-ref');
      await store.authorizeDispatch(owner.receipt);
      await store.markDispatched(owner.receipt, ref);
      const before = await store.getIntent(owner.receipt);
      expect(await store.markDispatched(owner.receipt, { ...ref, workflowId: 'different' })).toBe(
        'conflict'
      );
      expect(await store.getIntent(owner.receipt)).toEqual(before);
    });

    test('lists only aged, active and due intents using persisted store timestamps', async () => {
      await claim('old-pending');
      const dispatched = await claim('old-dispatched');
      await store.authorizeDispatch(dispatched.receipt);
      await store.markDispatched(dispatched.receipt, ref);
      await claim('young');
      // Age only these isolated fixture rows; caller-controlled createdAt is not lease authority.
      await admin.query(
        `UPDATE ${quoteIdentifier(schema)}.start_run_intents SET updated_at = clock_timestamp() - INTERVAL '10 minutes' WHERE intent_id = ANY($1::text[])`,
        [['old-pending', 'old-dispatched']]
      );
      const ids = (await store.listOrphaned(300_000, Date.now(), 20)).map(
        (intent) => intent.intentId
      );
      expect(ids.sort()).toEqual(['old-dispatched', 'old-pending']);
      expect(await store.listOrphaned(300_000, Date.now(), 1)).toHaveLength(1);
      await store.recordReconciliation(dispatched.receipt, {
        kind: 'defer',
        reason: 'provider_missing',
      });
      expect(
        (await store.listOrphaned(0, Date.now())).map((intent) => intent.intentId)
      ).not.toContain('old-dispatched');
    });

    test('active uniqueness prevents another intent from acquiring the same tenant and run', async () => {
      await claim('unique');
      await expect(
        store.claimIntent({ ...input('another'), runId: 'unique' })
      ).rejects.toBeInstanceOf(IntentActiveConflictError);
    });
  }
);
