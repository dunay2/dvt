/**
 * Owned concern: hold one authorized PostgreSQL snapshot around a scoped pull consumer.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Delegate snapshot preflight and native resource lifetime to their existing owners.
 * @consequence Successful callback completion still awaits cursor, transaction and client closure.
 * @version 1.0.0
 */
import { performance } from 'node:perf_hooks';

import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';

import type { ILocalDataOperationAccess } from '../../application/ports/localDataPlane.js';
import type { WarehouseSourceObjectProbeTarget } from '../../application/ports/warehouseSourceImport.js';
import type { GenerationLimits } from '../../domain/localDataBatch.js';

import { parseRelationalSourceObjectId } from './postgresAuthorizedSourceObject.js';
import { preparePostgresDatasetSnapshot } from './postgresDatasetSnapshot.js';
import { postgresReadOperation, withPostgresReadSession } from './PostgresReadSession.js';
import {
  PostgresDatasetReadError,
  PostgresPullCursor,
  validatePostgresReadLimits,
  type PostgresDatasetCursor,
} from './PostgresRemoteDatasetCursor.js';

type Input = Readonly<{
  target: WarehouseSourceObjectProbeTarget;
  access: ILocalDataOperationAccess;
  limits: GenerationLimits;
  timeoutMs: number;
}>;

export class PostgresRemoteDatasetReader {
  public constructor(private readonly credentials: IPostgresCredentialBindingResolver) {}
  /** The composition root binds scope, principal and catalog credentials before entering this adapter. */
  public async withCursor<T>(
    input: Input,
    consume: (cursor: PostgresDatasetCursor) => Promise<T>
  ): Promise<T> {
    const target = Object.freeze({
      type: input.target.type,
      database: input.target.database,
      objectId: input.target.objectId,
      credentialRef: input.target.credentialRef,
      expectedPublicationToken: input.target.expectedPublicationToken,
    });
    const access = Object.freeze({
      signal: input.access.signal,
      checkpoint: input.access.checkpoint.bind(input.access),
      beforePromotion: input.access.beforePromotion.bind(input.access),
    });
    const limits = validatePostgresReadLimits(input.limits);
    const timeoutMs = input.timeoutMs;
    if (
      target.type !== 'postgres' ||
      typeof target.objectId !== 'string' ||
      typeof target.database !== 'string' ||
      typeof target.credentialRef !== 'string' ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 60000
    ) {
      throw new PostgresDatasetReadError('INVALID_INPUT');
    }
    const locator = parseRelationalSourceObjectId(target.objectId);
    if (
      !locator ||
      locator.catalog !== target.database ||
      Object.values(locator).some((value) => value.includes('\0'))
    ) {
      throw new PostgresDatasetReadError('INVALID_INPUT');
    }
    const started = performance.now();
    const assertOpen = (): void => {
      if (access.signal.aborted) throw new PostgresDatasetReadError('ACCESS_REJECTED');
      if (performance.now() - started >= timeoutMs)
        throw new PostgresDatasetReadError('READ_TIMEOUT');
    };
    const checkpoint = async (): Promise<void> => {
      assertOpen();
      try {
        await access.checkpoint();
      } catch {
        throw new PostgresDatasetReadError('ACCESS_REJECTED');
      }
      assertOpen();
    };
    assertOpen();
    try {
      await access.beforePromotion();
    } catch {
      throw new PostgresDatasetReadError('ACCESS_REJECTED');
    }
    assertOpen();
    const connectionString = await postgresReadOperation(() =>
      this.credentials.resolveCredential(target.credentialRef)
    );
    if (!connectionString?.trim()) throw new PostgresDatasetReadError('SOURCE_REJECTED');
    assertOpen();
    return withPostgresReadSession(
      { connectionString, database: target.database, timeoutMs },
      async (session) => {
        const snapshot = await preparePostgresDatasetSnapshot(session.client, locator, target);
        await checkpoint();
        const readNative = session.openCursor(snapshot.text);
        const check = async (): Promise<void> => {
          session.assertHealthy();
          await checkpoint();
        };
        const pull = new PostgresPullCursor({
          codec: snapshot.codec,
          limits,
          fields: snapshot.fields,
          observedAt: new Date().toISOString(),
          checkpoint: check,
          readNative,
        });
        let value: T;
        try {
          value = await consume(
            Object.freeze({
              schema: pull.schema,
              observedAt: pull.observedAt,
              read: pull.read.bind(pull),
            })
          );
        } catch (error) {
          try {
            await pull.finish();
          } catch {
            /* Retain the consumer failure; the native session rolls back. */
          }
          throw error;
        }
        await pull.finish();
        return value;
      }
    );
  }
}
