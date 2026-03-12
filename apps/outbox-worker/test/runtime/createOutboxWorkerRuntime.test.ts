import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import adapterPostgres from '@dvt/adapter-postgres';
import type { RunEventPersisted } from '@dvt/engine';
import type { Pool } from 'pg';

import { closePgPool, getPgPool } from '../../src/db/pool.js';
import { isActiveEnv, loadEnv, type ActiveEnv } from '../../src/plugins/env.js';
import { createOutboxWorkerRuntime } from '../../src/runtime/createOutboxWorkerRuntime.js';
import { OutboxWorkerRuntime } from '../../src/runtime/OutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

const { PostgresStateStoreAdapter } = adapterPostgres;

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function makePendingEvent(): RunEventPersisted {
  return {
    eventId: 'evt-1',
    eventType: 'RunQueued' as const,
    runId: 'run-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-08T00:00:00.000Z',
    idempotencyKey: 'key-1',
    runSeq: 1,
    persistedAt: '2026-03-08T00:00:00.000Z',
  };
}

function loadActiveTestEnv(input: NodeJS.ProcessEnv): ActiveEnv {
  const env = loadEnv({
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    ...input,
  });
  if (!isActiveEnv(env)) {
    throw new Error('expected an active test environment');
  }
  return env;
}

