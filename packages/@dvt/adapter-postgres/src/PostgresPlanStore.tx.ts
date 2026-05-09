/**
 * Owned concern: provide transaction boundaries for scoped plan-store repositories.
 */
import type { Pool, PoolClient } from 'pg';

export class PostgresPlanStoreTxRunner {
  public constructor(
    private readonly pool: Pool,
    private readonly statementTimeoutMs: number
  ) {}

  public async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (this.statementTimeoutMs > 0) {
        await client.query('SET LOCAL statement_timeout = $1', [this.statementTimeoutMs]);
      }
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback failure
      }
      throw error;
    } finally {
      client.release();
    }
  }

  public async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      if (this.statementTimeoutMs > 0) {
        await client.query('SET statement_timeout = $1', [this.statementTimeoutMs]);
      }
      return await fn(client);
    } finally {
      client.release();
    }
  }
}
