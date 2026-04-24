/**
 * Owned concern: adapt Temporal runtime configuration into an `IProviderAdapter`.
 *
 * This module is the only protected-runtime provider factory allowed to know
 * how the Temporal adapter package is configured and closed.
 */
import type { ProviderAdapterFactory } from './providerAdapterFactory.js';

export function createTemporalProviderAdapterFactory(): ProviderAdapterFactory {
  return {
    provider: 'temporal',
    async build(context) {
      if (!context.env.TEMPORAL_ADDRESS) {
        return null;
      }

      const { TemporalAdapter, TemporalClientManager, loadTemporalAdapterConfig } =
        await import('@dvt/adapter-temporal');
      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_ADDRESS: context.env.TEMPORAL_ADDRESS,
        TEMPORAL_NAMESPACE: context.env.TEMPORAL_NAMESPACE,
        TEMPORAL_TASK_QUEUE: context.env.TEMPORAL_TASK_QUEUE,
        TEMPORAL_IDENTITY: context.env.TEMPORAL_IDENTITY,
        TEMPORAL_CONNECT_TIMEOUT_MS: context.env.TEMPORAL_CONNECT_TIMEOUT_MS,
        TEMPORAL_REQUEST_TIMEOUT_MS: context.env.TEMPORAL_REQUEST_TIMEOUT_MS,
        TEMPORAL_MAX_START_PAYLOAD_BYTES: context.env.TEMPORAL_MAX_START_PAYLOAD_BYTES,
        TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS:
          context.env.TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS,
      });
      const clientManager = new TemporalClientManager(temporalConfig, context.observability);

      return {
        adapter: new TemporalAdapter({
          clientManager,
          config: temporalConfig,
        }),
        close: () => clientManager.close(),
      };
    },
  };
}
