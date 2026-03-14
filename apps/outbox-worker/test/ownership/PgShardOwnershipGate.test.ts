import assert from 'node:assert/strict';
import test from 'node:test';

import { createPgShardOwnershipGate } from '../../src/ownership/PgShardOwnershipGate.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

class RecordingOwnershipClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public readonly releaseCalls: boolean[] = [];

  constructor(
    private readonly lockOutcomes: Array<boolean | Error>,
    private readonly failAfterLockIndex: number | null = null,
    private readonly heartbeatOutcomes: Array<true | Error> = []
  ) {}

  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Array<{ acquired: boolean }>; rowCount: number }> {
    if (params === undefined) {
      this.queries.push({ sql });
    } else {
      this.queries.push({ sql, params });
    }
    const statement = sql.trim();
    if (!statement.includes('pg_try_advisory_lock')) {
      const heartbeatOutcome = this.heartbeatOutcomes.shift() ?? true;
      if (heartbeatOutcome instanceof Error) {
        throw heartbeatOutcome;
      }
      return { rows: [{ acquired: true }], rowCount: 1 };
    }

    const lockIndex =
      this.queries.filter((entry) => entry.sql.includes('pg_try_advisory_lock')).length - 1;
    if (this.failAfterLockIndex !== null && lockIndex === this.failAfterLockIndex) {
      throw new Error('synthetic lock query failure');
    }

    const outcome = this.lockOutcomes.shift() ?? true;
    if (outcome instanceof Error) {
      throw outcome;
    }

    return { rows: [{ acquired: outcome }], rowCount: 1 };
  }

  release(destroy?: boolean): void {
    this.releaseCalls.push(Boolean(destroy));
  }
}

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function createGateHarness(options: {
  shardIds?: readonly number[];
  lockOutcomes?: Array<boolean | Error>;
  failAfterLockIndex?: number | null;
  heartbeatOutcomes?: Array<true | Error>;
  heartbeatIntervalMs?: number;
}): {
  gate: ReturnType<typeof createPgShardOwnershipGate>;
  client: RecordingOwnershipClient;
  readonly acquirePoolLeaseCalls: number;
  readonly connectCalls: number;
  readonly releaseLeaseCalls: number;
} {
  const client = new RecordingOwnershipClient(
    options.lockOutcomes ?? [true],
    options.failAfterLockIndex ?? null,
    options.heartbeatOutcomes ?? []
  );
  let acquirePoolLeaseCalls = 0;
  let connectCalls = 0;
  let releaseLeaseCalls = 0;

  const gate = createPgShardOwnershipGate(
    {
      connectionString: 'postgresql://user:pass@localhost:5432/dvt',
      schema: 'dvt',
      shardIds: options.shardIds ?? [0],
      logger: makeLogger(),
    },
    {
      acquirePoolLease: () => {
        acquirePoolLeaseCalls += 1;
        return {
          pool: {
            connect: async () => {
              connectCalls += 1;
              return client;
            },
          },
          release: async () => {
            releaseLeaseCalls += 1;
          },
        };
      },
      ...(options.heartbeatIntervalMs === undefined
        ? {}
        : { heartbeatIntervalMs: options.heartbeatIntervalMs }),
    }
  );

  return {
    gate,
    client,
    get acquirePoolLeaseCalls(): number {
      return acquirePoolLeaseCalls;
    },
    get connectCalls(): number {
      return connectCalls;
    },
    get releaseLeaseCalls(): number {
      return releaseLeaseCalls;
    },
  };
}

await test('PgShardOwnershipGate acquires all configured shard locks on one dedicated session', async () => {
  const harness = createGateHarness({
    shardIds: [3, 1],
    lockOutcomes: [true, true],
  });

  const lease = await harness.gate.acquire(new globalThis.AbortController().signal);

  assert.notEqual(lease, null);
  assert.equal(harness.acquirePoolLeaseCalls, 1);
  assert.equal(harness.connectCalls, 1);
  assert.equal(harness.releaseLeaseCalls, 0);
  assert.equal(harness.client.queries.length, 2);
  assert.match(harness.client.queries[0]?.sql ?? '', /pg_try_advisory_lock/);
  assert.deepEqual(
    harness.client.queries.map((entry) => entry.params?.[0]),
    ['dvt:outbox-shard:1', 'dvt:outbox-shard:3']
  );

  await lease?.release();
  await lease?.release();

  assert.deepEqual(harness.client.releaseCalls, [true]);
  assert.equal(harness.releaseLeaseCalls, 1);
});

await test('PgShardOwnershipGate releases the session and returns null when any shard lock is unavailable', async () => {
  const harness = createGateHarness({
    shardIds: [0, 1],
    lockOutcomes: [true, false],
  });

  const lease = await harness.gate.acquire(new globalThis.AbortController().signal);

  assert.equal(lease, null);
  assert.equal(harness.acquirePoolLeaseCalls, 1);
  assert.equal(harness.connectCalls, 1);
  assert.deepEqual(harness.client.releaseCalls, [true]);
  assert.equal(harness.releaseLeaseCalls, 1);
});

await test('PgShardOwnershipGate skips acquisition when shutdown was already requested', async () => {
  const harness = createGateHarness({
    shardIds: [0],
  });
  const shutdown = new globalThis.AbortController();
  shutdown.abort();

  const lease = await harness.gate.acquire(shutdown.signal);

  assert.equal(lease, null);
  assert.equal(harness.acquirePoolLeaseCalls, 0);
  assert.equal(harness.connectCalls, 0);
  assert.equal(harness.releaseLeaseCalls, 0);
});

await test('PgShardOwnershipGate cleans up the dedicated session when lock acquisition throws', async () => {
  const harness = createGateHarness({
    shardIds: [0, 1],
    lockOutcomes: [true, true],
    failAfterLockIndex: 1,
  });

  await assert.rejects(
    () => harness.gate.acquire(new globalThis.AbortController().signal),
    /synthetic lock query failure/
  );

  assert.equal(harness.acquirePoolLeaseCalls, 1);
  assert.equal(harness.connectCalls, 1);
  assert.deepEqual(harness.client.releaseCalls, [true]);
  assert.equal(harness.releaseLeaseCalls, 1);
});

await test('PgShardOwnershipGate reports ownership loss when the dedicated session heartbeat fails', async () => {
  const harness = createGateHarness({
    shardIds: [0],
    heartbeatOutcomes: [new Error('synthetic heartbeat failure')],
    heartbeatIntervalMs: 1,
  });

  const lease = await harness.gate.acquire(new globalThis.AbortController().signal);

  assert.notEqual(lease, null);
  await assert.rejects(() => lease?.waitForLoss?.() ?? Promise.resolve(), /OUTBOX_OWNERSHIP_LOST/);
  assert.deepEqual(harness.client.releaseCalls, [true]);
  assert.equal(harness.releaseLeaseCalls, 1);
});

await test('PgShardOwnershipGate rejects empty shard id configuration', async () => {
  assert.throws(
    () =>
      createPgShardOwnershipGate({
        connectionString: 'postgresql://user:pass@localhost:5432/dvt',
        schema: 'dvt',
        shardIds: [],
        logger: makeLogger(),
      }),
    /requires at least one shard id/
  );
});

await test('PgShardOwnershipGate rejects negative shard id configuration', async () => {
  assert.throws(
    () =>
      createPgShardOwnershipGate({
        connectionString: 'postgresql://user:pass@localhost:5432/dvt',
        schema: 'dvt',
        shardIds: [-1],
        logger: makeLogger(),
      }),
    /non-negative integers/
  );
});
