import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';

import adapterPostgres from '@dvt/adapter-postgres';

import { closePgPool, getPgPool } from '../../src/db/pool.js';
import { loadEnv } from '../../src/plugins/env.js';
import { createOutboxWorkerRuntime } from '../../src/runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

const { PostgresStateStoreAdapter } = adapterPostgres as typeof import('@dvt/adapter-postgres');

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
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
      loadEnv({
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
      loadEnv({
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

await test('createOutboxWorkerRuntime configures the shared pool with env timeouts', async () => {
  await closePgPool();

  try {
    const runtime = await createOutboxWorkerRuntime(
      loadEnv({
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
    const env = loadEnv({
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
