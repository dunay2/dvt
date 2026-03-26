import { describe, expect, it } from 'vitest';

import { StartRunIntentSchemaManager } from '../src/StartRunIntentSchemaManager.js';

class RecordingMigrationClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public releaseCalls = 0;

  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: { exists: boolean }[]; rowCount: number }> {
    this.queries.push({ sql, params });
    return { rows: [{ exists: false }], rowCount: 0 };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

describe('StartRunIntentSchemaManager migration locking', () => {
  it('uses 64-bit md5 advisory lock keys for lock and unlock', async () => {
    const client = new RecordingMigrationClient();
    const manager = new StartRunIntentSchemaManager({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
    });

    await manager.migrate();

    const sqls = client.queries.map((query) => query.sql);
    const lockSql = sqls.find((sql) => sql.includes('pg_advisory_lock'));
    const unlockSql = sqls.find((sql) => sql.includes('pg_advisory_unlock'));

    expect(lockSql).toBeDefined();
    expect(unlockSql).toBeDefined();
    expect(lockSql).toContain('left(md5($1), 16)');
    expect(unlockSql).toContain('left(md5($1), 16)');
    expect(lockSql).not.toContain('hashtext');
    expect(unlockSql).not.toContain('hashtext');
    expect(client.releaseCalls).toBe(1);
  });
});
