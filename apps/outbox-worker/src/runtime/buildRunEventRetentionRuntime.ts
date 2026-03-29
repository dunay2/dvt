import { PostgresRunArchiveStore, PostgresRunSnapshotStore } from '@dvt/adapter-postgres';
import {
  FileSystemArchiveObjectStore,
  ObjectStorageRunArchiveExporter,
  RunArchiveCoordinator,
} from '@dvt/state-store';
import type { Pool, PoolClient } from 'pg';

import type { ActiveEnv } from '../plugins/env.js';

import {
  RunEventRetentionRuntime,
  type RunEventRetentionRuntimeLogger,
} from './RunEventRetentionRuntime.js';

type QueryInput = string | { text: string; values?: readonly unknown[] };
type QueryConfigWithSignal = {
  text: string;
  values?: readonly unknown[];
  signal?: globalThis.AbortSignal;
};

export function buildRunEventRetentionRuntime(
  env: ActiveEnv,
  pool: Pool,
  logger: RunEventRetentionRuntimeLogger
): RunEventRetentionRuntime {
  let activeCycleSignal: globalThis.AbortSignal | undefined;

  const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    const abortAwareClient = createAbortAwareClient(client, activeCycleSignal);
    try {
      return await fn(abortAwareClient);
    } finally {
      client.release();
    }
  };

  const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      return await executeAbortAwareTransaction(client, activeCycleSignal, fn, logger);
    } finally {
      client.release();
    }
  };

  const snapshotStore = new PostgresRunSnapshotStore(
    env.DVT_PG_SCHEMA,
    () => new Date().toISOString(),
    withTransaction,
    withClient
  );
  const archiveStore = new PostgresRunArchiveStore(
    env.DVT_PG_SCHEMA,
    withTransaction,
    withClient,
    snapshotStore
  );
  const objectStore = new FileSystemArchiveObjectStore({
    directory: env.DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY,
  });
  const exporter = new ObjectStorageRunArchiveExporter({ objectStore });
  const coordinator = new RunArchiveCoordinator({
    store: archiveStore,
    exporter,
  });
  const policy = {
    hotRetentionDays: env.DVT_RUN_EVENT_RETENTION_HOT_RETENTION_DAYS,
    archiveBucketCount: env.DVT_RUN_EVENT_RETENTION_ARCHIVE_BUCKET_COUNT,
    pinTerminalSnapshots: env.DVT_RUN_EVENT_RETENTION_PIN_TERMINAL_SNAPSHOTS,
  };

  return new RunEventRetentionRuntime(
    async (signal) => {
      activeCycleSignal = signal;
      try {
        return await coordinator.archiveEligibleHotData(policy);
      } finally {
        activeCycleSignal = undefined;
      }
    },
    env.DVT_RUN_EVENT_RETENTION_INTERVAL_MS,
    env.DVT_RUN_EVENT_RETENTION_INITIAL_DELAY_MS,
    logger
  );
}

function createAbortAwareClient(client: PoolClient, signal?: globalThis.AbortSignal): PoolClient {
  if (!signal) {
    return client;
  }

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property !== 'query') {
        return Reflect.get(target, property, receiver);
      }

      return (input: QueryInput, values?: readonly unknown[]) => {
        if (signal.aborted) {
          throw createAbortError('run-event retention cycle aborted');
        }

        if (typeof input === 'string') {
          const queryConfig: QueryConfigWithSignal = {
            text: input,
            ...(values === undefined ? {} : { values }),
            signal,
          };
          return target.query(queryConfig as unknown as Parameters<PoolClient['query']>[0]);
        }

        const queryConfig: QueryConfigWithSignal = {
          ...input,
          signal,
        };
        return target.query(queryConfig as unknown as Parameters<PoolClient['query']>[0]);
      };
    },
  }) as PoolClient;
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

async function executeAbortAwareTransaction<T>(
  client: PoolClient,
  signal: globalThis.AbortSignal | undefined,
  fn: (client: PoolClient) => Promise<T>,
  logger: RunEventRetentionRuntimeLogger
): Promise<T> {
  const abortAwareClient = createAbortAwareClient(client, signal);
  await abortAwareClient.query('BEGIN');
  try {
    const result = await fn(abortAwareClient);
    await abortAwareClient.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error(
        {
          err: rollbackError,
          originalError: error,
        },
        'run event retention rollback failed'
      );
    }
    throw error;
  }
}

export const __internal = {
  createAbortAwareClient,
  executeAbortAwareTransaction,
};
