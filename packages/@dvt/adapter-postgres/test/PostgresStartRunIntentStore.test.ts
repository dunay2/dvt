import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';

import {
  IntentActiveConflictError,
  IntentDispatchConflictError,
  IntentNotFoundError,
  PostgresStartRunIntentStore,
} from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;
const FIXED_NOW = '2026-03-04T00:00:00.000Z';

const dispatchTestData = {
  provider: 'temporal' as const,
  tenantId: 't1',
  workflowId: 'wf-2',
  runId: 'r2',
  namespace: 'default',
};

describeIfPg('PostgresStartRunIntentStore integration', () => {
  const schema = `dvt_intents_it_${Date.now()}`;

  afterAll(async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) return;
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    } finally {
      await client.end();
    }
  });

  async function withStore(
    fn: (store: PostgresStartRunIntentStore) => Promise<void>
  ): Promise<void> {
    const store = new PostgresStartRunIntentStore({
      schema,
      now: () => FIXED_NOW,
    });
    try {
      await store.migrate();
      await fn(store);
    } finally {
      await store.close();
    }
  }

  test('migrate is idempotent and createIntent is idempotent by intent_id', () =>
    withStore(testMigrateAndCreateIntent));

  test('markDispatched rejects missing intent', () => withStore(testMarkDispatchedMissingIntent));

  test('markDispatched is idempotent for same engineRunRef', () =>
    withStore(testMarkDispatchedIdempotency));

  test('markDispatched throws IntentDispatchConflictError for different engineRunRef', () =>
    withStore(testMarkDispatchedConflict));

  test('listOrphaned returns only pending/dispatched older than threshold', () =>
    withStore(testListOrphaned));

  test('active unique index rejects two active intents for same tenant+run', () =>
    withStore(testActiveUniqueIndex));
});

async function testMigrateAndCreateIntent(store: PostgresStartRunIntentStore): Promise<void> {
  await store.migrate();

  const intent = {
    intentId: 'intent-1',
    tenantId: 't1',
    runId: 'r1',
    provider: 'temporal' as const,
    createdAt: '2026-03-04T00:00:00.000Z',
  };
  const first = await store.createIntent(intent);
  const second = await store.createIntent(intent);

  expect(first.intentId).toBe('intent-1');
  expect(second.intentId).toBe('intent-1');
  expect(second.status).toBe('PENDING');
}

async function testMarkDispatchedMissingIntent(store: PostgresStartRunIntentStore): Promise<void> {
  await expect(store.markDispatched('missing', dispatchTestData)).rejects.toBeInstanceOf(
    IntentNotFoundError
  );
}

async function testMarkDispatchedIdempotency(store: PostgresStartRunIntentStore): Promise<void> {
  await store.createIntent({
    intentId: 'intent-idem',
    tenantId: 't1',
    runId: 'r-idem',
    provider: 'temporal',
    createdAt: '2026-03-04T00:00:00.000Z',
  });
  await store.markDispatched('intent-idem', dispatchTestData);

  await expect(store.markDispatched('intent-idem', dispatchTestData)).resolves.toBeUndefined();
}

async function testMarkDispatchedConflict(store: PostgresStartRunIntentStore): Promise<void> {
  await store.createIntent({
    intentId: 'intent-conflict',
    tenantId: 't1',
    runId: 'r-conflict',
    provider: 'temporal',
    createdAt: '2026-03-04T00:00:00.000Z',
  });
  await store.markDispatched('intent-conflict', dispatchTestData);

  const differentRef = { ...dispatchTestData, workflowId: 'wf-different' };
  await expect(store.markDispatched('intent-conflict', differentRef)).rejects.toBeInstanceOf(
    IntentDispatchConflictError
  );
}

async function testListOrphaned(store: PostgresStartRunIntentStore): Promise<void> {
  const oldIntent = {
    tenantId: 't1',
    provider: 'temporal' as const,
    createdAt: '2026-03-04T00:00:00.000Z',
  };
  await store.createIntent({ ...oldIntent, intentId: 'intent-old-pending', runId: 'r-old-p' });

  await store.createIntent({ ...oldIntent, intentId: 'intent-old-dispatched', runId: 'r-old-d' });
  await store.markDispatched('intent-old-dispatched', {
    provider: 'temporal',
    tenantId: 't1',
    workflowId: 'wf-old-d',
    runId: 'r-old-d',
    namespace: 'default',
  });

  await store.createIntent({
    intentId: 'intent-young',
    tenantId: 't1',
    runId: 'r-young',
    provider: 'temporal',
    createdAt: '2026-03-04T00:10:00.000Z',
  });

  const orphaned = await store.listOrphaned(5 * 60_000, Date.parse('2026-03-04T00:10:00.000Z'), 20);
  const ids = orphaned.map((i) => i.intentId);
  expect(ids).toContain('intent-old-pending');
  expect(ids).toContain('intent-old-dispatched');
  expect(ids).not.toContain('intent-young');
}

async function testActiveUniqueIndex(store: PostgresStartRunIntentStore): Promise<void> {
  await store.createIntent({
    intentId: 'intent-uniq-1',
    tenantId: 't1',
    runId: 'r-uniq',
    provider: 'temporal',
    createdAt: '2026-03-04T00:00:00.000Z',
  });

  await expect(
    store.createIntent({
      intentId: 'intent-uniq-2',
      tenantId: 't1',
      runId: 'r-uniq',
      provider: 'temporal',
      createdAt: '2026-03-04T00:00:01.000Z',
    })
  ).rejects.toBeInstanceOf(IntentActiveConflictError);
}
