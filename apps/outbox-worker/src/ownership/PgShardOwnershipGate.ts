import { setTimeout as sleep } from 'node:timers/promises';

import { acquirePgPool, type PgPoolConfig } from '../db/pool.js';
import type { OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

interface OwnershipLease {
  release(): Promise<void>;
  waitForLoss?(): Promise<void>;
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
  heartbeatIntervalMs?: number;
}

interface AdvisoryLockResult {
  acquired: boolean;
}

interface AcquireOwnershipOptions {
  signal: globalThis.AbortSignal;
  config: PgShardOwnershipGateConfig;
  shardIds: readonly number[];
  acquirePoolLease: (config: PgPoolConfig) => OwnershipPoolLease;
  heartbeatIntervalMs: number;
}

interface AcquireLocksAndBuildLeaseOptions {
  client: OwnershipClient;
  poolLease: OwnershipPoolLease;
  signal: globalThis.AbortSignal;
  schema: string;
  shardIds: readonly number[];
  logger: OutboxWorkerRuntimeLogger;
  heartbeatIntervalMs: number;
}

type ShardLockAcquisitionOutcome =
  | {
      status: 'acquired';
      acquiredShardIds: number[];
    }
  | {
      status: 'aborted';
      acquiredShardIds: number[];
    }
  | {
      status: 'unavailable';
      acquiredShardIds: number[];
      failedShardId: number;
    };

const OWNERSHIP_LOCK_SQL =
  "SELECT pg_try_advisory_lock((('x' || left(md5($1), 16))::bit(64)::bigint)) AS acquired";
const OWNERSHIP_HEARTBEAT_SQL = 'SELECT 1';
const DEFAULT_HEARTBEAT_INTERVAL_MS = 1_000;

export function createPgShardOwnershipGate(
  config: PgShardOwnershipGateConfig,
  deps: PgShardOwnershipGateDependencies = {}
): OwnershipGate {
  const acquirePoolLease = deps.acquirePoolLease ?? acquirePgPool;
  const shardIds = normalizeShardIds(config.shardIds);
  const heartbeatIntervalMs = deps.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;

  return {
    acquire: async (signal: globalThis.AbortSignal): Promise<OwnershipLease | null> =>
      acquireOwnershipLease({
        signal,
        config,
        shardIds,
        acquirePoolLease,
        heartbeatIntervalMs,
      }),
  };
}

function buildPoolConfig(config: PgShardOwnershipGateConfig): PgPoolConfig {
  return {
    connectionString: config.connectionString,
    ...(config.statementTimeoutMs === undefined
      ? {}
      : { statementTimeoutMs: config.statementTimeoutMs }),
    ...(config.queryTimeoutMs === undefined ? {} : { queryTimeoutMs: config.queryTimeoutMs }),
  };
}

async function acquireOwnershipLease(options: AcquireOwnershipOptions): Promise<OwnershipLease | null> {
  if (options.signal.aborted) {
    return null;
  }

  const poolLease = options.acquirePoolLease(buildPoolConfig(options.config));
  let client: OwnershipClient | null = null;

  try {
    client = await poolLease.pool.connect();
    return await acquireLocksAndBuildLease({
      client,
      poolLease,
      signal: options.signal,
      schema: options.config.schema,
      shardIds: options.shardIds,
      logger: options.config.logger,
      heartbeatIntervalMs: options.heartbeatIntervalMs,
    });
  } catch (error) {
    await safelyDestroyOwnershipSession(client, poolLease, options.config.logger);
    throw error;
  }
}

async function acquireLocksAndBuildLease(
  options: AcquireLocksAndBuildLeaseOptions
): Promise<OwnershipLease | null> {
  const lockOutcome = await acquireConfiguredShardLocks({
    client: options.client,
    signal: options.signal,
    schema: options.schema,
    shardIds: options.shardIds,
  });

  if (lockOutcome.status === 'aborted') {
    await destroyOwnershipSession(options.client, options.poolLease);
    return null;
  }

  if (lockOutcome.status === 'unavailable') {
    options.logger.warn?.(
      {
        configuredShardIds: options.shardIds,
        acquiredShardIds: lockOutcome.acquiredShardIds,
        failedShardIds: [lockOutcome.failedShardId],
      },
      'outbox shard ownership unavailable'
    );
    await destroyOwnershipSession(options.client, options.poolLease);
    return null;
  }

  options.logger.info(
    {
      configuredShardIds: options.shardIds,
      acquiredShardIds: lockOutcome.acquiredShardIds,
    },
    'outbox shard ownership acquired'
  );

  return createOwnershipLease({
    client: options.client,
    poolLease: options.poolLease,
    logger: options.logger,
    acquiredShardIds: lockOutcome.acquiredShardIds,
    heartbeatIntervalMs: options.heartbeatIntervalMs,
  });
}

async function acquireConfiguredShardLocks(options: {
  client: OwnershipClient;
  signal: globalThis.AbortSignal;
  schema: string;
  shardIds: readonly number[];
}): Promise<ShardLockAcquisitionOutcome> {
  const acquiredShardIds: number[] = [];
  for (const shardId of options.shardIds) {
    if (options.signal.aborted) {
      return {
        status: 'aborted',
        acquiredShardIds,
      };
    }

    const acquired = await tryAcquireShardLock(options.client, options.schema, shardId);
    if (!acquired) {
      return {
        status: 'unavailable',
        acquiredShardIds,
        failedShardId: shardId,
      };
    }

    acquiredShardIds.push(shardId);
  }

  if (options.signal.aborted) {
    return {
      status: 'aborted',
      acquiredShardIds,
    };
  }

  return {
    status: 'acquired',
    acquiredShardIds,
  };
}

function createOwnershipLease(options: {
  client: OwnershipClient;
  poolLease: OwnershipPoolLease;
  logger: OutboxWorkerRuntimeLogger;
  acquiredShardIds: readonly number[];
  heartbeatIntervalMs: number;
}): OwnershipLease {
  let settled = false;
  let sessionClosed = false;
  let resolveWaitForLoss: (() => void) | null = null;
  let rejectWaitForLoss: ((error: Error) => void) | null = null;
  const heartbeatAbort = new globalThis.AbortController();
  const waitForLossPromise = new Promise<void>((resolve, reject) => {
    resolveWaitForLoss = resolve;
    rejectWaitForLoss = reject;
  });

  const settleWaitForLoss = (error: Error | null): void => {
    if (settled) {
      return;
    }
    settled = true;
    if (error === null) {
      resolveWaitForLoss?.();
      return;
    }
    rejectWaitForLoss?.(error);
  };

  const closeSession = async (): Promise<void> => {
    if (sessionClosed) {
      return;
    }
    sessionClosed = true;
    heartbeatAbort.abort();
    await destroyOwnershipSession(options.client, options.poolLease);
  };

  void monitorOwnershipSession({
    client: options.client,
    intervalMs: options.heartbeatIntervalMs,
    signal: heartbeatAbort.signal,
  }).then(
    () => {
      settleWaitForLoss(null);
    },
    async (error) => {
      await safelyCloseLostOwnershipSession(options, closeSession);
      settleWaitForLoss(toOwnershipLossError(error, options.acquiredShardIds));
    }
  );

  return {
    waitForLoss: async (): Promise<void> => waitForLossPromise,
    release: async (): Promise<void> => {
      if (sessionClosed) {
        return;
      }
      await closeSession();
      settleWaitForLoss(null);
      options.logger.info(
        {
          releasedShardIds: options.acquiredShardIds,
        },
        'outbox shard ownership released'
      );
    },
  };
}

async function monitorOwnershipSession(options: {
  client: OwnershipClient;
  intervalMs: number;
  signal: globalThis.AbortSignal;
}): Promise<void> {
  while (!options.signal.aborted) {
    await waitForHeartbeatInterval(options.intervalMs, options.signal);
    if (options.signal.aborted) {
      return;
    }

    await options.client.query(OWNERSHIP_HEARTBEAT_SQL);
  }
}

async function waitForHeartbeatInterval(
  intervalMs: number,
  signal: globalThis.AbortSignal
): Promise<void> {
  try {
    await sleep(intervalMs, undefined, { signal });
  } catch (error) {
    if (signal.aborted && isAbortError(error)) {
      return;
    }
    throw error;
  }
}

async function safelyCloseLostOwnershipSession(
  options: {
    logger: OutboxWorkerRuntimeLogger;
  },
  closeSession: () => Promise<void>
): Promise<void> {
  try {
    await closeSession();
  } catch (error) {
    options.logger.warn?.(
      {
        err: toErrorLike(error),
      },
      'outbox shard ownership cleanup failed'
    );
  }
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
  const normalizedShardIds = [...new Set(shardIds)].sort((left, right) => left - right);
  if (normalizedShardIds.length === 0) {
    throw new Error('PgShardOwnershipGate requires at least one shard id');
  }

  const invalidShardId = normalizedShardIds.find(
    (shardId) => !Number.isInteger(shardId) || shardId < 0
  );
  if (invalidShardId !== undefined) {
    throw new Error(
      `PgShardOwnershipGate shard ids must be non-negative integers; received ${invalidShardId}`
    );
  }

  return normalizedShardIds;
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
  let releaseClientError: unknown;
  if (client) {
    try {
      client.release(true);
    } catch (error) {
      releaseClientError = error;
    }
  }

  await poolLease.release();

  if (releaseClientError !== undefined) {
    throw releaseClientError;
  }
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

function createOwnershipLostError(error: unknown, shardIds: readonly number[]): Error {
  const message =
    shardIds.length === 0
      ? 'OUTBOX_OWNERSHIP_LOST'
      : `OUTBOX_OWNERSHIP_LOST: shards=${shardIds.join(',')}`;
  const ownershipError = new Error(message, {
    cause: error instanceof Error ? error : new Error(stringifyUnknownError(error)),
  });
  ownershipError.name = 'OwnershipLostError';
  return ownershipError;
}

function toOwnershipLossError(error: unknown, shardIds: readonly number[]): Error {
  if (error instanceof Error && error.name === 'OwnershipLostError') {
    return error;
  }
  return createOwnershipLostError(error, shardIds);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export type {
  OwnershipGate,
  OwnershipLease,
  PgShardOwnershipGateConfig,
  PgShardOwnershipGateDependencies,
};
