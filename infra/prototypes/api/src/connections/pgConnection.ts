import { Pool, type PoolClient } from 'pg';
import type { AppConfig } from '../config.js';

export class PgConnection {
  private pool: Pool | null = null;

  constructor(private readonly cfg: AppConfig['pg']) {}

  getPool(): Pool {
    if (!this.pool) throw new Error('PgConnection not started');
    return this.pool;
  }

  async start(): Promise<void> {
    if (this.pool) return;
    this.pool = new Pool({
      host: this.cfg.host,
      port: this.cfg.port,
      user: this.cfg.user,
      password: this.cfg.password,
      database: this.cfg.database,
    });
    await this.pool.query('SELECT 1');
  }

  async stop(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
  }

  async withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      const res = await fn(client);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }
}
