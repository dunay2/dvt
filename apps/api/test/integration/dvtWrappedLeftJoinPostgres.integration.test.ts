import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { projectDvtPostgresTransform } from '../../src/application/services/dvtPostgresTransformProjection.js';
import { resolveDvtTerminalTransformClosure } from '../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { buildDvtGroupedLeftJoinDraft } from '../fixtures/dvtGroupedLeftJoinFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

describeIfPostgres('canonical wrapped LEFT JOIN PostgreSQL semantics', () => {
  const databaseName = `dvt_left_wrap_${randomUUID().replaceAll('-', '')}`;
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
    await client.query('CREATE TABLE public.orders (customer_id text, name text)');
    await client.query('CREATE TABLE public.client (order_id text, customer_id text)');
    await client.query("INSERT INTO public.orders VALUES ('1', 'c1'), ('2', 'c2')");
    await client.query("INSERT INTO public.client VALUES ('o1', '1')");
  });
  afterAll(async () => {
    await client?.end();
    if (admin != null) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });
  it.each(['aggregate', 'window'] as const)(
    'retains unmatched left rows under canonical %s',
    async (wrapper) => {
      const draft = buildDvtGroupedLeftJoinDraft(wrapper);
      const closure = resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      });
      const projection = await projectDvtPostgresTransform(closure);
      expect(projection.sql).toContain('LEFT JOIN');
      const result = await client.query(projection.sql);
      expect(
        result.rows
          .map((row) => [
            row['name'],
            Number(row['row_count']),
            ...(wrapper === 'window' ? [Number(row['count_rank'])] : []),
          ])
          .sort()
      ).toEqual(
        wrapper === 'window'
          ? [
              ['c1', 1, 1],
              ['c2', 1, 2],
            ]
          : [
              ['c1', 1],
              ['c2', 1],
            ]
      );
    }
  );
});
