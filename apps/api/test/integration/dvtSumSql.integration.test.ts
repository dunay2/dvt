import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { Client } from 'pg';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

function sumDocument(kind: 'i64' | 'fp64'): Parameters<typeof projectSubstraitToPostgresSql>[0] {
  const fixtures = JSON.parse(
    readFileSync(
      new URL(
        '../../../../packages/@dvt/postgres-projection/test/fixtures/sum-documents.json',
        import.meta.url
      ),
      'utf8'
    )
  );
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(fixtures[kind === 'i64' ? 0 : 1]);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

const url = process.env['DVT_PG_URL'];
describe.skipIf(url == null)('canonical SUM on PostgreSQL', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ connectionString: url });
    await client.connect();
  });
  afterAll(async () => {
    await client?.end();
  });
  it.each(['i64', 'fp64'] as const)(
    'returns exact %s values, NULL and physical type',
    async (kind) => {
      const document = sumDocument(kind);
      const { sql } = await projectSubstraitToPostgresSql(document);
      const sqlType = kind === 'i64' ? 'bigint' : 'double precision';
      await client.query('BEGIN');
      try {
        await client.query(`CREATE TEMP TABLE sum_items (value ${sqlType}) ON COMMIT DROP`);
        for (const values of [[], [null], [2, null, -1, 4]]) {
          await client.query('TRUNCATE pg_temp.sum_items');
          for (const value of values)
            await client.query('INSERT INTO pg_temp.sum_items VALUES ($1)', [value]);
          const result = await client.query({ text: sql, rowMode: 'array' });
          const expected = values.length < 2 ? null : kind === 'i64' ? '5' : 5;
          expect(result.rows).toEqual([[expected]]);
          expect(result.fields[0]?.dataTypeID).toBe(kind === 'i64' ? 20 : 701);
          const oracle = await client.query({
            text: `SELECT SUM(value)::${sqlType} FROM pg_temp.sum_items`,
            rowMode: 'array',
          });
          expect(result.rows).toEqual(oracle.rows);
        }
      } finally {
        await client.query('ROLLBACK');
      }
    }
  );
  it.each([
    ['i64', 'bigint', '9223372036854775807'],
    ['fp64', 'double precision', '1e308'],
  ] as const)(
    'rejects %s overflow rather than returning a widened result',
    async (kind, type, value) => {
      const { sql } = await projectSubstraitToPostgresSql(sumDocument(kind));
      await client.query('BEGIN');
      try {
        await client.query(`CREATE TEMP TABLE sum_items (value ${type}) ON COMMIT DROP`);
        await client.query('INSERT INTO pg_temp.sum_items VALUES ($1), ($1)', [value]);
        await expect(client.query(sql)).rejects.toMatchObject({ code: '22003' });
      } finally {
        await client.query('ROLLBACK');
      }
    }
  );
});
