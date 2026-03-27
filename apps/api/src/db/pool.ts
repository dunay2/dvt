import { Pool } from 'pg';

export interface PgPoolConfig {
  connectionString: string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
}

let pool: Pool | null = null;
let poolKey: string | null = null;

export function getPgPool(input: string | PgPoolConfig): Pool {
  const config = normalizeConfig(input);
  const nextPoolKey = buildPoolKey(config);

  if (pool && poolKey === nextPoolKey) {
    return pool;
  }

  if (pool && poolKey !== nextPoolKey) {
    // Reconfigure the shared pool when DB settings change.
    void pool.end().catch(() => {
      // Ignore close failures while swapping pool config.
    });
  }

  pool = new Pool({
    connectionString: config.connectionString,
    statement_timeout: normalizeTimeoutMs(config.statementTimeoutMs),
    query_timeout: normalizeTimeoutMs(config.queryTimeoutMs),
    // Conservative defaults for local dev; tune per workload later.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  poolKey = nextPoolKey;

  return pool;
}

function normalizeConfig(input: string | PgPoolConfig): PgPoolConfig {
  if (typeof input === 'string') {
    return { connectionString: input };
  }
  return input;
}

function buildPoolKey(config: PgPoolConfig): string {
  return JSON.stringify([
    config.connectionString,
    normalizeTimeoutMs(config.statementTimeoutMs),
    normalizeTimeoutMs(config.queryTimeoutMs),
  ]);
}

function normalizeTimeoutMs(timeoutMs: number | undefined): number {
  return timeoutMs ?? 0;
}
