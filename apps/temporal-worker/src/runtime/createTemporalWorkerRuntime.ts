import { PostgresRunStateCommandPortBridge, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import {
  DbtCliPluginRunner,
  assertDbtCliAvailable,
  createDefaultStepActivityRegistry,
  loadTemporalAdapterConfig,
  TemporalWorkerHost,
  type DbtPluginRunner,
  type TemporalAdapterConfig,
  type TemporalWorkerHostConfig,
} from '@dvt/adapter-temporal';
import {
  ArtifactBackedDbtProjectBundleReader,
  ArtifactBackedRunExecutionContextReader,
  type DbtProjectBundleArtifactStore,
  type IDbtProjectBundleReader,
  type IRunExecutionContextReader,
} from '@dvt/artifacts';
import { asIsoUtcString } from '@dvt/contracts';
import { IdempotencyKeyBuilder } from '@dvt/engine';
import { NativeConnection } from '@temporalio/worker';
import type { Logger } from 'pino';

import type { Env } from '../plugins/env.js';

export interface RuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

interface StateStoreLike {
  migrate(): Promise<void>;
  close(): Promise<void>;
  bootstrapRunTx(input: unknown): Promise<unknown>;
  appendAndEnqueueTx(runId: string, events: unknown[]): Promise<unknown>;
  abortPendingOperations?(): void | Promise<void>;
}

interface TemporalConnectionLike {
  close(): Promise<void>;
}

interface TemporalWorkerHostLike {
  start(connection: TemporalConnectionLike): Promise<void>;
  shutdown(): Promise<void>;
}

export interface CreateTemporalWorkerRuntimeOptions {
  stateStoreFactory?: (env: Env) => StateStoreLike;
  runExecutionContextReaderFactory?: (env: Env) => IRunExecutionContextReader;
  bundleReaderFactory?: (env: Env) => IDbtProjectBundleReader;
  dbtPluginRunnerFactory?: (input: {
    env: Env;
    bundleReader: IDbtProjectBundleReader;
  }) => DbtPluginRunner;
  hostFactory?: (config: TemporalWorkerHostConfig) => TemporalWorkerHostLike;
  connectionFactory?: (config: TemporalAdapterConfig) => Promise<TemporalConnectionLike>;
  dbtAvailabilityProbe?: (dbtBin: string) => Promise<void>;
}

export async function createTemporalWorkerRuntime(
  env: Env,
  _logger: Pick<Logger, 'info' | 'error'>,
  options: CreateTemporalWorkerRuntimeOptions = {}
): Promise<RuntimeHandle> {
  const runMigrations = env.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS;
  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_ADDRESS: env.TEMPORAL_ADDRESS,
    TEMPORAL_NAMESPACE: env.TEMPORAL_NAMESPACE,
    TEMPORAL_TASK_QUEUE: env.TEMPORAL_TASK_QUEUE,
    TEMPORAL_IDENTITY: env.TEMPORAL_IDENTITY,
    TEMPORAL_CONNECT_TIMEOUT_MS: env.TEMPORAL_CONNECT_TIMEOUT_MS,
    TEMPORAL_REQUEST_TIMEOUT_MS: env.TEMPORAL_REQUEST_TIMEOUT_MS,
    TEMPORAL_MAX_START_PAYLOAD_BYTES: env.TEMPORAL_MAX_START_PAYLOAD_BYTES,
    TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: env.TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS,
  });

  const stateStore =
    options.stateStoreFactory?.(env) ??
    new PostgresStateStoreAdapter({
      connectionString: env.DATABASE_URL,
      schema: env.DVT_PG_SCHEMA,
      statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
      queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
      assumeSchemaReady: !runMigrations,
    });

  const runExecutionContextReader =
    options.runExecutionContextReaderFactory?.(env) ??
    new ArtifactBackedRunExecutionContextReader({
      nodeEnv: env.NODE_ENV,
    });

  let dbtPluginRunner: DbtPluginRunner | undefined;
  let dbtAvailabilityProbe: (() => Promise<void>) | undefined;
  if (env.DVT_TEMPORAL_DBT_ENABLED) {
    const bundleReader =
      options.bundleReaderFactory?.(env) ??
      new ArtifactBackedDbtProjectBundleReader({
        nodeEnv: env.NODE_ENV,
        bundleStore: resolveDbtBundleArtifactStore(env),
      });

    const availabilityProbe =
      options.dbtAvailabilityProbe ?? ((dbtBin: string) => assertDbtCliAvailable(dbtBin));
    dbtAvailabilityProbe = () => availabilityProbe(env.DVT_DBT_BIN);

    dbtPluginRunner =
      options.dbtPluginRunnerFactory?.({
        env,
        bundleReader,
      }) ??
      new DbtCliPluginRunner({
        bundleReader,
        dbtBin: env.DVT_DBT_BIN,
        workdirRoot: env.DVT_DBT_WORKDIR_ROOT,
      });
  }

  const activityDeps = {
    runStateCommandPort: new PostgresRunStateCommandPortBridge(stateStore as never),
    clock: { nowIsoUtc: () => asIsoUtcString(new Date().toISOString()) },
    idempotency: new IdempotencyKeyBuilder(),
    runExecutionContextReader,
    ...(dbtPluginRunner === undefined ? {} : { dbtPluginRunner }),
  };
  const stepActivitiesByKind = createDefaultStepActivityRegistry({
    runExecutionContextReader,
    ...(dbtPluginRunner === undefined ? {} : { dbtPluginRunner }),
  });

  const host =
    options.hostFactory?.({
      temporalConfig,
      activityDeps,
      stepActivitiesByKind,
    }) ??
    new TemporalWorkerHost({
      temporalConfig,
      activityDeps,
      stepActivitiesByKind,
    });

  let started = false;
  let connection: TemporalConnectionLike | null = null;
  let startPromise: Promise<void> | null = null;
  let stopPromise: Promise<void> | null = null;

  return {
    start: async (signal?: globalThis.AbortSignal) => {
      if (started) {
        return;
      }

      startPromise ??= startTemporalWorkerRuntime({
        runMigrations,
        stateStore,
        host,
        temporalConfig,
        ...(signal ? { signal } : {}),
        ...(dbtAvailabilityProbe ? { dbtAvailabilityProbe } : {}),
        ...(options.connectionFactory ? { connectionFactory: options.connectionFactory } : {}),
        assignConnection: (nextConnection) => {
          connection = nextConnection;
        },
      })
        .then(() => {
          started = true;
        })
        .finally(() => {
          startPromise = null;
        });

      await startPromise;
    },
    stop: async () => {
      const pendingStartup = startPromise;
      stopPromise ??= stopTemporalWorkerRuntime({
        pendingStartup,
        host,
        getConnection: () => connection,
        stateStore,
      }).finally(() => {
        connection = null;
      });
      await stopPromise;
    },
  };
}

