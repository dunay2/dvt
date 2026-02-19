import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPgPool(connectionString: string): Pool {
  if (pool) return pool;

  pool = new Pool({
    connectionString,
    // Conservative defaults for local dev; tune per workload later.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}
