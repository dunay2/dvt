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
  waitForLoss?(): Promise<void>;
}

interface OwnershipGate {
  acquire(signal: globalThis.AbortSignal): Promise<OwnershipLease | null>;
}

interface HostRunState {
  runtime: RuntimeHandle | null;
  detachShutdownListener(): void;
  detachOwnershipLossListener(): void;
  releaseOwnership(): Promise<void>;
  releaseRuntimeAbortBridge(): void;
}

interface ActiveRuntimeControl {
  signal: globalThis.AbortSignal;
  detachOwnershipLossListener(): void;
  releaseRuntimeAbortBridge(): void;
  throwIfOwnershipLost(): void;
}

export async function runOutboxWorkerHost(options: RunOutboxWorkerHostOptions): Promise<void> {
  const createRuntime = options.createRuntime ?? createOutboxWorkerRuntime;
  const ownershipGate = options.ownershipGate ?? ALWAYS_ACTIVE_OWNERSHIP_GATE;
  const state = createHostRunState();
  let primaryError: Error | null = null;

  try {
    await startOperationalServer(options);

    if (options.env.DVT_OUTBOX_OWNERSHIP_MODE === 'passive') {
      await runPassiveHost(options);
    } else {
      const activeOptions = options as RunOutboxWorkerHostOptions & { env: ActiveEnv };
      await runActiveHost({
        options: activeOptions,
        createRuntime,
        ownershipGate,
        state,
      });
    }
  } catch (error) {
    primaryError = toThrowableError(error);
  }

  const cleanupError = await cleanupHostRun({
    state,
    operationalServer: options.operationalServer,
    logger: options.logger,
    primaryError,
  });
  if (cleanupError !== null) {
    throw cleanupError;
  }

  if (primaryError !== null) {
    throw primaryError;
  }
}

function createHostRunState(): HostRunState {
  return {
    runtime: null,
    detachShutdownListener: (): void => {},
    detachOwnershipLossListener: (): void => {},
    releaseOwnership: async (): Promise<void> => {},
    releaseRuntimeAbortBridge: (): void => {},
  };
}

const ALWAYS_ACTIVE_OWNERSHIP_GATE: OwnershipGate = {
  acquire: async () => ({
    release: async () => {},
  }),
};

async function startOperationalServer(
  options: Pick<RunOutboxWorkerHostOptions, 'env' | 'logger' | 'operationalServer'>
): Promise<void> {
  await options.operationalServer.start();
  options.logger.info(buildBootstrapLogData(options.env), 'outbox worker bootstrapped');
}

function buildBootstrapLogData(env: Env): Record<string, string | number> {
  return {
    ownershipMode: env.DVT_OUTBOX_OWNERSHIP_MODE,
    adminHost: env.DVT_OUTBOX_ADMIN_HOST,
    adminPort: env.DVT_OUTBOX_ADMIN_PORT,
    ...(env.DVT_OUTBOX_OWNERSHIP_MODE === 'active' ? { busMode: env.DVT_OUTBOX_EVENT_BUS_MODE } : {}),
  };
}

async function runPassiveHost(
  options: Pick<RunOutboxWorkerHostOptions, 'monitor' | 'shutdownSignal'>
): Promise<void> {
  options.monitor.enterPassiveMode();
  await waitForAbort(options.shutdownSignal);
}

async function runActiveHost(options: {
  options: RunOutboxWorkerHostOptions & { env: ActiveEnv };
  createRuntime: RuntimeFactory;
  ownershipGate: OwnershipGate;
  state: HostRunState;
}): Promise<void> {
  if (options.options.shutdownSignal.aborted) {
    return;
  }

  const ownershipLease = await acquireOwnershipLease(options);
  if (!ownershipLease) {
    return;
  }

  options.state.releaseOwnership = () => ownershipLease.release();
  options.options.monitor.onOwnershipAcquired();

  const activeRuntime = createActiveRuntimeControl({
    lease: ownershipLease,
    logger: options.options.logger,
    monitor: options.options.monitor,
    shutdownSignal: options.options.shutdownSignal,
  });
  options.state.releaseRuntimeAbortBridge = activeRuntime.releaseRuntimeAbortBridge;
  options.state.detachOwnershipLossListener = activeRuntime.detachOwnershipLossListener;
  options.state.detachShutdownListener = observeShutdownForReadinessWithdrawal(
    options.options.shutdownSignal,
    options.options.monitor
  );

  options.state.runtime = await createRuntimeUntilShutdown({
    createRuntime: options.createRuntime,
    env: options.options.env,
    logger: options.options.logger,
    monitor: options.options.monitor,
    shutdownSignal: activeRuntime.signal,
  });
  if (!options.state.runtime) {
    activeRuntime.throwIfOwnershipLost();
    return;
  }

  await options.state.runtime.start(activeRuntime.signal);
  activeRuntime.throwIfOwnershipLost();
}

