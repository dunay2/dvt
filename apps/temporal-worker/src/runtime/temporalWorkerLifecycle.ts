/**
 * @ownedConcern Execute Temporal worker startup, shutdown, connection, and abort lifecycle.
 */
import type { TemporalAdapterConfig } from '@dvt/adapter-temporal';
import { NativeConnection } from '@temporalio/worker';

import type {
  StateStoreLike,
  TemporalConnectionLike,
  TemporalWorkerHostLike,
} from './runtimeTypes.js';

export interface StartTemporalWorkerRuntimeArgs {
  signal?: globalThis.AbortSignal;
  runMigrations: boolean;
  stateStore: StateStoreLike;
  host: TemporalWorkerHostLike;
  temporalConfig: TemporalAdapterConfig;
  dbtAvailabilityProbe?: () => Promise<void>;
  connectionFactory?: (config: TemporalAdapterConfig) => Promise<TemporalConnectionLike>;
  assignConnection(connection: TemporalConnectionLike): void;
}

export interface StopTemporalWorkerRuntimeArgs {
  pendingStartup?: Promise<void> | null;
  host: TemporalWorkerHostLike;
  getConnection(): TemporalConnectionLike | null;
  stateStore: StateStoreLike;
  closePlanStore?: () => Promise<void>;
}

export async function startTemporalWorkerRuntime(
  args: StartTemporalWorkerRuntimeArgs
): Promise<void> {
  await throwIfStartupAborted(args.signal, args.stateStore);

  if (args.dbtAvailabilityProbe !== undefined) {
    await args.dbtAvailabilityProbe();
    await throwIfStartupAborted(args.signal, args.stateStore);
  }

  if (args.runMigrations) {
    await args.stateStore.migrate();
    await throwIfStartupAborted(args.signal, args.stateStore);
  }

  const connection =
    args.connectionFactory === undefined
      ? await NativeConnection.connect({
          address: args.temporalConfig.connection.address,
        })
      : await args.connectionFactory(args.temporalConfig);
  args.assignConnection(connection);
  await throwIfStartupAborted(args.signal, args.stateStore);

  await args.host.start(connection);
  await throwIfStartupAborted(args.signal, args.stateStore);
}

export async function stopTemporalWorkerRuntime(
  args: StopTemporalWorkerRuntimeArgs
): Promise<void> {
  await awaitPendingStartupCompletion(args.pendingStartup);

  let firstError: unknown = null;
  const captureFirstError = (error: unknown): void => {
    firstError ??= error;
  };

  await runCleanupStep(async () => args.host.shutdown(), captureFirstError);

  const connection = args.getConnection();
  await runCleanupStep(
    connection === null ? undefined : async () => connection.close(),
    captureFirstError
  );
  await runCleanupStep(async () => args.stateStore.close(), captureFirstError);
  await runCleanupStep(args.closePlanStore, captureFirstError);

  if (firstError !== null) {
    throw firstError;
  }
}

async function awaitPendingStartupCompletion(
  pendingStartup: Promise<void> | null | undefined
): Promise<void> {
  if (!pendingStartup) {
    return;
  }

  try {
    await pendingStartup;
  } catch {
    // Cleanup should continue even when startup failed or was aborted.
  }
}

async function runCleanupStep(
  step: (() => Promise<void>) | undefined,
  onError: (error: unknown) => void
): Promise<void> {
  if (!step) {
    return;
  }

  try {
    await step();
  } catch (error) {
    onError(error);
  }
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
