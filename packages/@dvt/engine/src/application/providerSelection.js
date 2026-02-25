'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.resolveEngineProvider = resolveEngineProvider;
exports.buildAdapterRegistry = buildAdapterRegistry;
exports.pickDefaultAdapter = pickDefaultAdapter;
const VALID_PROVIDERS = new Set(['temporal', 'conductor', 'mock']);
function resolveEngineProvider(env, fallback = 'temporal') {
  const raw = env['ENGINE_PROVIDER']?.trim().toLowerCase();
  if (!raw) return fallback;
  if (VALID_PROVIDERS.has(raw)) return raw;
  throw new Error(`ENGINE_PROVIDER_INVALID: ${raw}`);
}
function buildAdapterRegistry(adapters) {
  const map = new Map();
  for (const a of adapters) {
    if (map.has(a.provider)) {
      throw new Error(`ADAPTER_DUPLICATE_PROVIDER: ${a.provider}`);
    }
    map.set(a.provider, a);
  }
  return map;
}
function pickDefaultAdapter(adapters, env, fallback = 'temporal') {
  const hasEnvOverride = Boolean(env['ENGINE_PROVIDER']?.trim());
  if (hasEnvOverride) {
    const provider = resolveEngineProvider(env, fallback);
    return getRegisteredAdapterOrThrow(adapters, provider);
  }
  return pickFirstAvailableAdapterOrThrow(adapters, fallback);
}
function getRegisteredAdapterOrThrow(adapters, provider) {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}
function pickFirstAvailableAdapterOrThrow(adapters, fallback) {
  const orderedProviders = [fallback, 'temporal', 'conductor', 'mock'];
  for (const provider of orderedProviders) {
    const adapter = adapters.get(provider);
    if (adapter) return adapter;
  }
  throw new Error('No adapters registered');
}
//# sourceMappingURL=providerSelection.js.map
