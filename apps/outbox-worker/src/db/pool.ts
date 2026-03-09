import { Pool } from 'pg';

export interface PgPoolConfig {
  connectionString: string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
}

export interface PgPoolLease {
  pool: Pool;
  release(): Promise<void>;
}

interface CachedPool {
  pool: Pool;
  leases: number;
}

const pools = new Map<string, CachedPool>();

export function getPgPool(config: PgPoolConfig): Pool {
  return getOrCreatePool(config).pool;
}

export function acquirePgPool(config: PgPoolConfig): PgPoolLease {
  const cached = getOrCreatePool(config);
  cached.leases += 1;
  let released = false;

  return {
    pool: cached.pool,
    release: async () => {
      if (released) return;
      released = true;
      await releasePgPool(config);
    },
  };
}

export async function closePgPool(config?: PgPoolConfig): Promise<void> {
  if (config) {
    const key = buildPoolKey(config);
    const cached = pools.get(key);
    if (!cached) return;
    pools.delete(key);
    await cached.pool.end();
    return;
  }

  const activePools = [...pools.values()].map(({ pool }) => pool);
  pools.clear();

  for (const pool of activePools) {
    await pool.end();
  }
}

function getOrCreatePool(config: PgPoolConfig): CachedPool {
  const key = buildPoolKey(config);
  const cached = pools.get(key);
  if (cached) return cached;

  const created: CachedPool = {
    pool: new Pool({
      connectionString: config.connectionString,
      statement_timeout: normalizeTimeoutMs(config.statementTimeoutMs),
      query_timeout: normalizeTimeoutMs(config.queryTimeoutMs),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    }),
    leases: 0,
  };
  pools.set(key, created);
  return created;
}

async function releasePgPool(config: PgPoolConfig): Promise<void> {
  const key = buildPoolKey(config);
  const cached = pools.get(key);
  if (!cached) return;

  cached.leases = Math.max(0, cached.leases - 1);
  if (cached.leases > 0) return;

  pools.delete(key);
  await cached.pool.end();
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
