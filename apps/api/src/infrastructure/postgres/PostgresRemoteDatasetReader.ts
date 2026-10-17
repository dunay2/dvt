/**
 * Owned concern: hold a bounded, authorized PostgreSQL relation snapshot around a scoped pull consumer.
 * @baseline ADR-0058 and #3394: bulk acquisition is not the display-safe Preview rail.
 * @decision Reuse relation authorization and pg-cursor; never accept client SQL or global type parsers.
 * @consequence Internal/uncomposed adapter; the caller still owns capture identity, READY and cancellation.
 */
import { performance } from 'node:perf_hooks';

import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import { Client, type QueryResult } from 'pg';
import Cursor from 'pg-cursor';

import type { WarehouseSourceObjectProbeTarget } from '../../application/ports/warehouseSourceImport.js';
import type { ILocalDataOperationAccess } from '../../application/ports/localDataPlane.js';
import { validateGenerationLimits, type GenerationLimits } from '../duckdb/duckDbGenerationProfile.js';
import { assertPostgresWarehouseDatabase } from '../warehouseSourceImport/assertPostgresWarehouseDatabase.js';

import {
  authorizePostgresSourceObject,
  parseRelationalSourceObjectId,
  quotePostgresIdentifier,
} from './postgresAuthorizedSourceObject.js';
import { createPostgresLocalDataBatchCodec } from './postgresLocalDataBatchCodec.js';
import { PostgresDatasetReadError, PostgresPullCursor, type PostgresDatasetCursor } from './PostgresRemoteDatasetCursor.js';

type Input = Readonly<{ target: WarehouseSourceObjectProbeTarget; access: ILocalDataOperationAccess; limits: GenerationLimits; timeoutMs: number }>;
type Column = { attnum: number; name: string; oid: number; nullable: boolean };

export class PostgresRemoteDatasetReader {
  public constructor(private readonly credentials: IPostgresCredentialBindingResolver) {}

