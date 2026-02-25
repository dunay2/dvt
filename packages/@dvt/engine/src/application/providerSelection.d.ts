/**
 * @file packages/@dvt/engine/src/application/providerSelection.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Provider selection is resolved in the application layer to keep runtime independence
 * @consequence Engine startup preserves deterministic rules for fallback/override without leaking semantics to the adapter
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { EngineRunRef } from '@dvt/contracts';
import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
type Provider = EngineRunRef['provider'];
export declare function resolveEngineProvider(
  env: Record<string, string | undefined>,
  fallback?: Provider
): Provider;
export declare function buildAdapterRegistry(
  adapters: IProviderAdapter[]
): Map<Provider, IProviderAdapter>;
export declare function pickDefaultAdapter(
  adapters: Map<Provider, IProviderAdapter>,
  env: Record<string, string | undefined>,
  fallback?: Provider
): IProviderAdapter;
export {};
//# sourceMappingURL=providerSelection.d.ts.map
