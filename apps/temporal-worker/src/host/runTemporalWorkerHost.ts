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

  try {
    await options.operationalServer.start();
    if (options.shutdownSignal.aborted) {
      return;
    }

    runtime = await createRuntime(options.env, options.logger);
    if (options.shutdownSignal.aborted) {
      return;
    }

    await runtime.start(options.shutdownSignal);
    if (options.shutdownSignal.aborted) {
      return;
    }

    options.monitor.onStarted();
    await waitForAbort(options.shutdownSignal);
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
    }

    try {
      await options.operationalServer.stop();
    } catch (error) {
      cleanupError = appendCleanupError(cleanupError, error);
    }

    options.monitor.onStopped();
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

async function waitForAbort(signal: globalThis.AbortSignal): Promise<void> {
  if (signal.aborted) {
    return;
  }

  await new Promise<void>((resolve) => {
    const onAbort = (): void => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    };

    signal.addEventListener('abort', onAbort, { once: true });
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
