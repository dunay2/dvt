import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPgPool(connectionString: string): Pool {
  if (pool) return pool;

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

export async function closePgPool(): Promise<void> {
  const activePool = pool;
  pool = null;
  if (!activePool) return;
  await activePool.end();
}
