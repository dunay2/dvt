import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import {
  buildDvtCrossPreviewDraft,
  buildDvtOuterJoinCrossPreviewDraft,
} from '../fixtures/dvtJoinPreviewFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

describeIfPostgres('DVT CROSS JOIN PostgreSQL semantics', () => {
  const databaseName = `dvt_cross_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;

  async function generatedSql(
    inputCount: 2 | 3,
    shape: 'pure' | 'outer-cross' = 'pure'
  ): Promise<string> {
    const draft =
      shape === 'outer-cross'
        ? buildDvtOuterJoinCrossPreviewDraft()
        : buildDvtCrossPreviewDraft(inputCount);
    let sql = '';
    const publish: Pick<IContentAddressedArtifactStore, 'publish'>['publish'] = async (request) => {
      sql = Buffer.from(request.bytes).toString('utf8');
      return { ...request, disposition: 'created' };
    };
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `memory://cross/${sha256}`,
    });
    await publisher.publish({
      scope: { tenantId: 'tenant-cross', projectId: 'project-a', environmentId: 'env-a' },
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    });
    if (sql.length === 0) throw new Error('Expected the canonical PostgreSQL projection.');
    return sql;
  }

  async function resetRows(): Promise<void> {
    await client.query('DROP TABLE IF EXISTS raw.order_details, raw.client, raw.orders');
    await client.query('CREATE TABLE raw.orders (order_id text, client_id text)');
    await client.query('CREATE TABLE raw.client (client_id text, country text)');
    await client.query('CREATE TABLE raw.order_details (order_id text, product text)');
    await client.query("INSERT INTO raw.orders VALUES ('o1', 'c1'), ('o2', NULL)");
    await client.query("INSERT INTO raw.client VALUES ('c1', 'es'), (NULL, 'pt'), ('c1', 'es')");
    await client.query("INSERT INTO raw.order_details VALUES ('o1', 'p1'), ('o1', NULL)");
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
    [2, 6, 1],
    [3, 12, 2],
  ] as const)(
    'executes the %s-input product with %s rows and %s explicit CROSS JOIN operators',
    async (inputCount, expectedRows, expectedCrosses) => {
      const sql = await generatedSql(inputCount);
      const result = await client.query(sql);

      expect(result.rowCount).toBe(expectedRows);
      expect(sql.match(/CROSS JOIN/g)).toHaveLength(expectedCrosses);
      expect(sql).not.toContain(' ON ');
      expect(result.rows.filter((row) => row.client_id == null)).toHaveLength(
        inputCount === 2 ? 3 : 6
      );
    }
  );

  it('does not reassociate an outer JOIN across CROSS when the right side is empty', async () => {
    const sql = await generatedSql(3, 'outer-cross');
    expect(sql).toContain('LEFT JOIN');
    expect(sql).toContain('CROSS JOIN');

    await client.query('TRUNCATE raw.order_details');
    const result = await client.query(sql);

    expect(result.rows).toEqual([]);
  });

  it.each([
    [2, 'client'],
    [3, 'order_details'],
  ] as const)(
    'returns no rows when one side of a %s-input product is empty',
    async (inputCount, table) => {
      await client.query(`TRUNCATE raw.${table}`);

      const result = await client.query(await generatedSql(inputCount));

      expect(result.rows).toEqual([]);
    }
  );
});