function resolveDbtBundleArtifactStore(env: Env): DbtProjectBundleArtifactStore {
  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 's3') {
    return {
      kind: 's3',
      bucket: env.DVT_DBT_BUNDLE_S3_BUCKET as string,
    };
  }

  return {
    kind: 'file',
    rootPath: env.DVT_DBT_BUNDLE_FILE_ROOT as string,
  };
}

async function stopTemporalWorkerRuntime(args: {
  pendingStartup?: Promise<void> | null;
  host: TemporalWorkerHostLike;
  getConnection(): TemporalConnectionLike | null;
  stateStore: StateStoreLike;
}): Promise<void> {
  let firstError: unknown = null;

  if (args.pendingStartup) {
    try {
      await args.pendingStartup;
    } catch {
      // Cleanup should continue even when startup failed or was aborted.
    }
  }

  try {
    await args.host.shutdown();
  } catch (error) {
    firstError ??= error;
  }

  const connection = args.getConnection();
  if (connection !== null) {
    try {
      await connection.close();
    } catch (error) {
      firstError ??= error;
    }
  }

  try {
    await args.stateStore.close();
  } catch (error) {
    firstError ??= error;
  }

  if (firstError !== null) {
    throw firstError;
  }
}

async function startTemporalWorkerRuntime(args: {
  signal?: globalThis.AbortSignal;
  runMigrations: boolean;
  stateStore: StateStoreLike;
  host: TemporalWorkerHostLike;
  temporalConfig: TemporalAdapterConfig;
  dbtAvailabilityProbe?: () => Promise<void>;
  connectionFactory?: (config: TemporalAdapterConfig) => Promise<TemporalConnectionLike>;
  assignConnection(connection: TemporalConnectionLike): void;
}): Promise<void> {
  await throwIfStartupAborted(args.signal, args.stateStore);

  if (args.dbtAvailabilityProbe) {
    await args.dbtAvailabilityProbe();
    await throwIfStartupAborted(args.signal, args.stateStore);
  }

  if (args.runMigrations) {
    await args.stateStore.migrate();
    await throwIfStartupAborted(args.signal, args.stateStore);
  }

  const connection =
    (await args.connectionFactory?.(args.temporalConfig)) ??
    (await NativeConnection.connect({
      address: args.temporalConfig.address,
    }));
  args.assignConnection(connection);
  await throwIfStartupAborted(args.signal, args.stateStore);

  await args.host.start(connection);
  await throwIfStartupAborted(args.signal, args.stateStore);
}

async function throwIfStartupAborted(
  signal: globalThis.AbortSignal | undefined,
  stateStore: StateStoreLike
): Promise<void> {
  if (!signal?.aborted) {
    return;
  }

  await Promise.resolve(stateStore.abortPendingOperations?.());
  throw createAbortError('temporal worker runtime startup aborted');
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}
