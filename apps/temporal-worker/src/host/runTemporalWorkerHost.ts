import type { TemporalWorkerRunResult } from '@dvt/adapter-temporal';
import type { Logger } from 'pino';

import type { OperationalServerHandle } from '../ops/OperationalServer.js';
import type { TemporalWorkerMonitor } from '../ops/TemporalWorkerMonitor.js';
import type { Env } from '../plugins/env.js';
import {
  createTemporalWorkerRuntime,
  type CreateTemporalWorkerRuntimeOptions,
  type RuntimeHandle,
} from '../runtime/createTemporalWorkerRuntime.js';

interface RunTemporalWorkerHostOptions {
  env: Env;
  logger: Pick<Logger, 'info' | 'error'>;
  monitor: TemporalWorkerMonitor;
  operationalServer: Pick<OperationalServerHandle, 'start' | 'stop'>;
  shutdownSignal: globalThis.AbortSignal;
  createRuntime?: (
    env: Env,
    logger: Pick<Logger, 'info' | 'error'>,
    options?: CreateTemporalWorkerRuntimeOptions
  ) => Promise<RuntimeHandle>;
}

export async function runTemporalWorkerHost(options: RunTemporalWorkerHostOptions): Promise<void> {
  const createRuntime = options.createRuntime ?? createTemporalWorkerRuntime;
  options.monitor.onStarting();

  let runtime: RuntimeHandle | null = null;
  let primaryError: Error | null = null;
  let cleanupError: Error | null = null;
  let terminalResultObserved = false;

  function observeRunResult(result: TemporalWorkerRunResult | null): void {
    if (result === null || terminalResultObserved) return;
    terminalResultObserved = true;
    if (result.status === 'failed') {
      const error = toThrowableError(result.error);
      primaryError =
        primaryError === null
          ? error
          : new AggregateError([primaryError, error], 'temporal worker failed');
      options.monitor.onError(error);
    }
  }

  try {
    await options.operationalServer.start();
    if (!options.shutdownSignal.aborted) {
      runtime = await createRuntime(options.env, options.logger);
      const runtimeHandle = runtime;
      options.monitor.setRunStateCircuitSnapshotProvider(() =>
        runtimeHandle.getRunStateCircuitSnapshot()
      );
      if (!options.shutdownSignal.aborted) {
        observeRunResult(await startAndWait(runtime, options.monitor, options.shutdownSignal));
      }
    }
  } catch (error) {
    primaryError = toThrowableError(error);
    if (!(options.shutdownSignal.aborted && isAbortError(primaryError))) {
      options.monitor.onError(primaryError);
    } else {
      primaryError = null;
    }
  } finally {
    options.monitor.onStopping();

    if (runtime !== null) {
      try {
        await runtime.stop();
      } catch (error) {
        cleanupError = toThrowableError(error);
      }
      // Startup may be cancelled after the SDK run began. Stop joins that run;
      // a failed stop must not make us wait indefinitely for an unsettled run.
      const completion = runtime.getRunCompletion();
      if (completion !== null) observeRunResult(await getSettledRunResult(completion));
    }

    try {
      await options.operationalServer.stop();
    } catch (error) {
      cleanupError = appendCleanupError(cleanupError, error);
    }

    options.monitor.onStopped();
    options.monitor.setRunStateCircuitSnapshotProvider(null);
  }

  if (cleanupError !== null) {
    if (primaryError !== null) {
      throw new AggregateError([primaryError, cleanupError], 'temporal worker shutdown failed');
    }
    throw cleanupError;
  }

  if (primaryError !== null) {
    throw primaryError;
  }
}

async function startAndWait(
  runtime: RuntimeHandle,
  monitor: TemporalWorkerMonitor,
  signal: globalThis.AbortSignal
): Promise<TemporalWorkerRunResult | null> {
  await runtime.start(signal);
  const completion = runtime.getRunCompletion();
  if (completion === null) throw new Error('TEMPORAL_WORKER_RUN_NOT_STARTED');
  const settledResult = await getSettledRunResult(completion);
  if (settledResult !== null) return settledResult;
  if (signal.aborted) return null;
  monitor.onStarted();
  return waitForRunOrAbort(completion, signal);
}

async function getSettledRunResult(
  completion: Promise<TemporalWorkerRunResult>
): Promise<TemporalWorkerRunResult | null> {
  return Promise.race([completion, Promise.resolve(null)]);
}

async function waitForRunOrAbort(
  completion: Promise<TemporalWorkerRunResult>,
  signal: globalThis.AbortSignal
): Promise<TemporalWorkerRunResult | null> {
  if (signal.aborted) {
    return null;
  }

  return new Promise<TemporalWorkerRunResult | null>((resolve) => {
    const settle = (result: TemporalWorkerRunResult | null): void => {
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = (): void => settle(null);
    signal.addEventListener('abort', onAbort, { once: true });
    void completion.then(settle);
    if (signal.aborted) {
      onAbort();
    }
  });
}

function appendCleanupError(current: Error | null, next: unknown): Error {
  if (current === null) {
    return toThrowableError(next);
  }

  return new AggregateError([current, toThrowableError(next)], 'temporal worker cleanup failed');
}

function toThrowableError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : 'UnknownError');
}

function isAbortError(error: Error): boolean {
  return error.name === 'AbortError';
}
