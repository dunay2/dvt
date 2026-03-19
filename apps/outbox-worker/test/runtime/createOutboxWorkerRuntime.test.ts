import { describe, it, expect } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';

import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type { EventEnvelope as RunEventPersisted } from '@dvt/contracts';
import type { Pool } from 'pg';

import { closePgPool, getPgPool } from '../../src/db/pool.js';
import { isActiveEnv, loadEnv, type ActiveEnv } from '../../src/plugins/env.js';
import { createOutboxWorkerRuntime } from '../../src/runtime/createOutboxWorkerRuntime.js';
import { OutboxWorkerRuntime } from '../../src/runtime/OutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

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

describe('createOutboxWorkerRuntime', () => {
  it('closes the shared pg pool on stop', async () => {
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

      expect(adapterCloseCalls).toBe(1);
      expect(endCalls).toBe(1);
      expect(migrateCalls).toBe(0);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      await closePgPool();
    }
  });

  it('stop is idempotent at the handle boundary', async () => {
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

      expect(adapterCloseCalls).toBe(1);
      expect(endCalls).toBe(1);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      await closePgPool();
    }
  });

  it('runs migrations when explicitly enabled', async () => {
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

      expect(migrateCalls).toBe(1);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      await closePgPool();
    }
  });

  it('releases the shared pool lease even when stop cleanup fails', async () => {
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

      await expect(() => runtime.stop()).rejects.toThrow(/synthetic adapter close failure/);

      expect(endCalls).toBe(1);
      expect(getPgPool(poolConfig)).not.toBe(pool);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      await closePgPool();
    }
  });

  it('continues cleanup when runtime stop fails', async () => {
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

      await expect(() => runtime.stop()).rejects.toThrow(/synthetic runtime stop failure/);

      expect(adapterCloseCalls).toBe(1);
      expect(endCalls).toBe(1);
      expect(getPgPool(poolConfig)).not.toBe(pool);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      OutboxWorkerRuntime.prototype.stop = originalRuntimeStop;
      await closePgPool();
    }
  });

  it('releases the shared pool lease when startup fails', async () => {
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
      await expect(() =>
        createOutboxWorkerRuntime(
          loadActiveTestEnv({
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
            DVT_OUTBOX_EVENT_BUS_MODE: 'log',
            DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
          }),
          makeLogger()
        )
      ).rejects.toThrow(/synthetic migration failure/);

      expect(endCalls).toBe(1);
      expect(getPgPool(poolConfig)).not.toBe(pool);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
      await closePgPool();
    }
  });

  it('aborts before bootstrap starts when shutdown was already requested', async () => {
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

      await expect(() =>
        createOutboxWorkerRuntime(
          loadActiveTestEnv({
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
            DVT_OUTBOX_EVENT_BUS_MODE: 'log',
            DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
          }),
          makeLogger(),
          { shutdownSignal: shutdown.signal }
        )
      ).rejects.toSatisfy((error: unknown) => {
        return error instanceof Error && error.name === 'AbortError';
      });

      expect(migrateCalls).toBe(0);
      expect(abortPendingOperationsCalls).toBeGreaterThanOrEqual(1);
      expect(endCalls).toBe(1);
      expect(getPgPool(poolConfig)).not.toBe(pool);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
      PostgresStateStoreAdapter.prototype.abortPendingOperations = originalAbortPendingOperations;
      await closePgPool();
    }
  });

  it('aborts startup work and releases resources when shutdown lands during migration', async () => {
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

      await expect(startup).rejects.toSatisfy((error: unknown) => {
        return error instanceof Error && error.name === 'AbortError';
      });

      expect(abortPendingOperationsCalls).toBeGreaterThanOrEqual(1);
      expect(endCalls).toBe(1);
      expect(getPgPool(poolConfig)).not.toBe(pool);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.migrate = originalMigrate;
      PostgresStateStoreAdapter.prototype.abortPendingOperations = originalAbortPendingOperations;
      await closePgPool();
    }
  });

  it('configures the shared pool with env timeouts', async () => {
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

      expect(options.statement_timeout).toBe(7_000);
      expect(options.query_timeout).toBe(3_000);

      await runtime.stop();
    } finally {
      await closePgPool();
    }
  });

  it('keeps a shared pool alive until the last runtime stops', async () => {
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
      expect(endCalls).toBe(0);

      await second.stop();
      expect(endCalls).toBe(1);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      await closePgPool();
    }
  });

  it('stop prevents a post-abort retry write from opening new pg clients', async () => {
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

      expect(fetchAbortCalls).toBe(1);
      expect(abortPendingOperationsCalls).toBeGreaterThanOrEqual(1);
      expect(poolConnectCalls).toBe(0);
      expect(elapsedMs).toBeLessThan(1000);
    } finally {
      globalThis.fetch = originalFetch;
      pool.connect = originalConnect;
      PostgresStateStoreAdapter.prototype.listPending = originalListPending;
      PostgresStateStoreAdapter.prototype.listPendingForClaim = originalListPendingForClaim;
      PostgresStateStoreAdapter.prototype.abortPendingOperations = originalAbortPendingOperations;
      await closePgPool();
    }
  });

  it('passes explicit shard ownership into shard-aware claims', async () => {
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

      expect(capturedSelection).toEqual({ shardIds: [1, 3] });
      expect(endCalls).toBe(1);
    } finally {
      pool.end = originalEnd;
      PostgresStateStoreAdapter.prototype.close = originalClose;
      PostgresStateStoreAdapter.prototype.listPending = originalListPending;
      PostgresStateStoreAdapter.prototype.listPendingForClaim = originalListPendingForClaim;
      await closePgPool();
    }
  });
});
