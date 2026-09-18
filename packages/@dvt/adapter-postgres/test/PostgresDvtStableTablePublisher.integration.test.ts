import { randomUUID } from 'node:crypto';

import { createDvtPostgresOutputSchemaDigestV1 } from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  POSTGRES_DVT_PUBLICATION_ERROR_CODE,
  PostgresDvtPublicationCapability,
  PostgresDvtPublicationRejectedError,
  type PostgresDvtStableTablePublishInput,
} from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const describeIfPg = process.env.DVT_PG_INTEGRATION === '1' ? describe : describe.skip;
const connectionString =
  process.env.DVT_PG_URL ?? process.env.DATABASE_URL ?? 'postgresql://dvt:dvt@localhost:5432/dvt';
const schema = `dvt_pub_${randomUUID().replaceAll('-', '_')}`;
const schemaDigest = createDvtPostgresOutputSchemaDigestV1({
  schemaVersion: 'dvt-postgres-output-schema.v1',
  columns: [
    {
      ordinal: 0,
      name: 'order_id',
      postgresType: 'bigint',
      nullable: true,
      defaultExpression: null,
      generatedExpression: null,
      collation: null,
    },
    {
      ordinal: 1,
      name: 'country',
      postgresType: 'text',
      nullable: true,
      defaultExpression: null,
      generatedExpression: null,
      collation: null,
    },
  ],
  constraints: [],
  indexes: [],
});

describeIfPg('PostgresDvtStableTablePublisher integration', () => {
  const client = new Client({ connectionString });

  beforeAll(async () => {
    await client.connect();
    await client.query(`CREATE SCHEMA ${quoteIdentifier(schema)}`);
  });

  afterAll(async () => {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    await client.end();
  });

  it('creates and replaces rows while preserving the table object', async () => {
    const relation = 'orders_replace';
    const capability = new PostgresDvtPublicationCapability({ connectionString });
    const first = input(relation, 'a', null, rowsSql([1, 2]));
    const second = input(relation, 'b', first.publicationToken, rowsSql([3]));

    try {
      await expect(capability.publish(first)).resolves.toMatchObject({
        publicationOutcome: 'created',
        rowsWritten: 2,
      });
      const originalOid = await readOid(client, relation);

      await expect(capability.publish(second)).resolves.toMatchObject({
        publicationOutcome: 'replaced',
        predecessorToken: first.publicationToken,
        rowsWritten: 1,
      });

      expect(await readOid(client, relation)).toBe(originalOid);
      expect(await readIds(client, relation)).toEqual(['3']);
    } finally {
      await capability.close();
    }
  });

  it('returns idempotent success without replacing current rows', async () => {
    const relation = 'orders_idempotent';
    const capability = new PostgresDvtPublicationCapability({ connectionString });
    const attempt = input(relation, 'c', null, rowsSql([1]));

    try {
      await capability.publish(attempt);
      await expect(capability.publish({ ...attempt, sql: rowsSql([99]) })).resolves.toMatchObject({
        publicationOutcome: 'verified-existing',
        rowsWritten: 1,
      });
      expect(await readIds(client, relation)).toEqual(['1']);
    } finally {
      await capability.close();
    }
  });

  it('rejects stale and unmanaged targets without mutating them', async () => {
    const capability = new PostgresDvtPublicationCapability({ connectionString });
    const managedRelation = 'orders_stale';
    const unmanagedRelation = 'orders_unmanaged';
    const accepted = input(managedRelation, 'd', null, rowsSql([1]));

    try {
      await capability.publish(accepted);
      await expect(
        capability.publish(input(managedRelation, 'e', null, rowsSql([2])))
      ).rejects.toMatchObject({
        name: PostgresDvtPublicationRejectedError.name,
        code: POSTGRES_DVT_PUBLICATION_ERROR_CODE.stale,
      });
      expect(await readIds(client, managedRelation)).toEqual(['1']);

      await client.query(
        `CREATE TABLE ${quoteIdentifier(schema)}.${quoteIdentifier(unmanagedRelation)} (order_id bigint, country text)`
      );
      await client.query(
        `INSERT INTO ${quoteIdentifier(schema)}.${quoteIdentifier(unmanagedRelation)} VALUES (7, 'ES')`
      );
      await expect(
        capability.publish(input(unmanagedRelation, 'f', null, rowsSql([8])))
      ).rejects.toMatchObject({ code: POSTGRES_DVT_PUBLICATION_ERROR_CODE.unmanaged });
      expect(await readIds(client, unmanagedRelation)).toEqual(['7']);
    } finally {
      await capability.close();
    }
  });
});

function input(
  relation: string,
  tokenCharacter: string,
  expectedPredecessorToken: string | null,
  sql: string
): PostgresDvtStableTablePublishInput {
  return {
    sql,
    target: {
      schemaVersion: 'dvt-transform-result-target.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-a',
        provider: 'postgres',
      },
      schema,
      relation,
    },
    expectedSchemaDigestSha256: schemaDigest,
    publicationToken: tokenCharacter.repeat(64),
    expectedPredecessorToken,
  };
}

function rowsSql(ids: readonly number[]): string {
  return ids.length === 0
    ? `SELECT NULL::bigint AS order_id, NULL::text AS country WHERE false`
    : `SELECT * FROM (VALUES ${ids.map((id) => `(${id}::bigint, 'ES'::text)`).join(', ')}) AS rows(order_id, country)`;
}

async function readOid(client: Client, relation: string): Promise<string> {
  const result = await client.query<{ readonly oid: string }>(
    `SELECT c.oid::text AS oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2`,
    [schema, relation]
  );
  const oid = result.rows[0]?.oid;
  if (oid === undefined) throw new Error('Expected published table');
  return oid;
}

async function readIds(client: Client, relation: string): Promise<readonly string[]> {
  const result = await client.query<{ readonly order_id: string }>(
    `SELECT order_id::text FROM ${quoteIdentifier(schema)}.${quoteIdentifier(relation)} ORDER BY order_id`
  );
  return result.rows.map((row) => row.order_id);
}
