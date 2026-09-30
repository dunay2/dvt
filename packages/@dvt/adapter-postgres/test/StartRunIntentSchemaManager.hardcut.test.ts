/**
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @ownedConcern Reject incompatible intent schemas without altering their rows or catalog.
 */
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { quoteIdentifier } from '../src/sqlUtils.js';
import { StartRunIntentSchemaManager } from '../src/StartRunIntentSchemaManager.js';

const connectionString = process.env.DVT_PG_URL;
describe.runIf(process.env.DVT_PG_INTEGRATION === '1' && connectionString !== undefined)(
  'Intent schema hard cut',
  () => {
    it('fails on the old shape and preserves the complete pre-existing row and catalog', async () => {
      const pool = new Pool({ connectionString });
      const schema = `dvt_hardcut_${randomUUID().replaceAll('-', '')}`;
      const quoted = quoteIdentifier(schema);
      try {
        await pool.query(`CREATE SCHEMA ${quoted}`);
        await pool.query(
          `CREATE TABLE ${quoted}.start_run_intents (intent_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, run_id TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, engine_run_ref JSONB, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL)`
        );
        await pool.query(
          `INSERT INTO ${quoted}.start_run_intents VALUES ('old-intent', 'old-tenant', 'old-run', 'temporal', 'PENDING', NULL, '2026-01-01', '2026-01-01')`
        );
        const read = async (): Promise<{ rows: unknown[]; catalog: unknown[] }> => ({
          rows: (
            await pool.query(`SELECT row_to_json(i) AS value FROM ${quoted}.start_run_intents i`)
          ).rows,
          catalog: (
            await pool.query(
              'SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name, ordinal_position',
              [schema]
            )
          ).rows,
        });
        const before = await read();
        const manager = new StartRunIntentSchemaManager({ pool, schema });
        await expect(manager.migrate()).rejects.toThrow('START_RUN_INTENT_SCHEMA_INCOMPATIBLE');
        expect(await read()).toEqual(before);
        // A failed readiness attempt is not cached as success.
        await expect(manager.migrate()).rejects.toThrow('START_RUN_INTENT_SCHEMA_INCOMPATIBLE');
        expect(await read()).toEqual(before);
      } finally {
        await pool.query(`DROP SCHEMA IF EXISTS ${quoted} CASCADE`);
        await pool.end();
      }
    });

    it('verifies the installed supported shape without converting or rebuilding it', async () => {
      const pool = new Pool({ connectionString });
      const schema = `dvt_owned_schema_${randomUUID().replaceAll('-', '')}`;
      try {
        await new StartRunIntentSchemaManager({ pool, schema }).migrate();
        const before = (
          await pool.query(
            `SELECT * FROM ${quoteIdentifier(schema)}.schema_migrations ORDER BY version`
          )
        ).rows;
        await new StartRunIntentSchemaManager({ pool, schema }).migrate();
        expect(
          (
            await pool.query(
              `SELECT * FROM ${quoteIdentifier(schema)}.schema_migrations ORDER BY version`
            )
          ).rows
        ).toEqual(before);
      } finally {
        await pool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
        await pool.end();
      }
    });
  }
);
