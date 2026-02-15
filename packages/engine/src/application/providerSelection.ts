import type { EngineRunRef } from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';

type Provider = EngineRunRef['provider'];

const VALID_PROVIDERS = new Set<Provider>(['temporal', 'conductor', 'mock']);

export function resolveEngineProvider(
  env: Record<string, string | undefined>,
  fallback: Provider = 'temporal'
): Provider {
  const raw = env['ENGINE_PROVIDER']?.trim().toLowerCase();
  if (!raw) return fallback;
  if (VALID_PROVIDERS.has(raw as Provider)) return raw as Provider;
  throw new Error(`ENGINE_PROVIDER_INVALID: ${raw}`);
}

export function buildAdapterRegistry(
  adapters: IProviderAdapter[]
): Map<Provider, IProviderAdapter> {
  const map = new Map<Provider, IProviderAdapter>();
  for (const a of adapters) {
    if (map.has(a.provider)) {
      throw new Error(`ADAPTER_DUPLICATE_PROVIDER: ${a.provider}`);
    }
    map.set(a.provider, a);
  }
  return map;
}

export function pickDefaultAdapter(
  adapters: Map<Provider, IProviderAdapter>,
  env: Record<string, string | undefined>,
  fallback: Provider = 'temporal'
): IProviderAdapter {
  const hasEnvOverride = Boolean(env['ENGINE_PROVIDER']?.trim());
  if (hasEnvOverride) {
    const provider = resolveEngineProvider(env, fallback);
    return getRegisteredAdapterOrThrow(adapters, provider);
  }

  return pickFirstAvailableAdapterOrThrow(adapters, fallback);
}

function getRegisteredAdapterOrThrow(
  adapters: Map<Provider, IProviderAdapter>,
  provider: Provider
): IProviderAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}

function pickFirstAvailableAdapterOrThrow(
  adapters: Map<Provider, IProviderAdapter>,
  fallback: Provider
): IProviderAdapter {
  const orderedProviders: readonly Provider[] = [fallback, 'temporal', 'conductor', 'mock'];

  for (const provider of orderedProviders) {
    const adapter = adapters.get(provider);
    if (adapter) return adapter;
  }

  throw new Error('No adapters registered');
}
