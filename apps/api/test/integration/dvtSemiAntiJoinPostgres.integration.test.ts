import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import {
  buildDvtJoinPreviewDraft,
  type SemiAntiPredicateScenario,
} from '../fixtures/dvtJoinPreviewFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

type SemiAntiJoinFixtureType = 'left_semi' | 'left_anti' | 'right_semi' | 'right_anti';

const LEFT_ROWS = [
  { order_id: 'Ana', client_id: 'a' },
  { order_id: 'Ana', client_id: 'a' },
  { order_id: 'Beto', client_id: 'b' },
  { order_id: 'Celia', client_id: 'c' },
  { order_id: 'Sin clave', client_id: null },
] as const;

const RIGHT_ROWS = [
  { client_id: 'a', country: 'p1' },
  { client_id: 'a', country: 'p2' },
  { client_id: 'a', country: 'p2' },
  { client_id: 'b', country: 'p3' },
  { client_id: 'd', country: 'p4' },
  { client_id: null, country: 'pn' },
  { client_id: null, country: 'pn' },
] as const;

function asMultiset(rows: readonly Record<string, unknown>[]): readonly string[] {
  return rows.map((row) => JSON.stringify(row)).sort();
}

describeIfPostgres('DVT semi/anti JOIN PostgreSQL semantics', () => {
  const databaseName = `dvt_semi_anti_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;

  async function generatedSql(
    joinType: SemiAntiJoinFixtureType,
    predicateScenario: SemiAntiPredicateScenario = 'equal'
  ): Promise<string> {
    const draft = buildDvtJoinPreviewDraft(2, joinType, predicateScenario);
    let sql = '';
    const publish: Pick<IContentAddressedArtifactStore, 'publish'>['publish'] = async (request) => {
      sql = Buffer.from(request.bytes).toString('utf8');
      return { ...request, disposition: 'created' };
    };
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `memory://semi-anti/${sha256}`,
    });
    await publisher.publish({
      scope: { tenantId: 'tenant-semi-anti', projectId: 'project-a', environmentId: 'env-a' },
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    });
    if (sql.length === 0) throw new Error('Expected the canonical PostgreSQL projection.');
    return sql;
  }

  async function resetRows(): Promise<void> {
    await client.query('DROP TABLE IF EXISTS raw.orders, raw.client');
    await client.query('CREATE TABLE raw.orders (order_id text NOT NULL, client_id text)');
    await client.query('CREATE TABLE raw.client (client_id text, country text NOT NULL)');
    await client.query(
      `INSERT INTO raw.orders (order_id, client_id) VALUES
        ('Ana', 'a'), ('Ana', 'a'), ('Beto', 'b'), ('Celia', 'c'), ('Sin clave', NULL)`
    );
    await client.query(
      `INSERT INTO raw.client (client_id, country) VALUES
        ('a', 'p1'), ('a', 'p2'), ('a', 'p2'), ('b', 'p3'),
        ('d', 'p4'), (NULL, 'pn'), (NULL, 'pn')`
    );
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl! });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const isolatedUrl = new URL(databaseUrl!);
    isolatedUrl.pathname = `/${databaseName}`;
    client = new Client({ connectionString: isolatedUrl.toString() });
    await client.connect();
    await client.query('CREATE SCHEMA raw');
  });

  beforeEach(resetRows);

  afterAll(async () => {
    await client?.end();
    if (admin != null) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });

  it.each([
    ['left_semi', LEFT_ROWS.slice(0, 3)],
    ['left_anti', LEFT_ROWS.slice(3)],
    ['right_semi', RIGHT_ROWS.slice(0, 4)],
    ['right_anti', RIGHT_ROWS.slice(4)],
  ] as const)('executes %s as the exact retained-side multiset', async (joinType, expected) => {
    const result = await client.query(await generatedSql(joinType));

    expect(asMultiset(result.rows)).toEqual(asMultiset(expected));
  });

  it.each([
    ['left_semi', 'client', []],
    ['left_anti', 'client', LEFT_ROWS],
    ['right_semi', 'orders', []],
    ['right_anti', 'orders', RIGHT_ROWS],
  ] as const)(
    'preserves %s semantics when the queried %s side is empty',
    async (joinType, emptyTable, expected) => {
      await client.query(`TRUNCATE raw.${emptyTable}`);

      const result = await client.query(await generatedSql(joinType));

      expect(asMultiset(result.rows)).toEqual(asMultiset(expected));
    }
  );

  it.each([
    ['left_semi', 'orders'],
    ['left_anti', 'orders'],
    ['right_semi', 'client'],
    ['right_anti', 'client'],
  ] as const)(
    'returns no rows for %s when its retained %s side is empty',
    async (joinType, table) => {
      await client.query(`TRUNCATE raw.${table}`);

      const result = await client.query(await generatedSql(joinType));

      expect(result.rows).toEqual([]);
    }
  );

  it.each([
    ['left_semi', [LEFT_ROWS[0], LEFT_ROWS[1], LEFT_ROWS[2], LEFT_ROWS[4]]],
    ['left_anti', [LEFT_ROWS[3]]],
    ['right_semi', [...RIGHT_ROWS.slice(0, 4), ...RIGHT_ROWS.slice(5)]],
    ['right_anti', [RIGHT_ROWS[4]]],
  ] as const)(
    'executes %s with an explicit NULL-equals-NULL predicate without multiplying rows',
    async (joinType, expected) => {
      const result = await client.query(await generatedSql(joinType, 'nulls_equal'));

      expect(asMultiset(result.rows)).toEqual(asMultiset(expected));
    }
  );

  it('executes a composite retained-side predicate without weakening either term', async () => {
    await client.query("UPDATE raw.client SET country = 'Beto' WHERE country = 'p3'");

    const result = await client.query(await generatedSql('left_semi', 'composite'));

    expect(asMultiset(result.rows)).toEqual(asMultiset([LEFT_ROWS[0], LEFT_ROWS[1]]));
  });

  it('preserves LEFT/RIGHT operand orientation for a non-commutative bigint predicate', async () => {
    await client.query('DROP TABLE raw.orders, raw.client');
    await client.query('CREATE TABLE raw.orders (order_id text NOT NULL, client_id bigint)');
    await client.query('CREATE TABLE raw.client (client_id bigint, country text NOT NULL)');
    await client.query("INSERT INTO raw.orders (order_id, client_id) VALUES ('l1', 1), ('l4', 4)");
    await client.query(
      "INSERT INTO raw.client (client_id, country) VALUES (2, 'r2'), (5, 'r5'), (0, 'r0')"
    );

    const result = await client.query(await generatedSql('right_semi', 'less_than'));

    expect(asMultiset(result.rows)).toEqual(
      asMultiset([
        { client_id: '2', country: 'r2' },
        { client_id: '5', country: 'r5' },
      ])
    );
  });
});
