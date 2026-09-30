import { randomUUID } from 'node:crypto';

import type { StartRunIntent } from '@dvt/engine';
import { Client, Pool } from 'pg';
import { describe, expect, test } from 'vitest';

import { PostgresSchemaManager } from '../src/PostgresSchemaManager.js';
import { PostgresStartRunIntentStore } from '../src/PostgresStartRunIntentStore.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const NOW = '2026-09-30T00:00:00.000Z';
const INPUT = {
  intentId: 'contended-intent',
  tenantId: 'tenant-winner',
  runId: 'contended-run',
  provider: 'temporal' as const,
  createdAt: NOW,
};

type RaceOptions = {
  finish: 'COMMIT' | 'ROLLBACK';
  tenantId?: string;
  isolation?: 'repeatable read' | 'serializable';
};

async function raceCreate(options: RaceOptions): Promise<{
  outcome: { kind: 'returned'; intent: StartRunIntent } | { kind: 'rejected'; error: unknown };
  before: unknown[];
  after: unknown[];
  durable: StartRunIntent | null;
}> {
  const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('PostgreSQL integration requires an explicit URL');
  const schema = `intent_race_${randomUUID().replaceAll('-', '')}`;
  const table = `${quoteIdentifier(schema)}.start_run_intents`;
  const writer = new Client({ connectionString });
  const pool = new Pool({ connectionString, max: 1 });
  const store = new PostgresStartRunIntentStore({ pool, schema, now: () => NOW });
  let pending: Promise<unknown> | undefined;
  await writer.connect();
  try {
    await store.migrate();
    const session = await pool.connect();
    const pid = (await session.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!
      .pid;
    if (options.isolation) {
      await session.query("SELECT set_config('default_transaction_isolation', $1, false)", [
        options.isolation,
      ]);
    }
    session.release();
    await writer.query('BEGIN');
    await PostgresSchemaManager.setTenantContext(writer, INPUT.tenantId);
    await writer.query(
      `INSERT INTO ${table}
       (intent_id, tenant_id, run_id, provider, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $5)`,
      [INPUT.intentId, INPUT.tenantId, INPUT.runId, INPUT.provider, NOW]
    );
    const before = (await writer.query(`SELECT *, xmin::text, ctid::text FROM ${table}`)).rows;
    const creation = store
      .createIntent({ ...INPUT, tenantId: options.tenantId ?? INPUT.tenantId })
      .then(
        (intent) => ({ kind: 'returned' as const, intent }),
        (error: unknown) => ({ kind: 'rejected' as const, error })
      );
    pending = creation;
    // Wait for a real unique-index conflict, not a sleep intended to guess ordering.
    await expect
      .poll(
        async () => {
          const result = await writer.query<{ blocked: boolean }>(
            'SELECT pg_backend_pid() = ANY(pg_blocking_pids($1)) AS blocked',
            [pid]
          );
          return result.rows[0]?.blocked;
        },
        { timeout: 5_000, interval: 10 }
      )
      .toBe(true);
    await writer.query(options.finish);
    const outcome = await creation;
    const after = (await writer.query(`SELECT *, xmin::text, ctid::text FROM ${table}`)).rows;
    const durable = await store.getIntent(INPUT);
    return { outcome, before, after, durable };
  } finally {
    await writer.query('ROLLBACK');
    await pending;
    await store.close();
    await pool.end();
    await writer.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    await writer.end();
  }
}

describe.skipIf(process.env.DVT_PG_INTEGRATION !== '1')(
  'intent create transaction visibility',
  () => {
    test('returns the committed winner unchanged after waiting on its insert', async () => {
      const result = await raceCreate({ finish: 'COMMIT' });
      expect(result.outcome).toEqual({ kind: 'returned', intent: result.durable });
      expect(result.durable).toMatchObject({
        intentId: INPUT.intentId,
        tenantId: INPUT.tenantId,
        runId: INPUT.runId,
        status: 'PENDING',
      });
      // Also rejects a no-op UPSERT: it would create a new tuple or transaction ID.
      expect(result.after).toEqual(result.before);
    });

    test('inserts when the competing transaction rolls back', async () => {
      const result = await raceCreate({ finish: 'ROLLBACK' });
      expect(result.outcome).toEqual({ kind: 'returned', intent: result.durable });
      expect(result.durable).toMatchObject({ intentId: INPUT.intentId, status: 'PENDING' });
      expect(result.after).toHaveLength(1);
    });

    test('does not disclose a different tenant winner after a conflict wait', async () => {
      const result = await raceCreate({ finish: 'COMMIT', tenantId: 'tenant-other' });
      expect(result.outcome).toMatchObject({
        kind: 'rejected',
        error: { name: 'IntentNotFoundError' },
      });
      expect(result.after).toEqual(result.before);
    });

    test.each(['repeatable read', 'serializable'] as const)(
      'preserves %s serialization failures instead of downgrading isolation',
      async (isolation) => {
        const result = await raceCreate({ finish: 'COMMIT', isolation });
        expect(result.outcome).toMatchObject({ kind: 'rejected', error: { code: '40001' } });
        expect(result.after).toEqual(result.before);
      }
    );
  }
);
