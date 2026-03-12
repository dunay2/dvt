import { acquirePgPool, type PgPoolConfig } from '../db/pool.js';
import type { OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

interface OwnershipLease {
  release(): Promise<void>;
}

interface OwnershipGate {
  acquire(signal: globalThis.AbortSignal): Promise<OwnershipLease | null>;
}

interface OwnershipClient {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  release(destroy?: boolean): void;
}

interface OwnershipPool {
  connect(): Promise<OwnershipClient>;
}

interface OwnershipPoolLease {
  pool: OwnershipPool;
  release(): Promise<void>;
}

interface PgShardOwnershipGateConfig extends PgPoolConfig {
  schema: string;
  shardIds: readonly number[];
  logger: OutboxWorkerRuntimeLogger;
}

interface PgShardOwnershipGateDependencies {
  acquirePoolLease?: (config: PgPoolConfig) => OwnershipPoolLease;
}

interface AdvisoryLockResult {
  acquired: boolean;
}

const OWNERSHIP_LOCK_SQL =
  "SELECT pg_try_advisory_lock((('x' || left(md5($1), 16))::bit(64)::bigint)) AS acquired";

export function createPgShardOwnershipGate(
  config: PgShardOwnershipGateConfig,
  deps: PgShardOwnershipGateDependencies = {}
): OwnershipGate {
  const acquirePoolLease = deps.acquirePoolLease ?? acquirePgPool;
  const shardIds = normalizeShardIds(config.shardIds);

  return {
    async acquire(signal: globalThis.AbortSignal): Promise<OwnershipLease | null> {
      if (signal.aborted) {
        return null;
      }

      const poolLease = acquirePoolLease({
        connectionString: config.connectionString,
        ...(config.statementTimeoutMs === undefined
          ? {}
          : { statementTimeoutMs: config.statementTimeoutMs }),
        ...(config.queryTimeoutMs === undefined ? {} : { queryTimeoutMs: config.queryTimeoutMs }),
      });

      let client: OwnershipClient | null = null;
      const acquiredShardIds: number[] = [];

      try {
        client = await poolLease.pool.connect();

        for (const shardId of shardIds) {
          if (signal.aborted) {
            await destroyOwnershipSession(client, poolLease);
            return null;
          }

          const acquired = await tryAcquireShardLock(client, config.schema, shardId);
          if (!acquired) {
            config.logger.warn?.(
              {
                configuredShardIds: shardIds,
                acquiredShardIds,
                failedShardIds: [shardId],
              },
              'outbox shard ownership unavailable'
            );
            await destroyOwnershipSession(client, poolLease);
            return null;
          }

          acquiredShardIds.push(shardId);
        }

        if (signal.aborted) {
          await destroyOwnershipSession(client, poolLease);
          return null;
        }

        config.logger.info(
          {
            configuredShardIds: shardIds,
            acquiredShardIds,
          },
          'outbox shard ownership acquired'
        );

        return createOwnershipLease({
          client,
          poolLease,
          logger: config.logger,
          acquiredShardIds,
        });
      } catch (error) {
        await safelyDestroyOwnershipSession(client, poolLease, config.logger);
        throw error;
      }
    },
  };
}

function createOwnershipLease(options: {
  client: OwnershipClient;
  poolLease: OwnershipPoolLease;
  logger: OutboxWorkerRuntimeLogger;
  acquiredShardIds: readonly number[];
}): OwnershipLease {
  let released = false;

  return {
    release: async (): Promise<void> => {
      if (released) {
        return;
      }
      released = true;
      await destroyOwnershipSession(options.client, options.poolLease);
      options.logger.info(
        {
          releasedShardIds: options.acquiredShardIds,
        },
        'outbox shard ownership released'
      );
    },
  };
}

async function tryAcquireShardLock(
  client: OwnershipClient,
  schema: string,
  shardId: number
): Promise<boolean> {
  const result = await client.query<AdvisoryLockResult>(OWNERSHIP_LOCK_SQL, [
    buildOwnershipLockScope(schema, shardId),
  ]);
  return result.rows[0]?.acquired === true;
}

function buildOwnershipLockScope(schema: string, shardId: number): string {
  return `${schema}:outbox-shard:${shardId}`;
}

function normalizeShardIds(shardIds: readonly number[]): number[] {
  return [...new Set(shardIds)].sort((left, right) => left - right);
}

async function safelyDestroyOwnershipSession(
  client: OwnershipClient | null,
  poolLease: OwnershipPoolLease,
  logger: OutboxWorkerRuntimeLogger
): Promise<void> {
  try {
    await destroyOwnershipSession(client, poolLease);
  } catch (error) {
    logger.warn?.(
      {
        err: toErrorLike(error),
      },
      'outbox shard ownership cleanup failed'
    );
  }
}

async function destroyOwnershipSession(
  client: OwnershipClient | null,
  poolLease: OwnershipPoolLease
): Promise<void> {
  if (client) {
    client.release(true);
  }
  await poolLease.release();
}

function toErrorLike(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: stringifyUnknownError(error), name: 'UnknownError' };
}

function stringifyUnknownError(error: unknown): string {
  switch (typeof error) {
    case 'string':
      return error;
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'undefined':
      return stringifyPrimitiveError(error);
    case 'symbol':
      return error.description ?? error.toString();
    case 'function':
      return error.name ? `[function ${error.name}]` : '[function anonymous]';
    case 'object':
      return error === null ? 'null' : serializeErrorObject(error);
    default:
      return 'UnknownErrorValue';
  }
}

function stringifyPrimitiveError(value: number | boolean | bigint | undefined): string {
  return `${value}`;
}

function serializeErrorObject(error: object): string {
  try {
    return JSON.stringify(error);
  } catch {
    const constructorName = error.constructor?.name;
    return constructorName && constructorName !== 'Object'
      ? constructorName
      : 'UnserializableErrorObject';
  }
}

export type {
  OwnershipGate,
  OwnershipLease,
  PgShardOwnershipGateConfig,
  PgShardOwnershipGateDependencies,
};
