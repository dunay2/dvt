/** Owned concern: coordinate run recovery identities with PostgreSQL session locks. */
import type { Pool } from 'pg';

import type {
  IRunRecoveryCommandCoordinator,
  RunRecoveryCommandKey,
} from '../../application/ports/runRecoveryCommandCoordinator.js';

const LOCK_SQL = 'SELECT pg_advisory_lock(hashtextextended($1, 0))';
const UNLOCK_SQL = 'SELECT pg_advisory_unlock(hashtextextended($1, 0))';

export class PostgresRunRecoveryCommandCoordinator implements IRunRecoveryCommandCoordinator {
  public constructor(private readonly pool: Pick<Pool, 'connect'>) {}

  public async executeExclusive<T>(
    key: RunRecoveryCommandKey,
    operation: () => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    const lockKey = serializeRunRecoveryCommandKey(key);

    try {
      await client.query(LOCK_SQL, [lockKey]);
      try {
        return await operation();
      } finally {
        await client.query(UNLOCK_SQL, [lockKey]);
      }
    } finally {
      client.release();
    }
  }
}

function serializeRunRecoveryCommandKey(key: RunRecoveryCommandKey): string {
  return `run-recovery:${key.tenantId}:${key.recoveryRunId}`;
}