async function acquireOwnershipLease(options: {
  options: RunOutboxWorkerHostOptions & { env: ActiveEnv };
  ownershipGate: OwnershipGate;
}): Promise<OwnershipLease | null> {
  const ownershipLease = await options.ownershipGate.acquire(options.options.shutdownSignal);
  if (ownershipLease) {
    return ownershipLease;
  }

  options.options.logger.warn?.(
    { ownershipMode: options.options.env.DVT_OUTBOX_OWNERSHIP_MODE },
    'outbox ownership unavailable; entering passive mode'
  );
  await runPassiveHost(options.options);
  return null;
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

function createLinkedAbortController(signal: globalThis.AbortSignal): {
  controller: AbortController;
  detach(): void;
} {
  const controller = new globalThis.AbortController();
  const onAbort = (): void => {
    signal.removeEventListener('abort', onAbort);
    controller.abort();
  };

  signal.addEventListener('abort', onAbort, { once: true });
  if (signal.aborted) {
    onAbort();
  }

  return {
    controller,
    detach: (): void => {
      signal.removeEventListener('abort', onAbort);
    },
  };
}

function createActiveRuntimeControl(options: {
  lease: OwnershipLease;
  logger: OutboxWorkerRuntimeLogger;
  monitor: Pick<OutboxWorkerMonitor, 'onOwnershipLost'>;
  shutdownSignal: globalThis.AbortSignal;
}): ActiveRuntimeControl {
  const runtimeAbortBridge = createLinkedAbortController(options.shutdownSignal);
  let ownershipLossError: Error | null = null;

  return {
    signal: runtimeAbortBridge.controller.signal,
    releaseRuntimeAbortBridge: runtimeAbortBridge.detach,
    detachOwnershipLossListener: observeOwnershipLoss({
      lease: options.lease,
      logger: options.logger,
      monitor: options.monitor,
      shutdownSignal: options.shutdownSignal,
      onOwnershipLost(error) {
        ownershipLossError ??= error;
        runtimeAbortBridge.controller.abort();
      },
    }),
    throwIfOwnershipLost(): void {
      if (ownershipLossError !== null) {
        throw ownershipLossError;
      }
    },
  };
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

function observeOwnershipLoss(options: {
  lease: OwnershipLease;
  logger: OutboxWorkerRuntimeLogger;
  monitor: Pick<OutboxWorkerMonitor, 'onOwnershipLost'>;
  shutdownSignal: globalThis.AbortSignal;
  onOwnershipLost(error: Error): void;
}): () => void {
  if (!options.lease.waitForLoss) {
    return (): void => {};
  }

  let disposed = false;
  void options.lease.waitForLoss().catch((error) => {
    if (disposed || options.shutdownSignal.aborted) {
      return;
    }

    const ownershipError = toThrowableError(error);
    options.monitor.onOwnershipLost(ownershipError);
    options.logger.error(
      {
        err: toErrorLike(ownershipError),
      },
      'outbox ownership lost; stopping host'
    );
    options.onOwnershipLost(ownershipError);
  });

  return (): void => {
    disposed = true;
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

async function cleanupHostRun(options: {
  state: HostRunState;
  operationalServer: Pick<OperationalServerHandle, 'stop'>;
  logger: OutboxWorkerRuntimeLogger;
  primaryError: Error | null;
}): Promise<Error | null> {
  let cleanupError: Error | null = null;

  options.state.detachShutdownListener();
  options.state.detachOwnershipLossListener();
  options.state.releaseRuntimeAbortBridge();

  try {
    await stopRuntimeAndOperationalServer({
      runtime: options.state.runtime,
      operationalServer: options.operationalServer,
      logger: options.logger,
      primaryError: options.primaryError,
    });
  } catch (error) {
    cleanupError = toThrowableError(error);
  }

  try {
    await releaseOwnershipHandle({
      releaseOwnership: options.state.releaseOwnership,
      logger: options.logger,
      primaryError: options.primaryError,
    });
  } catch (error) {
    cleanupError = appendCleanupError(cleanupError, error);
  }

  return cleanupError;
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
