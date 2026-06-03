/**
 * @ownedConcern Resolve engine provider ids against the active adapter registry.
 *
 * @file packages/@dvt/engine/src/application/providerSelection.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Provider selection is resolved in the application layer to keep runtime independence
 * @consequence Engine startup preserves deterministic rules for fallback/override without leaking semantics to the adapter
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { EngineRunRef, ResolvedRunContext } from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import { AdapterNotRegisteredError } from '../contracts/errors.js';

type Provider = EngineRunRef['provider'];

const VALID_PROVIDERS = new Set<Provider>(['temporal']);

export interface IEngineProviderResolver {
  resolve(provider: Provider): IProviderAdapter;
  resolveContextTarget(context: Pick<ResolvedRunContext, 'targetAdapter'>): IProviderAdapter;
  resolveProviderRef(providerRef: Pick<EngineRunRef, 'provider'>): IProviderAdapter;
}

export class MapBackedEngineProviderResolver implements IEngineProviderResolver {
  constructor(private readonly adapters: ReadonlyMap<Provider, IProviderAdapter>) {}

  resolve(provider: Provider): IProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new AdapterNotRegisteredError(provider);
    }
    return adapter;
  }

  resolveContextTarget(context: Pick<ResolvedRunContext, 'targetAdapter'>): IProviderAdapter {
    return this.resolve(context.targetAdapter);
  }

  resolveProviderRef(providerRef: Pick<EngineRunRef, 'provider'>): IProviderAdapter {
    return this.resolve(providerRef.provider);
  }
}

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
    return new MapBackedEngineProviderResolver(adapters).resolve(provider);
  }

  return pickFirstAvailableAdapterOrThrow(adapters, fallback);
}

function pickFirstAvailableAdapterOrThrow(
  adapters: Map<Provider, IProviderAdapter>,
  fallback: Provider
): IProviderAdapter {
  const orderedProviders: readonly Provider[] = [fallback, 'temporal'];

  for (const provider of orderedProviders) {
    const adapter = adapters.get(provider);
    if (adapter) return adapter;
  }

  throw new Error('No adapters registered');
}
