/**
 * @ownedConcern Own runtime handle idempotency and delegate lifecycle operations.
 */
import type {
  CreateTemporalWorkerRuntimeOptions,
  RuntimeHandle,
  TemporalConnectionLike,
  TemporalWorkerHostLike,
  TemporalWorkerRuntimeResources,
} from './runtimeTypes.js';
import {
  startTemporalWorkerRuntime,
  stopTemporalWorkerRuntime,
} from './temporalWorkerLifecycle.js';

interface CreateTemporalWorkerRuntimeHandleArgs {
  resources: TemporalWorkerRuntimeResources;
  host: TemporalWorkerHostLike;
  connectionFactory?: CreateTemporalWorkerRuntimeOptions['connectionFactory'];
}

export function createTemporalWorkerRuntimeHandle(
  args: CreateTemporalWorkerRuntimeHandleArgs
): RuntimeHandle {
  const { host, resources } = args;
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
        runMigrations: resources.runMigrations,
        stateStore: resources.stateStore,
        host,
        temporalConfig: resources.temporalConfig,
        ...(signal === undefined ? {} : { signal }),
        ...(resources.dbtAvailabilityProbe === undefined
          ? {}
          : { dbtAvailabilityProbe: resources.dbtAvailabilityProbe }),
        ...(args.connectionFactory === undefined
          ? {}
          : { connectionFactory: args.connectionFactory }),
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
      const closePlanStore = resources.planStore.close;
      stopPromise ??= stopTemporalWorkerRuntime({
        pendingStartup,
        host,
        getConnection: () => connection,
        stateStore: resources.stateStore,
        ...(closePlanStore === undefined
          ? {}
          : { closePlanStore: () => closePlanStore.call(resources.planStore) }),
      }).finally(() => {
        connection = null;
      });
      await stopPromise;
    },
    getRunStateCircuitSnapshot: () => resources.runStateCircuit.getSnapshot(),
  };
}
