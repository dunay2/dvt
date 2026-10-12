import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { projectDvtPostgresTransform } from '../../src/application/services/dvtPostgresTransformProjection.js';
import { resolveDvtTerminalTransformClosure } from '../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { PostgresCanvasTransformDataSampleProbe } from '../../src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';
import { buildDvtSortFetchRowsDraft } from '../fixtures/dvtSortFetchFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

describeIfPostgres('DVT SortRel/FetchRel PostgreSQL semantics', () => {
  const databaseName = `dvt_sort_fetch_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;
  let isolatedUrl: string;

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl! });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const url = new URL(databaseUrl!);
    url.pathname = `/${databaseName}`;
    isolatedUrl = url.toString();
    client = new Client({ connectionString: isolatedUrl });
    await client.connect();
    await client.query('CREATE SCHEMA raw');
    await client.query(
      'CREATE TABLE raw.sort_fetch_rows (id bigint NOT NULL, amount bigint, grp text COLLATE "C" NOT NULL)'
    );
    await client.query(
      `INSERT INTO raw.sort_fetch_rows VALUES
        (10,20,'b'), (20,NULL,'a'), (30,10,'b'), (40,20,'a'),
        (50,5,'a'), (60,NULL,'b'), (70,20,'a'), (80,-5,'b')`
    );
  });

  afterAll(async () => {
    await client?.end();
    if (admin != null) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });

  it('returns the exact ordered page and keeps the Preview cap outside semantic Fetch', async () => {
    const draft = buildDvtSortFetchRowsDraft();
    const closure = resolveDvtTerminalTransformClosure({
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    });
    const projection = await projectDvtPostgresTransform(closure);

    const result = await client.query(projection.sql);

    expect(result.rows.map((row) => Number(row['id']))).toEqual([70, 30, 50]);
    const probe = new PostgresCanvasTransformDataSampleProbe({
      credentialResolver: { resolveCredential: async () => isolatedUrl },
      now: () => new Date('2026-09-20T00:00:00.000Z'),
    });
    const preview = await probe.previewTransformRows({
      type: 'postgres',
      credentialRef: 'postgres:sort-fetch-proof',
      sql: projection.sql,
      limit: 2,
      ...(projection.orderBy == null ? {} : { orderBy: projection.orderBy }),
    });
    expect(preview.rows.map((row) => row.values[0])).toEqual(['70', '30']);
    expect(preview.truncated).toBe(true);
  });
});
