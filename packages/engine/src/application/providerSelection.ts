import type { EngineRunRef } from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';

type Provider = EngineRunRef['provider'];

const VALID_PROVIDERS = new Set<Provider>(['temporal', 'conductor', 'mock']);

export function resolveEngineProvider(
  // eslint-disable-next-line no-restricted-syntax -- config injection: callers can override env
  env: Record<string, string | undefined> = process.env,
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
  // eslint-disable-next-line no-restricted-syntax -- config injection: callers can override env
  env: Record<string, string | undefined> = process.env,
  fallback: Provider = 'temporal'
): IProviderAdapter {
  const provider = resolveEngineProvider(env, fallback);
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}
