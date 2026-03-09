import type { ILogger } from '../contracts/ILogger.js';
import {
  NoopCrashWindowTestHook,
  type ICrashWindowTestHook,
} from '../contracts/ICrashWindowTestHook.js';
import type { OutboxWorkerRuntime } from '../runtime/OutboxWorkerRuntime.js';

export interface ProductionWorkerHostDependencies {
  readonly runtime: OutboxWorkerRuntime;
  readonly logger: ILogger;
}

export interface ProductionWorkerHost {
  readonly runtime: OutboxWorkerRuntime;
  readonly crashWindowTestHook: ICrashWindowTestHook;
}

export function createProductionHost(deps: ProductionWorkerHostDependencies): ProductionWorkerHost {
  deps.logger.info('creating production outbox worker host');

  return {
    runtime: deps.runtime,
    crashWindowTestHook: new NoopCrashWindowTestHook(),
  };
}
