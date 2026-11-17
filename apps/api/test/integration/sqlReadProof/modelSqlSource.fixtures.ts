/** Native source fixtures supply logical views independently of canonical SQL rendering. */
import type { ModelSqlSourceContext } from '@dvt/postgres-projection';
import { resolvePostgresInputDataType, sourceFieldType } from '@dvt/postgres-projection';
import type { Client } from 'pg';

export async function createModelSqlSourceFixtures(client: Client): Promise<ModelSqlSourceContext> {
  await client.query(`
    CREATE SCHEMA physical;
    CREATE SCHEMA logical;
    CREATE TABLE physical.client (client_id text NOT NULL, country text, "Display Name" text);
    CREATE TABLE physical.orders (client_id text NOT NULL, order_id bigint NOT NULL, amount double precision);
    CREATE VIEW logical.client AS SELECT * FROM physical.client;
    CREATE VIEW logical."ClientModels" AS SELECT * FROM physical.client;
    CREATE VIEW logical.orders AS SELECT * FROM physical.orders;
    SET search_path = logical, pg_catalog;
  `);
  const catalog = await client.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    nullable: boolean;
  }>(`
    SELECT c.relname AS table_name, a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
           NOT a.attnotnull AS nullable
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'physical' AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum
  `);
  if (catalog.rows.length !== 6)
    throw new Error('Native SQL source fixture metadata is incomplete.');
  return {
    inputs: ['client', 'orders'].map((table) => ({
      nodeId: table + '-model',
      sqlName: table,
      columns: catalog.rows
        .filter((column) => column.table_name === table)
        .map((column) => ({
          id: column.column_name,
          name: column.column_name,
          type: sourceFieldType(resolvePostgresInputDataType(column.data_type), column.nullable),
        })),
      source: {
        names: ['physical', table],
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          connectionRef: {
            schemaVersion: 'connection-ref.v1' as const,
            connectionId: 'source-oracle',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/proof/physical/' + table,
        },
      },
    })),
  };
}

export const modelSqlSourceDatasets = [
  {
    name: 'empty',
    client: [] as readonly (readonly unknown[])[],
    orders: [] as readonly (readonly unknown[])[],
  },
  {
    name: 'duplicates NULL and native values',
    client: [
      ['a', 'ES', 'José'],
      ['a', 'ES', 'José'],
      ['b', null, ''],
      ['c', 'GB', null],
      ['d', 'ES', "quote'name"],
      ['e', '', ''],
    ],
    orders: [
      ['a', '1', 1.5],
      ['a', '2', null],
      ['b', '3', -0],
      ['x', '9007199254740993', 42.25],
    ],
  },
] as const;

export async function seedModelSqlSourceFixtures(
  client: Client,
  dataset: (typeof modelSqlSourceDatasets)[number]
): Promise<void> {
  await client.query('TRUNCATE physical.client, physical.orders');
  for (const row of dataset.client)
    await client.query('INSERT INTO physical.client VALUES ($1,$2,$3)', [...row]);
  for (const row of dataset.orders)
    await client.query('INSERT INTO physical.orders VALUES ($1,$2,$3)', [...row]);
}

export const modelSqlSourceCases = [
  { sql: 'SELECT * FROM client' },
  { sql: 'SELECT country FROM client WHERE country IS NOT NULL', publicationSubset: true },
  { sql: 'SELECT c.* FROM client AS c' },
  { sql: 'SELECT country AS market, client_id FROM client' },
  { sql: 'SELECT "Display Name" AS "Visible Name" FROM client' },
  {
    sql: 'SELECT "Country" FROM (SELECT country AS "Country" FROM "ClientModels") AS s',
    quotedInput: true,
  },
  { sql: "SELECT client_id FROM client WHERE country = 'ES'" },
  { sql: "SELECT client_id FROM client WHERE country = ''" },
  { sql: "SELECT client_id FROM client WHERE NOT (country = 'ES' AND country IS NOT NULL)" },
  { sql: "SELECT client_id FROM client WHERE country IS NULL OR country <> 'GB'" },
  { sql: 'SELECT client_id FROM client WHERE TRUE' },
  { sql: 'SELECT client_id FROM client WHERE FALSE' },
  ...['INNER', 'LEFT', 'RIGHT', 'FULL'].map((kind) => ({
    sql: `SELECT c.client_id AS client, o.order_id FROM client c ${kind} JOIN orders o ON c.client_id = o.client_id`,
  })),
  { sql: 'SELECT c.country, o.order_id FROM client c CROSS JOIN orders o' },
  { sql: 'SELECT a.client_id, b.country FROM client a JOIN client b ON a.client_id = b.client_id' },
  {
    sql: 'SELECT s.market FROM (SELECT country AS market FROM client WHERE country IS NOT NULL) s',
  },
  {
    sql: 'SELECT client_id FROM client ORDER BY country ASC NULLS FIRST, client_id ASC',
    ordered: true,
  },
  {
    sql: 'SELECT client_id AS country FROM client ORDER BY country DESC, client.country ASC',
    ordered: true,
  },
  {
    sql: 'SELECT order_id, amount FROM orders ORDER BY 1 DESC NULLS LAST LIMIT 3 OFFSET 0',
    ordered: true,
  },
  { sql: 'SELECT country FROM client LIMIT 0', ordered: true },
  {
    sql: 'SELECT order_id FROM orders ORDER BY order_id LIMIT 9007199254740993 OFFSET 1',
    ordered: true,
  },
  { sql: 'SELECT country FROM client LIMIT ALL OFFSET 0' },
];
