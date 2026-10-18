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

import { parseRelationalSourceObjectId } from './postgresAuthorizedSourceObject.js';
import { preparePostgresDatasetSnapshot, provider } from './postgresDatasetSnapshot.js';
import { PostgresDatasetReadError, PostgresPullCursor, type PostgresDatasetCursor } from './PostgresRemoteDatasetCursor.js';

type Input = Readonly<{ target: WarehouseSourceObjectProbeTarget; access: ILocalDataOperationAccess; limits: GenerationLimits; timeoutMs: number }>;

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
      const snapshot = await preparePostgresDatasetSnapshot(client, locator, target);
      await checkpoint();
      native = client.query(new Cursor<unknown[]>(snapshot.text, [], { rowMode: 'array', types: snapshot.types }));
      const cursor = native;
      const readNative = (maxRows: number) => provider(() => new Promise<{ rows: unknown[][]; result?: QueryResult }>((resolve, reject) => {
        cursor.read(maxRows, (error, rows, result) => error ? reject(error) : resolve({ rows, ...(result ? { result } : {}) }));
      }));
      const check = async () => {
        if (connectionError) throw new PostgresDatasetReadError('PROVIDER_FAILED');
        await checkpoint();
      };
      pull = new PostgresPullCursor({ codec: snapshot.codec, limits, fields: snapshot.fields, observedAt: new Date().toISOString(), checkpoint: check, readNative });
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
