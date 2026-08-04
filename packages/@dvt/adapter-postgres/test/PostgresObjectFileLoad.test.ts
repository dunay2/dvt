import { Client, type Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  PostgresRelationalExecutionCapability,
  type PostgresObjectFileLoadInput,
} from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const describeIfPg = process.env.DVT_PG_INTEGRATION === '1' ? describe : describe.skip;

describe('PostgresRelationalExecutionCapability object-file load', () => {
  it('replaces a staging relation atomically using parameterized rows', async () => {
    const database = createFakeDatabase(false);
    const capability = new PostgresRelationalExecutionCapability({
      pool: database.pool,
      statementTimeoutMs: 1_000,
    });

    await expect(capability.load(buildInput())).resolves.toEqual({
      rowsWritten: 2,
      publicationOutcome: 'created',
    });

    expect(database.sql()).toEqual([
      'BEGIN',
      'SET LOCAL statement_timeout = $1',
      'CREATE SCHEMA IF NOT EXISTS "staging"',
      'SELECT to_regclass($1) AS target_relation',
      'DROP TABLE IF EXISTS "staging"."orders_import"',
      'CREATE TABLE "staging"."orders_import" ("order_id" BIGINT NOT NULL, "amount" NUMERIC, "active" BOOLEAN NOT NULL)',
      'INSERT INTO "staging"."orders_import" ("order_id", "amount", "active") VALUES ($1, $2, $3), ($4, $5, $6)',
      'COMMIT',
    ]);
    expect(database.valuesFor('INSERT INTO')).toEqual(['1', '10.25', true, '2', null, false]);
  });

  it('reports replacement when the target relation already exists', async () => {
    const database = createFakeDatabase(true);
    const capability = new PostgresRelationalExecutionCapability({
      pool: database.pool,
      statementTimeoutMs: 1_000,
    });

    await expect(capability.load(buildInput())).resolves.toMatchObject({
      publicationOutcome: 'replaced',
    });
  });

  it('rolls back instead of committing when cancellation arrives between batches', async () => {
    const controller = new globalThis.AbortController();
    const database = createFakeDatabase(false, () => controller.abort(new Error('cancelled')));
    const capability = new PostgresRelationalExecutionCapability({
      pool: database.pool,
      statementTimeoutMs: 1_000,
    });
    const input = buildInput(
      Array.from({ length: 1_001 }, (_, index) => ({
        order_id: String(index + 1),
        amount: null,
        active: true,
      })),
      controller.signal
    );

    await expect(capability.load(input)).rejects.toThrow('cancelled');
    expect(database.sql()).toContain('ROLLBACK');
    expect(database.sql()).not.toContain('COMMIT');
  });

  it('does not acquire a client when already cancelled', async () => {
    const controller = new globalThis.AbortController();
    controller.abort(new Error('cancelled'));
    const database = createFakeDatabase(false);
    const capability = new PostgresRelationalExecutionCapability({
      pool: database.pool,
      statementTimeoutMs: 1_000,
    });

    await expect(capability.load(buildInput(undefined, controller.signal))).rejects.toThrow(
      'cancelled'
    );
    expect(database.connect).not.toHaveBeenCalled();
  });
});

describeIfPg('PostgresRelationalExecutionCapability object-file load integration', () => {
  it('replaces on retry without duplicating accepted rows', async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DVT_PG_URL or DATABASE_URL is required for integration tests');
    }
    const relation = `het1_load_${process.pid}_${Date.now()}`.slice(0, 63);
    const capability = new PostgresRelationalExecutionCapability({ connectionString });
    const client = new Client({ connectionString });
    await client.connect();

    try {
      await expect(capability.load({ ...buildInput(), relation })).resolves.toMatchObject({
        publicationOutcome: 'created',
        rowsWritten: 2,
      });
      await expect(
        capability.load({
          ...buildInput([{ order_id: '3', amount: '30.75', active: true }]),
          relation,
        })
      ).resolves.toMatchObject({ publicationOutcome: 'replaced', rowsWritten: 1 });

      const result = await client.query<{ order_id: string }>(
        `SELECT order_id::text FROM "staging".${quoteIdentifier(relation)} ORDER BY order_id`
      );
      expect(result.rows).toEqual([{ order_id: '3' }]);
    } finally {
      await client.query(`DROP TABLE IF EXISTS "staging".${quoteIdentifier(relation)}`);
      await client.end();
      await capability.close();
    }
  });
});

function buildInput(
  rows: PostgresObjectFileLoadInput['rows'] = [
    { order_id: '1', amount: '10.25', active: true },
    { order_id: '2', amount: null, active: false },
  ],
  signal?: globalThis.AbortSignal
): PostgresObjectFileLoadInput {
  return {
    schema: 'staging',
    relation: 'orders_import',
    columns: [
      { sourceField: 'order_id', targetColumn: 'order_id', dataType: 'bigint', nullable: false },
      { sourceField: 'amount', targetColumn: 'amount', dataType: 'numeric', nullable: true },
      { sourceField: 'active', targetColumn: 'active', dataType: 'boolean', nullable: false },
    ],
    rows,
    ...(signal === undefined ? {} : { signal }),
  };
}

function createFakeDatabase(
  targetExists: boolean,
  afterFirstInsert?: () => void
): {
  pool: Pool;
  connect: ReturnType<typeof vi.fn>;
  sql(): string[];
  valuesFor(prefix: string): unknown[] | undefined;
} {
  const calls: { text: string; values?: unknown[] }[] = [];
  let insertCount = 0;
  const query = vi.fn(async (statement: unknown, positionalValues?: unknown[]) => {
    const text =
      typeof statement === 'string'
        ? statement
        : String((statement as { text?: unknown }).text ?? '');
    const values =
      typeof statement === 'string'
        ? positionalValues
        : ((statement as { values?: unknown[] }).values ?? undefined);
    calls.push({ text, ...(values === undefined ? {} : { values }) });
    if (text.startsWith('SELECT to_regclass')) {
      return { rows: [{ target_relation: targetExists ? 'staging.orders_import' : null }] };
    }
    if (text.startsWith('INSERT INTO')) {
      insertCount += 1;
      if (insertCount === 1) {
        afterFirstInsert?.();
      }
    }
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  const connect = vi.fn(async () => client);
  const pool = { connect, end: vi.fn() } as unknown as Pool;

  return {
    pool,
    connect,
    sql: () => calls.map((call) => call.text),
    valuesFor: (prefix) => calls.find((call) => call.text.startsWith(prefix))?.values,
  };
}
