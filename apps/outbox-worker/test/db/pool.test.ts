import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';

import { acquirePgPool, closePgPool, getPgPool } from '../../src/db/pool.js';

await test('closePgPool ends and resets the shared pool', async () => {
  await closePgPool();

  const config = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(config);
  let endCalls = 0;
  const originalEnd = pool.end;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };

  try {
    await closePgPool();

    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool(config), pool);
  } finally {
    pool.end = originalEnd;
    await closePgPool();
  }
});

await test('getPgPool reuses identical config and preserves timeout settings', async () => {
  await closePgPool();

  const config = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
    statementTimeoutMs: 4_000,
    queryTimeoutMs: 2_000,
  };

  try {
    const first = getPgPool(config);
    const second = getPgPool({ ...config });
    const options = (
      first as Pool & {
        options: { statement_timeout?: number; query_timeout?: number };
      }
    ).options;

    assert.equal(first, second);
    assert.equal(options.statement_timeout, 4_000);
    assert.equal(options.query_timeout, 2_000);
  } finally {
    await closePgPool();
  }
});

await test('getPgPool separates caches for different connection settings', async () => {
  await closePgPool();

  const baseConfig = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
    statementTimeoutMs: 1_000,
    queryTimeoutMs: 1_000,
  };

  try {
    const first = getPgPool(baseConfig);
    const differentDatabase = getPgPool({
      ...baseConfig,
      connectionString: 'postgresql://user:pass@localhost:5432/other',
    });
    const differentTimeouts = getPgPool({
      ...baseConfig,
      queryTimeoutMs: 2_000,
    });

    assert.notEqual(first, differentDatabase);
    assert.notEqual(first, differentTimeouts);
  } finally {
    await closePgPool();
  }
});

await test('acquirePgPool keeps the shared pool alive until the last lease is released', async () => {
  await closePgPool();

  const config = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const pool = getPgPool(config);
  const firstLease = acquirePgPool(config);
  const secondLease = acquirePgPool(config);
  let endCalls = 0;
  const originalEnd = pool.end;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };

  try {
    await firstLease.release();
    assert.equal(endCalls, 0);

    await secondLease.release();
    assert.equal(endCalls, 1);
  } finally {
    pool.end = originalEnd;
    await closePgPool();
  }
});

await test('acquirePgPool release is idempotent for the same lease', async () => {
  await closePgPool();

  const config = {
    connectionString: 'postgresql://user:pass@localhost:5432/dvt',
  };
  const lease = acquirePgPool(config);
  const pool = lease.pool;
  let endCalls = 0;
  const originalEnd = pool.end;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };

  try {
    await lease.release();
    await lease.release();

    assert.equal(endCalls, 1);
  } finally {
    pool.end = originalEnd;
    await closePgPool();
  }
});