await test('createOutboxWorkerRuntime closes the shared pg pool on stop', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  let adapterCloseCalls = 0;
  let migrateCalls = 0;

  const originalEnd = pool.end;
  const originalMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalClose = PostgresStateStoreAdapter.prototype.close;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.migrate = async function migrate(): Promise<void> {
    migrateCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {
    adapterCloseCalls += 1;
  };

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      }),
      makeLogger()
    );

    await runtime.stop();

    assert.equal(adapterCloseCalls, 1);
    assert.equal(endCalls, 1);
    assert.equal(migrateCalls, 0);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime stop is idempotent at the handle boundary', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  let adapterCloseCalls = 0;

  const originalEnd = pool.end;
  const originalClose = PostgresStateStoreAdapter.prototype.close;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {
    adapterCloseCalls += 1;
  };

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      }),
      makeLogger()
    );

    await runtime.stop();
    await runtime.stop();

    assert.equal(adapterCloseCalls, 1);
    assert.equal(endCalls, 1);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime runs migrations when explicitly enabled', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let migrateCalls = 0;

  const originalEnd = pool.end;
  const originalMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalClose = PostgresStateStoreAdapter.prototype.close;

  pool.end = async function end(): Promise<void> {};
  PostgresStateStoreAdapter.prototype.migrate = async function migrate(): Promise<void> {
    migrateCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {};

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
      }),
      makeLogger()
    );

    await runtime.stop();

    assert.equal(migrateCalls, 1);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime releases the shared pool lease even when stop cleanup fails', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;

  const originalEnd = pool.end;
  const originalClose = PostgresStateStoreAdapter.prototype.close;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {
    throw new Error('synthetic adapter close failure');
  };

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      }),
      makeLogger()
    );

    await assert.rejects(() => runtime.stop(), /synthetic adapter close failure/);

    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool(poolConfig), pool);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime continues cleanup when runtime stop fails', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  let adapterCloseCalls = 0;

  const originalEnd = pool.end;
  const originalClose = PostgresStateStoreAdapter.prototype.close;
  const originalRuntimeStop = OutboxWorkerRuntime.prototype.stop;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {
    adapterCloseCalls += 1;
  };
  OutboxWorkerRuntime.prototype.stop = async function stop(): Promise<void> {
    throw new Error('synthetic runtime stop failure');
  };

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      }),
      makeLogger()
    );

    await assert.rejects(() => runtime.stop(), /synthetic runtime stop failure/);

    assert.equal(adapterCloseCalls, 1);
    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool(poolConfig), pool);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    OutboxWorkerRuntime.prototype.stop = originalRuntimeStop;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime releases the shared pool lease when startup fails', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;

  const originalEnd = pool.end;
  const originalMigrate = PostgresStateStoreAdapter.prototype.migrate;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.migrate = async function migrate(): Promise<void> {
    throw new Error('synthetic migration failure');
  };

  try {
    await assert.rejects(
      () =>
        createOutboxWorkerRuntime(
          loadActiveTestEnv({
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
            DVT_OUTBOX_EVENT_BUS_MODE: 'log',
            DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
          }),
          makeLogger()
        ),
      /synthetic migration failure/
    );

    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool(poolConfig), pool);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime aborts before bootstrap starts when shutdown was already requested', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  let migrateCalls = 0;
  let abortPendingOperationsCalls = 0;

  const originalEnd = pool.end;
  const originalMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalAbortPendingOperations = PostgresStateStoreAdapter.prototype.abortPendingOperations;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.migrate = async function migrate(): Promise<void> {
    migrateCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.abortPendingOperations =
    async function abortPendingOperations(this: object): Promise<void> {
      abortPendingOperationsCalls += 1;
      await Reflect.apply(originalAbortPendingOperations, this, []);
    };

  try {
    const shutdown = new globalThis.AbortController();
    shutdown.abort();

    await assert.rejects(
      () =>
        createOutboxWorkerRuntime(
          loadActiveTestEnv({
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
            DVT_OUTBOX_EVENT_BUS_MODE: 'log',
            DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
          }),
          makeLogger(),
          { shutdownSignal: shutdown.signal }
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.name, 'AbortError');
        return true;
      }
    );

    assert.equal(migrateCalls, 0);
    assert.ok(abortPendingOperationsCalls >= 1);
    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool(poolConfig), pool);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
    PostgresStateStoreAdapter.prototype.abortPendingOperations = originalAbortPendingOperations;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime aborts startup work and releases resources when shutdown lands during migration', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  let abortPendingOperationsCalls = 0;
  let rejectMigration: ((error: unknown) => void) | null = null;
  let migrationReleased = false;

  const originalEnd = pool.end;
  const originalMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalAbortPendingOperations = PostgresStateStoreAdapter.prototype.abortPendingOperations;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.migrate = async function migrate(): Promise<void> {
    await new Promise<void>((_resolve, reject) => {
      rejectMigration = reject;
    });
  };
  PostgresStateStoreAdapter.prototype.abortPendingOperations =
    async function abortPendingOperations(this: object): Promise<void> {
      abortPendingOperationsCalls += 1;
      if (!migrationReleased) {
        migrationReleased = true;
        rejectMigration?.(new Error('synthetic migration interrupted'));
      }
      await Reflect.apply(originalAbortPendingOperations, this, []);
    };

  try {
    const shutdown = new globalThis.AbortController();
    const startup = createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
      }),
      makeLogger(),
      { shutdownSignal: shutdown.signal }
    );

    shutdown.abort();

    await assert.rejects(startup, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, 'AbortError');
      return true;
    });

    assert.ok(abortPendingOperationsCalls >= 1);
    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool(poolConfig), pool);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
    PostgresStateStoreAdapter.prototype.abortPendingOperations = originalAbortPendingOperations;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime configures the shared pool with env timeouts', async () => {
  await closePgPool();

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_PG_STATEMENT_TIMEOUT_MS: '7000',
        DVT_PG_QUERY_TIMEOUT_MS: '3000',
      }),
      makeLogger()
    );
    const pool = getPgPool({
      connectionString: 'postgresql://user:pass@localhost:5432/dvt',
      statementTimeoutMs: 7_000,
      queryTimeoutMs: 3_000,
    });
    const options = (
      pool as Pool & {
        options: { statement_timeout?: number; query_timeout?: number };
      }
    ).options;

    assert.equal(options.statement_timeout, 7_000);
    assert.equal(options.query_timeout, 3_000);

    await runtime.stop();
  } finally {
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime keeps a shared pool alive until the last runtime stops', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  const originalEnd = pool.end;
  const originalClose = PostgresStateStoreAdapter.prototype.close;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {};

  try {
    const env = loadActiveTestEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
    });
    const first = await createOutboxWorkerRuntime(env, makeLogger());
    const second = await createOutboxWorkerRuntime(env, makeLogger());

    await first.stop();
    assert.equal(endCalls, 0);

    await second.stop();
    assert.equal(endCalls, 1);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime stop prevents a post-abort retry write from opening new pg clients', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let fetchStarted = false;
  let fetchAbortCalls = 0;
  let abortPendingOperationsCalls = 0;
  let poolConnectCalls = 0;

  const originalFetch = globalThis.fetch;
  const originalConnect = pool.connect;
  const originalListPending = PostgresStateStoreAdapter.prototype.listPending;
  const originalListPendingForClaim = PostgresStateStoreAdapter.prototype.listPendingForClaim;
  const originalAbortPendingOperations = PostgresStateStoreAdapter.prototype.abortPendingOperations;

  globalThis.fetch = (async (_url, init) => {
    fetchStarted = true;
    const signal = init?.signal;

    return new Promise<globalThis.Response>((_resolve, reject) => {
      signal?.addEventListener(
        'abort',
        () => {
          fetchAbortCalls += 1;
          reject(makeAbortError());
        },
        { once: true }
      );
    });
  }) as typeof globalThis.fetch;
  pool.connect = async function connect(): Promise<never> {
    poolConnectCalls += 1;
    throw new Error('shutdown-interrupted tick should not open a new pg client');
  };
  PostgresStateStoreAdapter.prototype.listPending = async function listPending() {
    return [
      {
        id: 'outbox_1',
        createdAt: '2026-03-08T00:00:00.000Z',
        idempotencyKey: 'key-1',
        payload: makePendingEvent(),
        attempts: 0,
      },
    ];
  };
  PostgresStateStoreAdapter.prototype.listPendingForClaim = async function listPendingForClaim() {
    return [
      {
        id: 'outbox_1',
        createdAt: '2026-03-08T00:00:00.000Z',
        idempotencyKey: 'key-1',
        payload: makePendingEvent(),
        attempts: 0,
      },
    ];
  };
  PostgresStateStoreAdapter.prototype.abortPendingOperations =
    async function abortPendingOperations(this: object): Promise<void> {
      abortPendingOperationsCalls += 1;
      await Reflect.apply(originalAbortPendingOperations, this, []);
    };

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'http',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://example.test/outbox/events',
        DVT_OUTBOX_HTTP_TIMEOUT_MS: '60000',
      }),
      makeLogger()
    );

    const loop = runtime.start();
    await waitFor(() => fetchStarted);

    const startedAt = Date.now();
    await runtime.stop();
    await loop;
    const elapsedMs = Date.now() - startedAt;

    assert.equal(fetchAbortCalls, 1);
    assert.ok(abortPendingOperationsCalls >= 1);
    assert.equal(poolConnectCalls, 0);
    assert.ok(elapsedMs < 1000);
  } finally {
    globalThis.fetch = originalFetch;
    pool.connect = originalConnect;
    PostgresStateStoreAdapter.prototype.listPending = originalListPending;
    PostgresStateStoreAdapter.prototype.listPendingForClaim = originalListPendingForClaim;
    PostgresStateStoreAdapter.prototype.abortPendingOperations = originalAbortPendingOperations;
    await closePgPool();
  }
});

