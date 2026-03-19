import type { Pool } from 'pg';
import { describe, it, expect } from 'vitest';

import { acquirePgPool, closePgPool, getPgPool } from '../../src/db/pool.js';

describe('pg pool', () => {
  it('closePgPool ends and resets the shared pool', async () => {
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

      expect(endCalls).toBe(1);
      expect(getPgPool(config)).not.toBe(pool);
    } finally {
      pool.end = originalEnd;
      await closePgPool();
    }
  });

  it('getPgPool reuses identical config and preserves timeout settings', async () => {
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

      expect(first).toBe(second);
      expect(options.statement_timeout).toBe(4_000);
      expect(options.query_timeout).toBe(2_000);
    } finally {
      await closePgPool();
    }
  });

  it('getPgPool separates caches for different connection settings', async () => {
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

      expect(first).not.toBe(differentDatabase);
      expect(first).not.toBe(differentTimeouts);
    } finally {
      await closePgPool();
    }
  });

  it('acquirePgPool keeps the shared pool alive until the last lease is released', async () => {
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
      expect(endCalls).toBe(0);

      await secondLease.release();
      expect(endCalls).toBe(1);
    } finally {
      pool.end = originalEnd;
      await closePgPool();
    }
  });

  it('acquirePgPool release is idempotent for the same lease', async () => {
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

      expect(endCalls).toBe(1);
    } finally {
      pool.end = originalEnd;
      await closePgPool();
    }
  });
});
