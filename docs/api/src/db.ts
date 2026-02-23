import type { Pool } from 'pg';
import type { PgConnection } from './connections/pgConnection.js';

export function getPool(conn: PgConnection): Pool {
  return conn.getPool();
}
