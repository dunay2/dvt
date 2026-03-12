/**
 * G5.5D — PgShardOwnershipGate real PostgreSQL advisory lock exclusivity proof
 *
 * Validates that two independent PgShardOwnershipGate instances backed by a
 * real PostgreSQL session cannot simultaneously hold the advisory lock for the
 * same shard. This proves that the ownership fencing mechanism described in
 * ADR-0033 operates at the database level, not only at the in-process level.
 *
 * Requires a live PostgreSQL instance. Skips cleanly when DATABASE_URL is
 * absent so the default test lane is unaffected.
 *
 * Run with a real database:
 *   DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-outbox-worker test
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { closePgPool } from '../../src/db/pool.js';
import { createPgShardOwnershipGate } from '../../src/ownership/PgShardOwnershipGate.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

// ---------------------------------------------------------------------------
// Gate condition
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env['DATABASE_URL'];
const skipReason = DATABASE_URL
  ? false
  : 'DATABASE_URL not set — skipping PostgreSQL advisory lock integration tests';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Use a dedicated test schema string so lock scopes are isolated from any
// production or other test usage. No database tables are needed — advisory
// locks are a PostgreSQL built-in.
const TEST_SCHEMA = 'dvt_outbox_integration_test';
const TEST_SHARD_ID = 0;

// Disable heartbeat polling entirely for integration tests to avoid timer
// interference. The lock exclusivity proof does not require heartbeats.
const NO_HEARTBEAT_MS = 60_000;

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function makeGate(connectionString: string): ReturnType<typeof createPgShardOwnershipGate> {
  return createPgShardOwnershipGate(
    {
      connectionString,
      schema: TEST_SCHEMA,
      shardIds: [TEST_SHARD_ID],
      logger: makeLogger(),
    },
    {
      heartbeatIntervalMs: NO_HEARTBEAT_MS,
    }
  );
}

// ---------------------------------------------------------------------------
// Cleanup: drain all pooled connections after the suite so that advisory locks
// held by any surviving session are released at the socket level.
// ---------------------------------------------------------------------------

test.after(async () => {
  await closePgPool();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

await test(
  'PgShardOwnershipGate: first gate acquires shard lock; second gate returns null for the same shard',
  { skip: skipReason },
  async () => {
    assert.ok(DATABASE_URL, 'DATABASE_URL must be set');

    const gate1 = makeGate(DATABASE_URL);
    const gate2 = makeGate(DATABASE_URL);
    const signal = new globalThis.AbortController().signal;

    const lease1 = await gate1.acquire(signal);
    assert.notEqual(lease1, null, 'gate1 must acquire the lock on an uncontested shard');

    try {
      const lease2 = await gate2.acquire(signal);
      assert.equal(
        lease2,
        null,
        'gate2 must return null because gate1 already holds the advisory lock for this shard'
      );
    } finally {
      await lease1?.release();
    }
  }
);

await test(
  'PgShardOwnershipGate: second gate can acquire after first gate releases',
  { skip: skipReason },
  async () => {
    assert.ok(DATABASE_URL, 'DATABASE_URL must be set');

    const gate1 = makeGate(DATABASE_URL);
    const gate2 = makeGate(DATABASE_URL);
    const signal = new globalThis.AbortController().signal;

    const lease1 = await gate1.acquire(signal);
    assert.notEqual(lease1, null, 'gate1 must acquire the lock on an uncontested shard');

    // Release gate1 — this destroys the underlying session, which releases the
    // PostgreSQL advisory lock bound to that connection.
    await lease1?.release();

    // gate2 now competes on an uncontested shard — it must succeed.
    const lease2 = await gate2.acquire(signal);
    try {
      assert.notEqual(lease2, null, 'gate2 must acquire the lock after gate1 released its session');
    } finally {
      await lease2?.release();
    }
  }
);
