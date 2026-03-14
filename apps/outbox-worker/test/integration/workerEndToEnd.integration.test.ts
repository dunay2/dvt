/**
 * G5 E2E integration: worker delivers a real outbox record from PostgreSQL
 *
 * Proves end-to-end against a real PostgreSQL instance:
 *   migrations run → advisory lock acquired → record inserted →
 *   worker claims and delivers → `delivered_at` populated in the database
 *
 * This converts the manual local-docker canary (ED-20260312-g5-canary-local-docker)
 * into a repeatable automated test. It covers the full production composition:
 * `createOutboxWorkerRuntime` with real `PostgresStateStoreAdapter` and
 * `LoggingEventBus`, exercising the same path proven manually.
 *
 * Skips cleanly when DATABASE_URL is absent so the default test lane is
 * unaffected.
 *
 * Run with a real database:
 *   DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-outbox-worker test
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { acquirePgPool, closePgPool } from '../../src/db/pool.js';
import type { PgPoolLease } from '../../src/db/pool.js';
import { isActiveEnv, loadEnv } from '../../src/plugins/env.js';
import type { ActiveEnv } from '../../src/plugins/env.js';
import { createOutboxWorkerRuntime } from '../../src/runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

// ---------------------------------------------------------------------------
// Gate condition
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env['DATABASE_URL'];
const skipReason = DATABASE_URL
  ? false
  : 'DATABASE_URL not set — skipping worker E2E integration tests';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Isolated schema so this test does not interfere with any other outbox data.
// Migrations create the schema and tables if they do not already exist.
const TEST_SCHEMA = 'dvt_outbox_e2e';

const SILENT_LOGGER: OutboxWorkerRuntimeLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function makeEnv(connectionString: string): ActiveEnv {
  const env = loadEnv({
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: connectionString,
    DVT_PG_SCHEMA: TEST_SCHEMA,
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
    DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
    // Fast polling so the record is claimed within a few hundred milliseconds.
    DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '200',
  });
  if (!isActiveEnv(env)) throw new Error('makeEnv: expected active env');
  return env;
}

async function waitForDelivery(
  lease: PgPoolLease,
  schema: string,
  recordId: string,
  timeoutMs = 5_000
): Promise<Date | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { rows } = await lease.pool.query<{ delivered_at: Date | null }>(
      `SELECT delivered_at FROM "${schema}".outbox WHERE id = $1`,
      [recordId]
    );
    const deliveredAt = rows[0]?.delivered_at ?? null;
    if (deliveredAt !== null) return deliveredAt;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cleanup: drain all pooled connections after the suite.
// ---------------------------------------------------------------------------

test.after(async () => {
  await closePgPool();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

await test(
  'worker delivers a real outbox record end-to-end against PostgreSQL',
  { skip: skipReason },
  async () => {
    assert.ok(DATABASE_URL, 'DATABASE_URL must be set');

    const env = makeEnv(DATABASE_URL);

    // Acquire a pool lease for test-side queries (insert + verify).
    // This shares the same underlying pg.Pool as the runtime, which is safe
    // because both hold separate leases and the pool is not closed until
    // all leases are released.
    const testLease = acquirePgPool({ connectionString: DATABASE_URL });

    const recordId = randomUUID();
    const runId = `e2e-${randomUUID()}`;

    // createOutboxWorkerRuntime runs migrations before returning, so the
    // schema and outbox table are guaranteed to exist after this call.
    const runtime = await createOutboxWorkerRuntime(env, SILENT_LOGGER);

    try {
      await testLease.pool.query(
        `INSERT INTO "${TEST_SCHEMA}".outbox
           (id, run_id, shard_id, run_seq, idempotency_key, payload, created_at)
         VALUES ($1, $2, 0, 1, $3, $4::jsonb, now())`,
        [
          recordId,
          runId,
          `${runId}:TestEvent:1`,
          JSON.stringify({ eventType: 'TestEvent', e2e: true }),
        ]
      );

      const ac = new globalThis.AbortController();
      void runtime.start(ac.signal);

      const deliveredAt = await waitForDelivery(testLease, TEST_SCHEMA, recordId, 5_000);
      ac.abort();

      assert.notEqual(
        deliveredAt,
        null,
        'outbox record must be delivered within 5 s of the worker starting'
      );

      // Confirm the record was delivered on the first attempt without error.
      const { rows } = await testLease.pool.query<{
        attempts: number;
        last_error: string | null;
      }>(`SELECT attempts, last_error FROM "${TEST_SCHEMA}".outbox WHERE id = $1`, [recordId]);

      assert.equal(rows[0]?.last_error, null, 'delivered record must have no last_error');
      assert.equal(rows[0]?.attempts, 0, 'record must be delivered on the first attempt');
    } finally {
      await runtime.stop();
      await testLease.release();
    }
  }
);
