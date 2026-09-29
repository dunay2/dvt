import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildExpressionJoinExpressionDocument } from '../fixtures/dvtExpressionJoinPreviewFixture.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPostgres = databaseUrl === undefined ? describe.skip : describe;

describeIfPostgres('Expression -> JOIN -> Expression against real PostgreSQL', () => {
  const databaseName = `dvt_expression_join_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let client: Client;
  let created = false;

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
    await client.query("INSERT INTO raw.orders VALUES ('o1', 'c1'), ('o2', NULL)");
    await client.query("INSERT INTO raw.client VALUES ('c1', 'es'), (NULL, 'pt')");
  });

  afterAll(async () => {
    await client?.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await admin?.end();
  });

  it('executes one canonical pre-JOIN derivation and one post-JOIN derivation', async () => {
    const document = buildExpressionJoinExpressionDocument();
    const before = globalThis.structuredClone(document);
    const { sql, projection } = await projectSubstraitToPostgresSql(document);

    expect(document).toEqual(before);
    expect(projection.outputs.map((output) => [output.name, output.dataType])).toEqual([
      ['order_id_norm', 'string'],
      ['client_id', 'string'],
      ['client_client_id', 'string'],
      ['country', 'string'],
      ['country_norm', 'string'],
    ]);

    const result = await client.query(sql);
    expect(result.fields.map((field) => field.name)).toEqual([
      'order_id_norm',
      'client_id',
      'client_client_id',
      'country',
      'country_norm',
    ]);
    expect(result.rows).toEqual([
      {
        order_id_norm: 'O1',
        client_id: 'c1',
        client_client_id: 'c1',
        country: 'es',
        country_norm: 'ES',
      },
    ]);
  });
});
