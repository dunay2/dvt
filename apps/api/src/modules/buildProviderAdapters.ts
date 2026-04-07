import type {
  EngineRunRef,
  IClock,
  IProviderAdapter,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

import type { Env } from '../plugins/env.js';

export interface BuildProviderAdaptersResult {
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  close: () => Promise<void>;
}

async function closeAllClosers(closers: Array<() => Promise<void>>): Promise<void> {
  const results = await Promise.allSettled(closers.map((closer) => closer()));
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to close provider adapters cleanly');
  }
}

/**
 * Builds the provider adapter map based on environment configuration.
 *
 * Always registers the mock adapter.
 * When TEMPORAL_ADDRESS is set, also registers a TemporalAdapter.
 * Returns a close() function that tears down any live connections (e.g. Temporal client).
 */
export async function buildProviderAdapters(
  env: Env,
  deps: {
    stateStore: Pick<IRunStateStoreRead, 'getRunMetadataByRunId' | 'listEvents'>;
    stateStoreWrite: Pick<IRunStateStoreWrite, 'appendAndEnqueueTx'>;
    clock: Pick<IClock, 'nowIsoUtc'>;
    projector: { rebuild(runId: string, events: unknown[]): unknown };
    observability: IObservability;
  }
): Promise<BuildProviderAdaptersResult> {
  const { MockAdapter } = await import('@dvt/engine/testing');
  const mockAdapter = new MockAdapter({
    stateStore: deps.stateStore as never,
    stateStoreWrite: deps.stateStoreWrite as never,
    clock: deps.clock as never,
    projector: deps.projector as never,
  });

  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([['mock', mockAdapter]]);
  const closers: Array<() => Promise<void>> = [];

  if (env.TEMPORAL_ADDRESS) {
    const { TemporalAdapter, TemporalClientManager, loadTemporalAdapterConfig } =
      await import('@dvt/adapter-temporal');
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
    const clientManager = new TemporalClientManager(temporalConfig, deps.observability);
    const temporalAdapter = new TemporalAdapter({
      clientManager,
      config: temporalConfig,
    });
    adapters.set('temporal', temporalAdapter);
    closers.push(() => clientManager.close());
  }

  return {
    adapters,
    close: async () => {
      await closeAllClosers(closers);
    },
  };
}
