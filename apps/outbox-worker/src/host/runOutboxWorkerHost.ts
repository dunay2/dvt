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
}

type RuntimeFactory = (
  env: ActiveEnv,
  logger: OutboxWorkerRuntimeLogger,
  options?: CreateOutboxWorkerRuntimeOptions
) => Promise<RuntimeHandle>;

export async function runOutboxWorkerHost(options: RunOutboxWorkerHostOptions): Promise<void> {
  const createRuntime = options.createRuntime ?? createOutboxWorkerRuntime;
  let primaryError: unknown = null;
  let runtime: RuntimeHandle | null = null;

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

    runtime = await createRuntime(options.env, options.logger, {
      observer: options.monitor,
      hooks: options.monitor,
    });
    await runtime.start(options.shutdownSignal);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    await stopRuntimeAndOperationalServer({
      runtime,
      operationalServer: options.operationalServer,
      logger: options.logger,
      primaryError,
    });
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