  /** Scope/principal/credentialRef must be bound by the trusted composition root before this call. */
  public async withCursor<T>(input: Input, consume: (cursor: PostgresDatasetCursor) => Promise<T>): Promise<T> {
    const target = Object.freeze({ type: input.target.type, database: input.target.database,
      objectId: input.target.objectId, credentialRef: input.target.credentialRef,
      expectedPublicationToken: input.target.expectedPublicationToken });
    const access = Object.freeze({ signal: input.access.signal,
      checkpoint: input.access.checkpoint.bind(input.access),
      beforePromotion: input.access.beforePromotion.bind(input.access) });
    const limits = validateGenerationLimits(input.limits);
    const timeoutMs = input.timeoutMs;
    if (target.type !== 'postgres' || typeof target.objectId !== 'string' ||
        typeof target.database !== 'string' || typeof target.credentialRef !== 'string' ||
        !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
      throw new PostgresDatasetReadError('INVALID_INPUT');
    }
    const locator = parseRelationalSourceObjectId(target.objectId);
    if (!locator || locator.catalog !== target.database ||
        Object.values(locator).some(value => value.includes('\0'))) {
      throw new PostgresDatasetReadError('INVALID_INPUT');
    }
    const started = performance.now();
    const assertOpen = () => {
      if (access.signal.aborted) throw new PostgresDatasetReadError('ACCESS_REJECTED');
      if (performance.now() - started >= timeoutMs) throw new PostgresDatasetReadError('READ_TIMEOUT');
    };
    const checkpoint = async () => {
      assertOpen();
      try { await access.checkpoint(); } catch { throw new PostgresDatasetReadError('ACCESS_REJECTED'); }
      assertOpen();
    };
    assertOpen();
    try { await access.beforePromotion(); } catch { throw new PostgresDatasetReadError('ACCESS_REJECTED'); }
    assertOpen();
    const connectionString = await provider(() => this.credentials.resolveCredential(target.credentialRef));
    if (!connectionString?.trim()) throw new PostgresDatasetReadError('SOURCE_REJECTED');
    assertOpen();
    const client = await provider(async () => new Client({ connectionString, application_name: 'dvt-local-capture', connectionTimeoutMillis: Math.min(timeoutMs, 5000) }));
    let transaction = false;
    let native: Cursor<unknown[]> | undefined;
    let pull: PostgresPullCursor | undefined;
    let success = false;
    let connectionError = false;
    const onError = () => { connectionError = true; };
    client.on('error', onError);
    try {
      await provider(() => client.connect());
      await provider(() => assertPostgresWarehouseDatabase(client, target.database));
      await provider(() => client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'));
      transaction = true;
      await provider(() => client.query(
        `SET LOCAL statement_timeout = '${Math.min(timeoutMs, 5000)}ms';
         SET LOCAL lock_timeout = '${Math.min(timeoutMs, 5000)}ms';
         SET LOCAL idle_in_transaction_session_timeout = '${timeoutMs}ms'`
      ));
      const relation = `${quotePostgresIdentifier(locator.schema)}.${quotePostgresIdentifier(locator.name)}`;
      // Acquire the relation lock before reading its metadata; ONLY avoids implicitly locking descendants.
      await provider(() => client.query(`LOCK TABLE ONLY ${relation} IN ACCESS SHARE MODE`));
      const authorized = await provider(() => authorizePostgresSourceObject(client, locator, target.objectId, target.expectedPublicationToken));
      if (authorized.relation_kind !== 'r') throw new PostgresDatasetReadError('UNSUPPORTED_SOURCE');
      const identity = await provider(() => client.query<{ oid: string; inherited: boolean; partitioned: boolean }>(
        `SELECT c.oid::text AS oid, c.relhassubclass AS inherited, c.relispartition AS partitioned
         FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind='r'`, [locator.schema, locator.name]
      ));
      const id = identity.rows[0];
      if (identity.rows.length !== 1 || !id || !/^[1-9][0-9]{0,9}$/u.test(id.oid) || Number(id.oid) > 4294967295 || id.inherited || id.partitioned) {
        throw new PostgresDatasetReadError('UNSUPPORTED_SOURCE');
      }
      const columns = await provider(() => client.query<Column>(
        `SELECT attnum::int AS attnum, attname AS name, atttypid::int AS oid, NOT attnotnull AS nullable
         FROM pg_attribute WHERE attrelid=$1::oid AND attnum>0 AND NOT attisdropped ORDER BY attnum`, [id.oid]
      ));
      const codec = createPostgresLocalDataBatchCodec(columns.rows.map((column, ordinal) => ({
        ordinal, name: column.name, dataTypeID: column.oid, nullable: column.nullable,
      })));
      const selected = columns.rows.map(column => quotePostgresIdentifier(column.name)).join(',');
      const text = `SELECT ${selected} FROM ONLY ${relation}`;
      const rawTypes = { getTypeParser: () => (value: string) => value };
      const metadata = await provider(() => client.query<unknown[]>({
        text: `${text} LIMIT 0`, rowMode: 'array', types: rawTypes,
      }));
      if (metadata.fields.length !== columns.rows.length || metadata.fields.some((field, i) => {
        const column = columns.rows[i]!;
        return field.name !== column.name || field.tableID !== Number(id.oid) ||
          field.columnID !== column.attnum || field.dataTypeID !== column.oid || field.format !== 'text';
      })) throw new PostgresDatasetReadError('SCHEMA_CHANGED');
      await checkpoint();
      native = client.query(new Cursor<unknown[]>(text, [], { rowMode: 'array', types: rawTypes }));
      const cursor = native;
      const readNative = (maxRows: number) => provider(() => new Promise<{ rows: unknown[][]; result?: QueryResult }>((resolve, reject) => {
        cursor.read(maxRows, (error, rows, result) => error ? reject(error) : resolve({ rows, ...(result ? { result } : {}) }));
      }));
      const check = async () => {
        if (connectionError) throw new PostgresDatasetReadError('PROVIDER_FAILED');
        await checkpoint();
      };
      pull = new PostgresPullCursor({ codec, limits, fields: metadata.fields, observedAt: new Date().toISOString(), checkpoint: check, readNative });
      const value = await consume(Object.freeze({ schema: pull.schema, observedAt: pull.observedAt, read: pull.read.bind(pull) }));
      await pull.finish();
      success = true;
      return value;
    } finally {
      let cleanupFailed = false;
      if (pull && !success) {
        try { await pull.finish(); } catch { /* The consumer/read failure still causes rollback. */ }
      }
      if (native && !connectionError) {
        try { await native.close(); } catch { cleanupFailed = true; }
      }
      if (transaction && !connectionError) {
        try { await client.query(success && !cleanupFailed ? 'COMMIT' : 'ROLLBACK'); }
        catch { cleanupFailed = true; }
      }
      try { await client.end(); } catch { cleanupFailed = true; }
      client.removeListener('error', onError);
      if (cleanupFailed || (success && connectionError)) throw new PostgresDatasetReadError('CLEANUP_FAILED');
    }
  }
}

async function provider<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
    throw new PostgresDatasetReadError(code === '57014' ? 'READ_TIMEOUT' : 'PROVIDER_FAILED');
  }
}
