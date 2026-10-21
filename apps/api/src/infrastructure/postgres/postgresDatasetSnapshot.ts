/**
 * Owned concern: preflight one locked PostgreSQL relation and prepare its exact positional cursor profile.
 * @baseline ADR-0058/#3394: reuse SELECT/publication guards, ordinary tables and admitted types only.
 * @decision Keep provider SQL, metadata and error translation inside the PostgreSQL gateway.
 * @consequence Caller owns the transaction, connection, access checkpoints and cursor lifetime.
 */
import type { Client } from 'pg';

import type { WarehouseSourceObjectProbeTarget } from '../../application/ports/warehouseSourceImport.js';

import {
  authorizePostgresSourceObject,
  quotePostgresIdentifier,
  type RelationalSourceObjectId,
} from './postgresAuthorizedSourceObject.js';
import { createPostgresLocalDataBatchCodec } from './postgresLocalDataBatchCodec.js';
import {
  POSTGRES_RAW_TEXT_TYPES,
  postgresReadOperation as provider,
} from './PostgresReadSession.js';
import { PostgresDatasetReadError } from './PostgresRemoteDatasetCursor.js';

type Column = { attnum: number; name: string; oid: number; nullable: boolean };

export async function preparePostgresDatasetSnapshot(
  client: Pick<Client, 'query'>,
  locator: RelationalSourceObjectId,
  target: WarehouseSourceObjectProbeTarget
) {
  const relation = `${quotePostgresIdentifier(locator.schema)}.${quotePostgresIdentifier(locator.name)}`;
  // Acquire the relation lock before reading its metadata; ONLY avoids implicitly locking descendants.
  await provider(() => client.query(`LOCK TABLE ONLY ${relation} IN ACCESS SHARE MODE`));
  const authorized = await provider(() =>
    authorizePostgresSourceObject(client, locator, target.objectId, target.expectedPublicationToken)
  );
  if (authorized.relation_kind !== 'r') throw new PostgresDatasetReadError('UNSUPPORTED_SOURCE');
  const identity = await provider(() =>
    client.query<{ oid: string; inherited: boolean; partitioned: boolean }>(
      `SELECT c.oid::text AS oid, c.relhassubclass AS inherited, c.relispartition AS partitioned
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind='r'`,
      [locator.schema, locator.name]
    )
  );
  const id = identity.rows[0];
  if (
    identity.rows.length !== 1 ||
    !id ||
    !/^[1-9][0-9]{0,9}$/u.test(id.oid) ||
    Number(id.oid) > 4294967295 ||
    id.inherited ||
    id.partitioned
  ) {
    throw new PostgresDatasetReadError('UNSUPPORTED_SOURCE');
  }
  const columns = await provider(() =>
    client.query<Column>(
      `SELECT attnum::int AS attnum, attname AS name, atttypid::int AS oid, NOT attnotnull AS nullable
     FROM pg_attribute WHERE attrelid=$1::oid AND attnum>0 AND NOT attisdropped ORDER BY attnum`,
      [id.oid]
    )
  );
  const codec = createPostgresLocalDataBatchCodec(
    columns.rows.map((column, ordinal) => ({
      ordinal,
      name: column.name,
      dataTypeID: column.oid,
      nullable: column.nullable,
    }))
  );
  const selected = columns.rows.map((column) => quotePostgresIdentifier(column.name)).join(',');
  const text = `SELECT ${selected} FROM ONLY ${relation}`;
  const metadata = await provider(() =>
    client.query<unknown[]>({
      text: `${text} LIMIT 0`,
      rowMode: 'array',
      types: POSTGRES_RAW_TEXT_TYPES,
    })
  );
  if (
    metadata.fields.length !== columns.rows.length ||
    metadata.fields.some((field, i) => {
      const column = columns.rows[i]!;
      return (
        field.name !== column.name ||
        field.tableID !== Number(id.oid) ||
        field.columnID !== column.attnum ||
        field.dataTypeID !== column.oid ||
        field.format !== 'text'
      );
    })
  )
    throw new PostgresDatasetReadError('SCHEMA_CHANGED');
  return Object.freeze({ codec, fields: metadata.fields, text });
}
