/**
 * Owned concern: build the live provider-adapter map for the protected runtime
 * component from explicit provider-adapter factories.
 */
import type { EngineRunRef, IProviderAdapter } from '@dvt/engine';

import type { Env } from '../plugins/env.js';

import type {
  ProviderAdapterFactory,
  ProviderAdapterFactoryContext,
} from './providerAdapters/providerAdapterFactory.js';

export interface BuildProviderAdaptersResult {
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  close: () => Promise<void>;
}

export type BuildProviderAdaptersDeps = Omit<ProviderAdapterFactoryContext, 'env'>;

async function closeAllClosers(closers: Array<() => Promise<void>>): Promise<void> {
  const results = await Promise.allSettled(closers.map((closer) => closer()));
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to close provider adapters cleanly');
  }
}

export async function buildProviderAdapters(
  env: Env,
  deps: BuildProviderAdaptersDeps,
  factories: readonly ProviderAdapterFactory[]
): Promise<BuildProviderAdaptersResult> {
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>();
  const closers: Array<() => Promise<void>> = [];
  const context = { env, ...deps } satisfies ProviderAdapterFactoryContext;

  for (const factory of factories) {
    if (adapters.has(factory.provider)) {
      throw new Error(`Duplicate provider adapter factory registered: ${factory.provider}`);
    }

    const registration = await factory.build(context);
    if (registration === null) {
      continue;
    }

    adapters.set(factory.provider, registration.adapter);
    if (registration.close !== undefined) {
      closers.push(registration.close);
    }
  }

  return {
    adapters,
    close: async () => {
      await closeAllClosers(closers);
    },
  };
}
