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
import { describe, it, expect, afterAll } from 'vitest';

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

afterAll(async () => {
  await closePgPool();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PgShardOwnershipGate integration', () => {
  it.skipIf(Boolean(skipReason))(
    'first gate acquires shard lock; second gate returns null for the same shard',
    async () => {
      expect(DATABASE_URL).toBeTruthy();

      const gate1 = makeGate(DATABASE_URL!);
      const gate2 = makeGate(DATABASE_URL!);
      const signal = new globalThis.AbortController().signal;

      const lease1 = await gate1.acquire(signal);
      expect(lease1).not.toBe(null);

      try {
        const lease2 = await gate2.acquire(signal);
        expect(lease2).toBe(null);
      } finally {
        await lease1?.release();
      }
    }
  );

  it.skipIf(Boolean(skipReason))(
    'second gate can acquire after first gate releases',
    async () => {
      expect(DATABASE_URL).toBeTruthy();

      const gate1 = makeGate(DATABASE_URL!);
      const gate2 = makeGate(DATABASE_URL!);
      const signal = new globalThis.AbortController().signal;

      const lease1 = await gate1.acquire(signal);
      expect(lease1).not.toBe(null);

      // Release gate1 — this destroys the underlying session, which releases the
      // PostgreSQL advisory lock bound to that connection.
      await lease1?.release();

      // gate2 now competes on an uncontested shard — it must succeed.
      const lease2 = await gate2.acquire(signal);
      try {
        expect(lease2).not.toBe(null);
      } finally {
        await lease2?.release();
      }
    }
  );
});
