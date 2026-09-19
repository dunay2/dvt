import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { buildDvtJoinPreviewDraft } from '../fixtures/dvtJoinPreviewFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

describeIfPostgres('DVT wrapped LEFT JOIN PostgreSQL semantics', () => {
  const databaseName = `dvt_left_wrap_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;

  async function generatedLeftSql(): Promise<string> {
    const draft = buildDvtJoinPreviewDraft(2, 'left');
    let sql = '';
    const publish: Pick<IContentAddressedArtifactStore, 'publish'>['publish'] = async (request) => {
      sql = Buffer.from(request.bytes).toString('utf8');
      return { ...request, disposition: 'created' };
    };
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `memory://left-wrap/${sha256}`,
    });
    await publisher.publish({
      scope: { tenantId: 'tenant-left', projectId: 'project-a', environmentId: 'env-a' },
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    });
    if (sql.length === 0) throw new Error('Expected the canonical PostgreSQL projection.');
    return sql.replace(/;\s*$/u, '');
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

  beforeEach(async () => {
    await client.query('DROP TABLE IF EXISTS raw.client, raw.orders');
    await client.query('CREATE TABLE raw.orders (order_id text NOT NULL, client_id text)');
    await client.query('CREATE TABLE raw.client (client_id text, country text)');
    await client.query("INSERT INTO raw.orders VALUES ('o1', 'c1'), ('o2', 'c2')");
    await client.query("INSERT INTO raw.client VALUES ('c1', 'es')");
  });

  afterAll(async () => {
    await client?.end();
    if (admin != null) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });

  it.each([
    [
      'grouping',
      (leftSql: string) => `
        SELECT client_id, COUNT(*)::integer AS row_count
        FROM (${leftSql}) AS left_join_input
        GROUP BY client_id
        ORDER BY client_id
      `,
      [
        { client_id: 'c1', row_count: 1 },
        { client_id: 'c2', row_count: 1 },
      ],
    ],
    [
      'grouped window',
      (leftSql: string) => `
        SELECT client_id,
               COUNT(*)::integer AS row_count,
               ROW_NUMBER() OVER (
                 ORDER BY COUNT(*) DESC NULLS LAST, client_id ASC NULLS LAST
               )::integer AS count_rank
        FROM (${leftSql}) AS left_join_input
        GROUP BY client_id
        ORDER BY client_id
      `,
      [
        { client_id: 'c1', row_count: 1, count_rank: 1 },
        { client_id: 'c2', row_count: 1, count_rank: 2 },
      ],
    ],
  ] as const)('retains the unmatched left row under %s', async (_label, wrap, expected) => {
    const leftSql = await generatedLeftSql();
    expect(leftSql).toContain('LEFT JOIN');

    const result = await client.query(wrap(leftSql));

    expect(result.rows).toEqual(expected);
  });
});
