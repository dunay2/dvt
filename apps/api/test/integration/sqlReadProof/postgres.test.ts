import { createRequire } from 'node:module';

import {
  projectSubstraitToPostgresSql,
  renderPostgresAst,
  rewritePostgresSqlOnce,
  simplifyPostgresSqlAst,
  type PostgresAstNode,
  type PostgresSqlSimplificationOptions,
  type PostgresSqlSimplificationStep,
} from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parsePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';
import { compositionalFixture } from '../../fixtures/dvtCompositionalSqlFixture.js';

import { createSqlReadTables, seedSqlReadDataset, sqlReadDatasets } from './fixtures.js';
import { sqlReadScenarios } from './matrix.js';
import { comparePostgresSql } from './oracle.js';

type DatabaseLease = Readonly<{ url: string; dispose(): Promise<void> }>;
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../../scripts/disposable-postgres-database.cjs'
) as { allocateDisposablePostgresDatabase(url: string, label: string): Promise<DatabaseLease> };
const adminUrl = process.env['DVT_PG_URL'];

describe.skipIf(adminUrl === undefined)('SQL presentation native PostgreSQL differential', () => {
  let lease: DatabaseLease | undefined;
  let client: Client;
  let options: PostgresSqlSimplificationOptions;

  beforeAll(async () => {
    if (adminUrl === undefined) throw new Error('DVT_PG_URL is required for the provider proof.');
    lease = await allocateDisposablePostgresDatabase(adminUrl, 'sqlread_3787');
    client = new Client({ connectionString: lease.url });
    await client.connect();
    await client.query('BEGIN; SET LOCAL search_path = pg_catalog');
    await createSqlReadTables(client);
    const catalog = await client.query<{
      table_name: string;
      column_name: string;
      type_schema: string;
      type_kind: string;
      type_name: string;
    }>(`
      SELECT c.relname AS table_name, a.attname AS column_name, tn.nspname AS type_schema,
             t.typtype AS type_kind, t.typname AS type_name
      FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_type t ON t.oid = a.atttypid
      JOIN pg_namespace tn ON tn.oid = t.typnamespace
      WHERE n.nspname = 'raw' AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum`);
    const tables = new Map<string, string[]>();
    for (const column of catalog.rows) {
      expect(column.type_schema).toBe('pg_catalog');
      expect(column.type_kind).toBe('b');
      expect(['text', 'numeric', 'int8']).toContain(column.type_name);
      const columns = tables.get(column.table_name) ?? [];
      columns.push(column.column_name);
      tables.set(column.table_name, columns);
    }
    expect(catalog.rows).toHaveLength(6);
    options = {
      resolvedColumns: [...tables].map(([table, columns]) => ({ schema: 'raw', table, columns })),
      scalarSemantics: 'pg_catalog',
    };
  });

  afterAll(async () => {
    try {
      if (client !== undefined) {
        try {
          await client.query('ROLLBACK');
        } finally {
          await client.end();
        }
      }
    } finally {
      await lease?.dispose();
    }
  });

  async function parsed(sql: string): Promise<PostgresAstNode> {
    const result = await parsePostgresTransformSqlStructure(sql);
    if (result.status !== 'valid') throw new Error(`Fixture SQL was rejected: ${sql}`);
    return result.ast;
  }

  async function prove(ast: PostgresAstNode, retained: boolean, ordered = false): Promise<void> {
    const original = globalThis.structuredClone(ast);
    const sql = await renderPostgresAst(ast);
    await client.query(`EXPLAIN ${sql}`);
    const result = simplifyPostgresSqlAst(ast, options);
    if (retained) {
      expect(result.ast).toBe(ast);
      expect(result.steps).toEqual([]);
      expect(result.retained).toBeDefined();
    } else {
      expect(result.retained).toBeUndefined();
      expect(result.steps.length).toBeGreaterThan(0);
    }
    expect(
      await comparePostgresSql(client, sql, await renderPostgresAst(result.ast), ordered)
    ).toEqual({ equivalent: true, reason: 'equal', differences: 0 });
    let current = ast;
    const trace: PostgresSqlSimplificationStep[] = [];
    for (let count = 0; count <= 256; count++) {
      const next = rewritePostgresSqlOnce(current, options);
      if (next.steps.length === 0) break;
      expect(count).toBeLessThan(256);
      expect(
        await comparePostgresSql(
          client,
          await renderPostgresAst(current),
          await renderPostgresAst(next.ast)
        )
      ).toEqual({ equivalent: true, reason: 'equal', differences: 0 });
      trace.push(...next.steps);
      current = next.ast;
    }
    expect(trace).toEqual(result.steps);
    expect(current).toEqual(result.ast);
    expect(simplifyPostgresSqlAst(result.ast, options).steps).toEqual([]);
    expect(ast).toEqual(original);
  }

  for (const dataset of sqlReadDatasets) {
    describe(dataset.name, () => {
      for (const scenario of sqlReadScenarios) {
        it(scenario.name, async () => {
          await seedSqlReadDataset(client, dataset);
          await prove(await parsed(scenario.sql), scenario.retained === true, scenario.ordered);
        });
      }
      it.each(['join', 'cross', 'set'] as const)(
        'canonical Substrait %s uses the same rules',
        async (kind) => {
          await seedSqlReadDataset(client, dataset);
          const document = compositionalFixture(kind);
          const original = globalThis.structuredClone(document);
          const projected = await projectSubstraitToPostgresSql(document);
          await prove(projected.ast, kind === 'set');
          if (kind !== 'set') {
            const result = simplifyPostgresSqlAst(projected.ast, options);
            expect((await renderPostgresAst(result.ast)).match(/SELECT/gi)).toHaveLength(1);
          }
          expect(document).toEqual(original);
        }
      );
    });
  }

  it.each([
    [
      'duplicates',
      'SELECT c.client_id FROM raw.client c',
      'SELECT DISTINCT c.client_id FROM raw.client c',
      'bag',
    ],
    [
      'filtered rows',
      'SELECT c.client_id FROM raw.client c',
      'SELECT c.client_id FROM raw.client c WHERE FALSE',
      'bag',
    ],
    [
      'label',
      'SELECT c.client_id AS id FROM raw.client c',
      'SELECT c.client_id AS wrong FROM raw.client c',
      'columns',
    ],
    [
      'type',
      'SELECT i.value FROM raw.items i',
      'SELECT i.value::text AS value FROM raw.items i',
      'columns',
    ],
    [
      'typmod',
      'SELECT c.country FROM raw.client c',
      'SELECT c.country::varchar(8) AS country FROM raw.client c',
      'columns',
    ],
    [
      'null',
      'SELECT c.country FROM raw.client c',
      "SELECT coalesce(c.country, 'NULL') AS country FROM raw.client c",
      'bag',
    ],
    [
      'outer join',
      'SELECT c.client_id FROM raw.client c LEFT JOIN raw.orders o ON c.client_id = o.client_id',
      'SELECT c.client_id FROM raw.client c JOIN raw.orders o ON c.client_id = o.client_id',
      'bag',
    ],
    [
      'ordinal value',
      'SELECT c.client_id AS id, c.country AS country FROM raw.client c',
      'SELECT c.country AS id, c.client_id AS country FROM raw.client c',
      'bag',
    ],
    [
      'order',
      'SELECT i.value FROM raw.items i ORDER BY i.value ASC NULLS LAST',
      'SELECT i.value FROM raw.items i ORDER BY i.value DESC NULLS LAST',
      'order',
    ],
  ])('oracle rejects valid wrong SQL: %s', async (_name, original, derived, reason) => {
    await seedSqlReadDataset(client, sqlReadDatasets[1]!);
    expect(await comparePostgresSql(client, original!, derived!, reason === 'order')).toMatchObject(
      { equivalent: false, reason }
    );
  });

  async function sqlState(sql: string): Promise<string> {
    await client.query('SAVEPOINT invalid_query');
    try {
      await client.query(sql);
      throw new Error('Expected PostgreSQL rejection.');
    } catch (error) {
      if (
        error === null ||
        typeof error !== 'object' ||
        !('code' in error) ||
        typeof error.code !== 'string'
      )
        throw error;
      return error.code;
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT invalid_query; RELEASE SAVEPOINT invalid_query');
    }
  }

  it.each([
    [
      'SELECT q.id FROM (SELECT c.client_id AS id, c.missing AS unused FROM raw.client c) q',
      '42703',
    ],
    ['SELECT client_id FROM raw.client c CROSS JOIN raw.orders o', '42702'],
    [
      'SELECT c.client_id FROM raw.client c, raw.orders o JOIN raw.items i ON c.client_id = o.client_id',
      '42P01',
    ],
  ])('does not repair invalid references by pruning: %s', async (sql, code) => {
    const ast = await parsed(sql);
    const result = simplifyPostgresSqlAst(ast, options);
    expect(result.ast).toBe(ast);
    expect(result.steps).toEqual([]);
    expect(result.retained).toBeDefined();
    expect(await sqlState(sql)).toBe(code);
    expect(await sqlState(await renderPostgresAst(result.ast))).toBe(code);
  });

  it('oracle propagates invalid SQL rather than counting it as a detected difference', async () => {
    await client.query('SAVEPOINT oracle_error');
    try {
      await expect(
        comparePostgresSql(client, 'SELECT 1 AS value', 'SELECT missing FROM raw.client')
      ).rejects.toMatchObject({ code: '42703' });
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT oracle_error; RELEASE SAVEPOINT oracle_error');
    }
  });

  it('oracle propagates connection failures', async () => {
    const closed = new Client({ connectionString: lease!.url });
    await closed.connect();
    await closed.end();
    await expect(comparePostgresSql(closed, 'SELECT 1', 'SELECT 1')).rejects.toThrow();
  });
});
