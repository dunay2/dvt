import { stopRuntimeAndOperationalServer } from '../lifecycle/stopRuntimeAndOperationalServer.js';
import type { OperationalServerHandle } from '../ops/OperationalServer.js';
import type { OutboxWorkerMonitor } from '../ops/OutboxWorkerMonitor.js';
import type { ActiveEnv, Env } from '../plugins/env.js';
import {
  createOutboxWorkerRuntime,
  type CreateOutboxWorkerRuntimeOptions,
  type RuntimeHandle,
} from '../runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

interface RunOutboxWorkerHostOptions {
  env: Env;
  logger: OutboxWorkerRuntimeLogger;
  monitor: OutboxWorkerMonitor;
  operationalServer: Pick<OperationalServerHandle, 'start' | 'stop'>;
  shutdownSignal: globalThis.AbortSignal;
  createRuntime?: RuntimeFactory;
  ownershipGate?: OwnershipGate;
}

type RuntimeFactory = (
  env: ActiveEnv,
  logger: OutboxWorkerRuntimeLogger,
  options?: CreateOutboxWorkerRuntimeOptions
) => Promise<RuntimeHandle>;

interface OwnershipLease {
  release(): Promise<void>;
}

interface OwnershipGate {
  acquire(signal: globalThis.AbortSignal): Promise<OwnershipLease | null>;
}

export async function runOutboxWorkerHost(options: RunOutboxWorkerHostOptions): Promise<void> {
  const createRuntime = options.createRuntime ?? createOutboxWorkerRuntime;
  const ownershipGate = options.ownershipGate ?? ALWAYS_ACTIVE_OWNERSHIP_GATE;
  let primaryError: Error | null = null;
  let cleanupError: Error | null = null;
  let runtime: RuntimeHandle | null = null;
  let detachShutdownListener = (): void => {};
  let releaseOwnership = async (): Promise<void> => {};

  try {
    await options.operationalServer.start();
    options.logger.info(
      {
        ownershipMode: options.env.DVT_OUTBOX_OWNERSHIP_MODE,
        adminHost: options.env.DVT_OUTBOX_ADMIN_HOST,
        adminPort: options.env.DVT_OUTBOX_ADMIN_PORT,
        ...(options.env.DVT_OUTBOX_OWNERSHIP_MODE === 'active'
          ? { busMode: options.env.DVT_OUTBOX_EVENT_BUS_MODE }
          : {}),
      },
      'outbox worker bootstrapped'
    );

    if (options.env.DVT_OUTBOX_OWNERSHIP_MODE === 'passive') {
      options.monitor.enterPassiveMode();
      await waitForAbort(options.shutdownSignal);
      return;
    }

    if (options.shutdownSignal.aborted) {
      return;
    }

    const ownershipLease = await ownershipGate.acquire(options.shutdownSignal);
    if (!ownershipLease) {
      options.logger.warn?.(
        { ownershipMode: options.env.DVT_OUTBOX_OWNERSHIP_MODE },
        'outbox ownership unavailable; entering passive mode'
      );
      options.monitor.enterPassiveMode();
      await waitForAbort(options.shutdownSignal);
      return;
    }
    releaseOwnership = () => ownershipLease.release();
    options.monitor.onOwnershipAcquired();

    detachShutdownListener = observeShutdownForReadinessWithdrawal(
      options.shutdownSignal,
      options.monitor
    );

    runtime = await createRuntimeUntilShutdown({
      createRuntime,
      env: options.env,
      logger: options.logger,
      monitor: options.monitor,
      shutdownSignal: options.shutdownSignal,
    });
    if (!runtime) {
      return;
    }
    await runtime.start(options.shutdownSignal);
  } catch (error) {
    primaryError = toThrowableError(error);
  } finally {
    detachShutdownListener();

    try {
      await stopRuntimeAndOperationalServer({
        runtime,
        operationalServer: options.operationalServer,
        logger: options.logger,
        primaryError,
      });
    } catch (error) {
      cleanupError = toThrowableError(error);
    }

    try {
      await releaseOwnershipHandle({
        releaseOwnership,
        logger: options.logger,
        primaryError,
      });
    } catch (error) {
      cleanupError = appendCleanupError(cleanupError, error);
    }
  }

  if (cleanupError !== null) {
    throw cleanupError;
  }

  if (primaryError !== null) {
    throw primaryError;
  }
}

const ALWAYS_ACTIVE_OWNERSHIP_GATE: OwnershipGate = {
  acquire: async () => ({
    release: async () => {},
  }),
};

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

function observeShutdownForReadinessWithdrawal(
  signal: globalThis.AbortSignal,
  monitor: Pick<OutboxWorkerMonitor, 'onStopping'>
): () => void {
  const onAbort = (): void => {
    signal.removeEventListener('abort', onAbort);
    monitor.onStopping();
  };

  signal.addEventListener('abort', onAbort, { once: true });
  if (signal.aborted) {
    onAbort();
  }

  return (): void => {
    signal.removeEventListener('abort', onAbort);
  };
}

async function createRuntimeUntilShutdown(options: {
  createRuntime: RuntimeFactory;
  env: ActiveEnv;
  logger: OutboxWorkerRuntimeLogger;
  monitor: OutboxWorkerMonitor;
  shutdownSignal: globalThis.AbortSignal;
}): Promise<RuntimeHandle | null> {
  if (options.shutdownSignal.aborted) {
    return null;
  }

  const runtimePromise = options
    .createRuntime(options.env, options.logger, {
      observer: options.monitor,
      hooks: options.monitor,
      shutdownSignal: options.shutdownSignal,
    })
    .then(async (runtime) => {
      if (!options.shutdownSignal.aborted) {
        return runtime;
      }

      await safelyStopRuntimeAfterLateBootstrap(runtime, options.logger);
      return null;
    })
    .catch((error) => {
      if (options.shutdownSignal.aborted && isAbortError(error)) {
        return null;
      }
      throw error;
    });

  return Promise.race([runtimePromise, waitForAbort(options.shutdownSignal).then(() => null)]);
}

async function safelyStopRuntimeAfterLateBootstrap(
  runtime: RuntimeHandle,
  logger: OutboxWorkerRuntimeLogger
): Promise<void> {
  try {
    await runtime.stop();
  } catch (error) {
    logger.warn?.(
      { err: toErrorLike(error) },
      'outbox runtime cleanup failed after shutdown during bootstrap'
    );
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function toErrorLike(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error), name: 'UnknownError' };
}

async function releaseOwnershipHandle(options: {
  releaseOwnership: () => Promise<void>;
  logger: OutboxWorkerRuntimeLogger;
  primaryError: unknown;
}): Promise<void> {
  try {
    await options.releaseOwnership();
  } catch (error) {
    if (options.primaryError !== null) {
      options.logger.warn?.(
        { err: toErrorLike(error) },
        'outbox ownership release failed during cleanup'
      );
      return;
    }

    throw error;
  }
}

function appendCleanupError(current: Error | null, next: unknown): Error {
  if (current === null) {
    return toThrowableError(next);
  }

  return new AggregateError(
    [...toCleanupErrorList(current), ...toCleanupErrorList(next)],
    'outbox worker cleanup failed'
  );
}

function toCleanupErrorList(error: unknown): unknown[] {
  if (error instanceof AggregateError) {
    return Array.from(error.errors);
  }

  return [toThrowableError(error)];
}

function toThrowableError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
