import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { buildDvtSetPreviewDraft } from '../fixtures/dvtSetPreviewFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

type SetOperation = 'intersect_distinct' | 'except_distinct' | 'intersect_all' | 'except_all';

function asMultiset(rows: readonly Record<string, unknown>[]): readonly string[] {
  return rows.map((row) => JSON.stringify(row)).sort();
}

describeIfPostgres('DVT INTERSECT/EXCEPT DISTINCT PostgreSQL semantics', () => {
  const databaseName = `dvt_set_distinct_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;

  async function generatedSql(
    operation: SetOperation,
    projectFirstColumn = false
  ): Promise<string> {
    const draft = buildDvtSetPreviewDraft(undefined, operation, projectFirstColumn);
    let sql = '';
    const publish: Pick<IContentAddressedArtifactStore, 'publish'>['publish'] = async (request) => {
      sql = Buffer.from(request.bytes).toString('utf8');
      return { ...request, disposition: 'created' };
    };
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `memory://set-distinct/${sha256}`,
    });
    await publisher.publish({
      scope: { tenantId: 'tenant-set', projectId: 'project-a', environmentId: 'env-a' },
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    });
    if (sql.length === 0) throw new Error('Expected the canonical PostgreSQL projection.');
    return sql;
  }

  async function resetRows(): Promise<void> {
    await client.query(
      'DROP TABLE IF EXISTS raw.customers_north, raw.customers_south, raw.customers_west'
    );
    await client.query('CREATE TABLE raw.customers_north (customer_id text, country text)');
    await client.query('CREATE TABLE raw.customers_south (customer_id text, country text)');
    await client.query('CREATE TABLE raw.customers_west (customer_id text, country text)');
    await client.query(
      `INSERT INTO raw.customers_north VALUES
        ('a', 'x'), ('a', 'x'), ('a', 'x'), ('b', 'y'),
        ('c', 'z'), ('c', 'z'), (NULL, 'n'), (NULL, 'n')`
    );
    await client.query(
      `INSERT INTO raw.customers_south VALUES
        ('a', 'x'), ('a', 'x'), ('b', 'y'), ('b', 'y'), ('d', 'w'), (NULL, 'n')`
    );
    await client.query("INSERT INTO raw.customers_west VALUES ('b', 'y'), (NULL, 'n'), ('e', 'q')");
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

  it('executes three-input INTERSECT with duplicate elimination and NULL tuple equality', async () => {
    const sql = await generatedSql('intersect_distinct');
    const result = await client.query(sql);

    expect(sql.match(/INTERSECT/g)).toHaveLength(2);
    expect(asMultiset(result.rows)).toEqual(
      asMultiset([
        { customer_id: 'b', country: 'y' },
        { customer_id: null, country: 'n' },
      ])
    );
  });

  it('executes left-associated EXCEPT from the primary input with duplicate elimination', async () => {
    const sql = await generatedSql('except_distinct');
    const result = await client.query(sql);

    expect(sql.match(/EXCEPT/g)).toHaveLength(2);
    expect(asMultiset(result.rows)).toEqual(asMultiset([{ customer_id: 'c', country: 'z' }]));
  });

  it.each(['intersect_distinct', 'except_distinct'] as const)(
    'returns no rows for %s when the primary input is empty',
    async (operation) => {
      await client.query('TRUNCATE raw.customers_north');
      expect((await client.query(await generatedSql(operation))).rows).toEqual([]);
    }
  );

  it('projects after INTERSECT so equal keys with different tuples do not become a match', async () => {
    await client.query('TRUNCATE raw.customers_north, raw.customers_south, raw.customers_west');
    await client.query("INSERT INTO raw.customers_north VALUES ('x', 'a')");
    await client.query("INSERT INTO raw.customers_south VALUES ('x', 'b')");
    await client.query("INSERT INTO raw.customers_west VALUES ('x', 'c')");

    expect((await client.query(await generatedSql('intersect_distinct', true))).rows).toEqual([]);
  });

  it('projects after EXCEPT so tuple difference is preserved before key projection', async () => {
    await client.query('TRUNCATE raw.customers_north, raw.customers_south, raw.customers_west');
    await client.query("INSERT INTO raw.customers_north VALUES ('x', 'a')");
    await client.query("INSERT INTO raw.customers_south VALUES ('x', 'b')");

    expect(await client.query(await generatedSql('except_distinct', true))).toMatchObject({
      rows: [{ customer_id: 'x' }],
    });
  });

  it('executes three-input INTERSECT ALL with exact duplicate and NULL multiplicity', async () => {
    await client.query('TRUNCATE raw.customers_west');
    await client.query(
      `INSERT INTO raw.customers_west VALUES
        ('a', 'x'), ('a', 'x'), ('a', 'x'), ('b', 'y'), (NULL, 'n')`
    );

    const sql = await generatedSql('intersect_all');
    const result = await client.query(sql);

    expect(sql.match(/INTERSECT\s+ALL/g)).toHaveLength(2);
    expect(asMultiset(result.rows)).toEqual(
      asMultiset([
        { customer_id: 'a', country: 'x' },
        { customer_id: 'a', country: 'x' },
        { customer_id: 'b', country: 'y' },
        { customer_id: null, country: 'n' },
      ])
    );
  });

  it('executes left-associated EXCEPT ALL by subtracting every secondary multiplicity', async () => {
    const sql = await generatedSql('except_all');
    const result = await client.query(sql);

    expect(sql.match(/EXCEPT\s+ALL/g)).toHaveLength(2);
    expect(asMultiset(result.rows)).toEqual(
      asMultiset([
        { customer_id: 'a', country: 'x' },
        { customer_id: 'c', country: 'z' },
        { customer_id: 'c', country: 'z' },
      ])
    );
  });

  it('does not replace left-associated EXCEPT ALL with subtraction by a grouped secondary', async () => {
    await client.query('TRUNCATE raw.customers_north, raw.customers_south, raw.customers_west');
    await client.query(
      "INSERT INTO raw.customers_north SELECT 'q', 'v' FROM generate_series(1, 5)"
    );
    await client.query(
      "INSERT INTO raw.customers_south SELECT 'q', 'v' FROM generate_series(1, 2)"
    );
    await client.query("INSERT INTO raw.customers_west SELECT 'q', 'v' FROM generate_series(1, 2)");

    expect((await client.query(await generatedSql('except_all'))).rows).toEqual([
      { customer_id: 'q', country: 'v' },
    ]);
  });

  it.each(['intersect_all', 'except_all'] as const)(
    'returns no rows for %s when the primary input is empty',
    async (operation) => {
      await client.query('TRUNCATE raw.customers_north');
      expect((await client.query(await generatedSql(operation))).rows).toEqual([]);
    }
  );

  it('projects after INTERSECT ALL so equal keys with different tuples keep zero multiplicity', async () => {
    await client.query('TRUNCATE raw.customers_north, raw.customers_south, raw.customers_west');
    await client.query("INSERT INTO raw.customers_north VALUES ('x', 'a'), ('x', 'a')");
    await client.query("INSERT INTO raw.customers_south VALUES ('x', 'b'), ('x', 'b')");
    await client.query("INSERT INTO raw.customers_west VALUES ('x', 'c'), ('x', 'c')");

    expect((await client.query(await generatedSql('intersect_all', true))).rows).toEqual([]);
  });

  it('projects after EXCEPT ALL so tuple multiplicity is preserved before key projection', async () => {
    await client.query('TRUNCATE raw.customers_north, raw.customers_south, raw.customers_west');
    await client.query("INSERT INTO raw.customers_north VALUES ('x', 'a'), ('x', 'a'), ('x', 'b')");
    await client.query("INSERT INTO raw.customers_south VALUES ('x', 'b'), ('x', 'b')");

    expect(asMultiset((await client.query(await generatedSql('except_all', true))).rows)).toEqual(
      asMultiset([{ customer_id: 'x' }, { customer_id: 'x' }])
    );
  });
});
