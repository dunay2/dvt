import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  projectDvtCrossDraftToPostgresSql,
  projectDvtJoinDraftToPostgresSql,
  projectDvtSetDraftToPostgresSql,
} from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  renameReadField,
  repeatFirstSource,
  identityFixture,
  refreshDigest,
  relationRoot,
} from '../fixtures/dvtRelationAdmissionFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

function rowsAsMultiset(rows: readonly unknown[]): string[] {
  return rows.map((row) => JSON.stringify(row)).sort();
}

describeIfPostgres('relation admission against real PostgreSQL', () => {
  const databaseName = `dvt_admission_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;
  let created = false;
  const orders = [
    ['o1', 'c1'],
    ['o2', null],
  ] as const;
  const customers = [
    ['c1', 'es'],
    [null, 'pt'],
  ] as const;

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl! });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const isolated = new URL(databaseUrl!);
    isolated.pathname = `/${databaseName}`;
    client = new Client({ connectionString: isolated.toString() });
    await client.connect();
    await client.query('CREATE SCHEMA raw');
    await client.query('CREATE TABLE raw.orders (order_id text, client_id text)');
    await client.query('CREATE TABLE raw.client (client_id text, country text)');
    await client.query('CREATE TABLE raw.customers_north (customer_id text, country text)');
    await client.query('CREATE TABLE raw.customers_south (client_key text, country text)');
    await client.query('CREATE TABLE raw.customers_west (customer_id text, region text)');
    for (const row of orders) await client.query('INSERT INTO raw.orders VALUES ($1,$2)', [...row]);
    for (const row of customers)
      await client.query('INSERT INTO raw.client VALUES ($1,$2)', [...row]);
    for (const table of ['customers_north', 'customers_south', 'customers_west']) {
      await client.query(`INSERT INTO raw.${table} VALUES ('a','es'), ('a','es'), (NULL,'pt')`);
    }
  });

  afterAll(async () => {
    await client?.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await admin?.end();
  });

  it.each([
    { kind: 'join', project: projectDvtJoinDraftToPostgresSql },
    { kind: 'cross', project: projectDvtCrossDraftToPostgresSql },
    { kind: 'mixed-cross', project: projectDvtCrossDraftToPostgresSql },
  ] as const)(
    'executes $kind with repeated occurrences, arbitrary labels and exact rows',
    async ({ kind, project }) => {
      const draft = identityFixture(kind);
      repeatFirstSource(draft);
      draft.sidecar.relations.forEach((binding, index) => {
        binding.displayName = `Role ${index}`;
      });
      const { sql } = await project(draft);
      const expected = orders.flatMap(([orderId, clientId]) =>
        customers.flatMap(([customerId, country]) =>
          orders.flatMap(([otherId, otherClientId]) => {
            if (kind !== 'cross' && (clientId == null || clientId !== customerId)) return [];
            if (kind === 'join' && orderId !== otherId) return [];
            return [
              {
                order_id: orderId,
                client_id: clientId,
                client_client_id: customerId,
                country,
                product: otherClientId,
              },
            ];
          })
        )
      );
      expect(rowsAsMultiset((await client.query(sql)).rows)).toEqual(rowsAsMultiset(expected));
    }
  );

  it.each([
    [SetRel_SetOp.UNION_ALL, 9],
    [SetRel_SetOp.UNION_DISTINCT, 2],
    [SetRel_SetOp.INTERSECTION_MULTISET, 2],
    [SetRel_SetOp.INTERSECTION_MULTISET_ALL, 3],
    [SetRel_SetOp.MINUS_PRIMARY, 0],
    [SetRel_SetOp.MINUS_PRIMARY_ALL, 0],
  ] as const)(
    'executes positional SET %s without confusing names, duplicates or NULLs',
    async (op, count) => {
      const draft = identityFixture('set');
      const root = relationRoot(draft);
      if (root.relType.case !== 'set') throw new Error('Set fixture required');
      root.relType.value.op = op;
      renameReadField(draft, 1, 0, 'client_key');
      renameReadField(draft, 2, 1, 'region');
      const { sql } = await projectDvtSetDraftToPostgresSql(draft);
      const result = await client.query(sql);
      const copies = count === 9 ? 3 : 1;
      const expected =
        count === 0
          ? []
          : Array.from({ length: copies }, () => [
              { customer_id: 'a', country: 'es' },
              ...(count === 2 ? [] : [{ customer_id: 'a', country: 'es' }]),
              { customer_id: null, country: 'pt' },
            ]).flat();
      expect(rowsAsMultiset(result.rows)).toEqual(rowsAsMultiset(expected));
      expect(result.rowCount).toBe(count);
    }
  );

  it('keeps repeated SET inputs rather than deduplicating physical sources', async () => {
    const draft = identityFixture('set');
    const root = relationRoot(draft);
    if (root.relType.case !== 'set') throw new Error('Set fixture required');
    root.relType.value.op = SetRel_SetOp.UNION_ALL;
    repeatFirstSource(draft);
    renameReadField(draft, 1, 0, 'client_key');
    refreshDigest(draft);
    const { sql } = await projectDvtSetDraftToPostgresSql(draft);
    const result = await client.query(sql);
    expect(result.rowCount).toBe(9);
    expect(result.rows.filter((row) => row.customer_id == null)).toHaveLength(3);
    expect(result.rows.filter((row) => row.customer_id === 'a')).toHaveLength(6);
  });
});
