import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { projectDvtPostgresTransform } from '../../src/application/services/dvtPostgresTransformProjection.js';
import { resolveDvtTerminalTransformClosure } from '../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { buildDvtSetPreviewDraft } from '../fixtures/dvtSetPreviewFixture.js';
import { buildDvtSortFetchPreviewDraft } from '../fixtures/dvtSortFetchFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeWithPostgres = databaseUrl == null ? describe.skip : describe;

describeWithPostgres('selected grouped Set rows in PostgreSQL', () => {
  const databaseName = `dvt_grouped_set_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;
  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl! });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const url = new URL(databaseUrl!);
    url.pathname = `/${databaseName}`;
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await client.query('CREATE SCHEMA raw');
    for (const region of ['north', 'south', 'west']) {
      await client.query(`CREATE TABLE raw.customers_${region} (customer_id text, country text)`);
    }
    await client.query("INSERT INTO raw.customers_north VALUES ('a','x'), ('b','y'), ('b','z')");
    await client.query("INSERT INTO raw.customers_south VALUES ('a','x'), ('c','x')");
    await client.query("INSERT INTO raw.customers_west VALUES ('d','x')");
  });
  afterAll(async () => {
    await client?.end();
    if (admin != null) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });

  it.each(['aggregate', 'window'] as const)(
    'returns exact %s rows for full and selected Sort/Fetch',
    async (wrapper) => {
      const { draft, sortRelationId, fetchRelationId } = buildDvtSortFetchPreviewDraft(
        false,
        buildDvtSetPreviewDraft(wrapper)
      );
      const closure = resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      });
      for (const relationId of [undefined, sortRelationId, fetchRelationId]) {
        const projection = await projectDvtPostgresTransform(closure, relationId);
        const { rows } = await client.query(projection.sql);
        const values = rows.map((row) => [
          row['customer_id'],
          Number(row['customer_count']),
          ...(wrapper === 'window' ? [Number(row['customer_rank'])] : []),
        ]);
        const all =
          wrapper === 'window'
            ? [
                ['d', 1, 4],
                ['c', 1, 3],
                ['b', 2, 1],
                ['a', 1, 2],
              ]
            : [
                ['d', 1],
                ['c', 1],
                ['b', 2],
                ['a', 1],
              ];
        expect(values).toEqual(relationId === sortRelationId ? all : all.slice(2));
      }
    }
  );
  it.each([
    ['intersect_distinct', 'INTERSECT'],
    ['except_distinct', 'EXCEPT'],
    ['intersect_all', 'INTERSECT ALL'],
    ['except_all', 'EXCEPT ALL'],
  ] as const)('applies %s to full tuples before selecting a field', async (operation, operator) => {
    await client.query('TRUNCATE raw.customers_north, raw.customers_south, raw.customers_west');
    await client.query(
      "INSERT INTO raw.customers_north VALUES ('a','es'), ('a','es'), ('a','pt'), (NULL,'es')"
    );
    for (const region of ['south', 'west']) {
      await client.query(
        `INSERT INTO raw.customers_${region} VALUES ('a','es'), ('a','es'), (NULL,'es')`
      );
    }
    const draft = buildDvtSetPreviewDraft(undefined, operation, true);
    const projection = await projectDvtPostgresTransform(
      resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      })
    );
    const actual = await client.query(projection.sql);
    const expected = await client.query(`SELECT customer_id FROM (
      SELECT customer_id, country FROM raw.customers_north ${operator}
      SELECT customer_id, country FROM raw.customers_south ${operator}
      SELECT customer_id, country FROM raw.customers_west) result`);
    const values = (rows: unknown[]) => rows.map((row) => JSON.stringify(row)).sort();
    expect(values(actual.rows)).toEqual(values(expected.rows));
    expect(actual.rows.length).toBeGreaterThan(0);
  });
});