await test('createOutboxWorkerRuntime passes explicit shard ownership into shard-aware claims', async () => {
  await closePgPool();

  const poolConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(poolConfig);
  let endCalls = 0;
  let capturedSelection:
    | {
        shardIds?: readonly number[];
      }
    | undefined;

  const originalEnd = pool.end;
  const originalClose = PostgresStateStoreAdapter.prototype.close;
  const originalListPending = PostgresStateStoreAdapter.prototype.listPending;
  const originalListPendingForClaim = PostgresStateStoreAdapter.prototype.listPendingForClaim;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };
  PostgresStateStoreAdapter.prototype.close = async function close(): Promise<void> {};
  PostgresStateStoreAdapter.prototype.listPending = async function listPending(): Promise<never> {
    throw new Error('listPending fallback should not be used for shard-aware runtime claims');
  };
  PostgresStateStoreAdapter.prototype.listPendingForClaim = async function listPendingForClaim(
    _limit: number,
    selection?: {
      shardIds?: readonly number[];
    }
  ): Promise<[]> {
    capturedSelection = selection;
    return [];
  };

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadActiveTestEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_OUTBOX_SHARD_COUNT: '4',
        DVT_OUTBOX_OWNED_SHARD_IDS: '3,1',
      }),
      makeLogger()
    );

    const loop = runtime.start();
    await waitFor(() => capturedSelection !== undefined);
    await runtime.stop();
    await loop;

    assert.deepEqual(capturedSelection, { shardIds: [1, 3] });
    assert.equal(endCalls, 1);
  } finally {
    pool.end = originalEnd;
    PostgresStateStoreAdapter.prototype.close = originalClose;
    PostgresStateStoreAdapter.prototype.listPending = originalListPending;
    PostgresStateStoreAdapter.prototype.listPendingForClaim = originalListPendingForClaim;
    await closePgPool();
  }
});

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await sleep(10);
  }
}

function makeAbortError(): Error {
  const error = new Error('synthetic abort');
  Object.defineProperty(error, 'name', {
    value: 'AbortError',
    configurable: true,
  });
  return error;
}
