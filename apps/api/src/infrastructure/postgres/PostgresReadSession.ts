/**
 * Owned concern: close one native PostgreSQL cursor, transaction and client on every exit path.
 * @baseline #3394: successful source closure is required before any later READY promotion.
 * @decision Scoped resource bracket; preserve read-only setup and fail closed on cleanup errors.
 * @consequence This is not a cross-database transaction or an application acquisition policy.
 */
import { Client, type QueryResult } from 'pg';
import Cursor from 'pg-cursor';

import { assertPostgresWarehouseDatabase } from '../warehouseSourceImport/assertPostgresWarehouseDatabase.js';

import { PostgresDatasetReadError } from './PostgresRemoteDatasetCursor.js';

export const POSTGRES_RAW_TEXT_TYPES = Object.freeze({ getTypeParser: () => (value: string) => value });
type NativeBatch = Readonly<{ rows: unknown[][]; result?: QueryResult }>;
type ReadSession = Readonly<{
  client: Pick<Client, 'query'>;
  assertHealthy(): void;
  openCursor(text: string): (maxRows: number) => Promise<NativeBatch>;
}>;
type SessionInput = Readonly<{ connectionString: string; database: string; timeoutMs: number }>;

/** Never resolve the callback result before native close, transaction end and client end. */
export async function withPostgresReadSession<T>(
  input: SessionInput,
  consume: (session: ReadSession) => Promise<T>
): Promise<T> {
  const { connectionString, database, timeoutMs } = input;
  const client = await postgresReadOperation(async () => new Client({ connectionString,
    application_name: 'dvt-local-capture', connectionTimeoutMillis: Math.min(timeoutMs, 5000) }));
  let transaction = false;
  let native: Cursor<unknown[]> | undefined;
  let success = false;
  let connectionError = false;
  const onError = () => { connectionError = true; };
  client.on('error', onError);
  const assertHealthy = () => {
    if (connectionError) throw new PostgresDatasetReadError('PROVIDER_FAILED');
  };
  const session: ReadSession = Object.freeze({
    client,
    assertHealthy,
    openCursor(text: string) {
      assertHealthy();
      if (native) throw new PostgresDatasetReadError('READ_IN_PROGRESS');
      const cursor = client.query(new Cursor<unknown[]>(text, [], { rowMode: 'array', types: POSTGRES_RAW_TEXT_TYPES }));
      native = cursor;
      return (maxRows: number) => postgresReadOperation(() => new Promise<NativeBatch>((resolve, reject) => {
        cursor.read(maxRows, (error, rows, result) => error ? reject(error) : resolve({ rows, ...(result ? { result } : {}) }));
      }));
    },
  });
  try {
    await postgresReadOperation(() => client.connect());
    await postgresReadOperation(() => assertPostgresWarehouseDatabase(client, database));
    await postgresReadOperation(() => client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'));
    transaction = true;
    await postgresReadOperation(() => client.query(
      `SET LOCAL statement_timeout = '${Math.min(timeoutMs, 5000)}ms';
       SET LOCAL lock_timeout = '${Math.min(timeoutMs, 5000)}ms';
       SET LOCAL idle_in_transaction_session_timeout = '${timeoutMs}ms'`
    ));
    const value = await consume(session);
    success = true;
    return value;
  } finally {
    let cleanupFailed = false;
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

/** Provider messages may contain credentials, SQL or values; expose only the existing typed code. */
export async function postgresReadOperation<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
    throw new PostgresDatasetReadError(code === '57014' ? 'READ_TIMEOUT' : 'PROVIDER_FAILED');
  }
}
