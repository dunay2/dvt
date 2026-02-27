import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import {
  buildAdapterRegistry,
  pickDefaultAdapter,
  resolveEngineProvider,
} from '../../src/application/providerSelection.js';

function mkAdapter(provider: IProviderAdapter['provider']): IProviderAdapter {
  return {
    provider,
    startRun: async () => {
      throw new Error('not-used');
    },
    cancelRun: async () => {},
    getRunStatus: async () => ({ runId: 'r', status: 'RUNNING' }),
    signal: async () => {},
  };
}

describe('providerSelection', () => {
  it('resolves temporal as default provider when ENGINE_PROVIDER is unset', () => {
    expect(resolveEngineProvider({})).toBe('temporal');
  });

  it('resolves provider from ENGINE_PROVIDER when valid', () => {
    expect(resolveEngineProvider({ ENGINE_PROVIDER: 'mock' })).toBe('mock');
    expect(resolveEngineProvider({ ENGINE_PROVIDER: 'conductor' })).toBe('conductor');
  });

  it('throws on invalid ENGINE_PROVIDER values', () => {
    expect(() => resolveEngineProvider({ ENGINE_PROVIDER: 'k8s' })).toThrow(
      /ENGINE_PROVIDER_INVALID/
    );
  });

  it('builds adapter registry without duplicates', () => {
    const map = buildAdapterRegistry([mkAdapter('temporal'), mkAdapter('mock')]);
    expect(map.size).toBe(2);
    expect(map.get('temporal')?.provider).toBe('temporal');
  });

  it('rejects duplicate providers in adapter registry', () => {
    expect(() => buildAdapterRegistry([mkAdapter('mock'), mkAdapter('mock')])).toThrow(
      /ADAPTER_DUPLICATE_PROVIDER/
    );
  });

  it('picks default adapter using ENGINE_PROVIDER override', () => {
    const adapters = buildAdapterRegistry([
      mkAdapter('temporal'),
      mkAdapter('conductor'),
      mkAdapter('mock'),
    ]);

    const selected = pickDefaultAdapter(adapters, { ENGINE_PROVIDER: 'mock' });
    expect(selected.provider).toBe('mock');
  });

  it('picks fallback adapter when ENGINE_PROVIDER is unset', () => {
    const adapters = buildAdapterRegistry([mkAdapter('mock')]);
    const selected = pickDefaultAdapter(adapters, {}, 'mock');
    expect(selected.provider).toBe('mock');
  });

  it('falls back to first available adapter when fallback provider is not registered', () => {
    const adapters = buildAdapterRegistry([mkAdapter('mock')]);
    const selected = pickDefaultAdapter(adapters, {});
    expect(selected.provider).toBe('mock');
  });

  it('still throws when ENGINE_PROVIDER override targets an unregistered adapter', () => {
    const adapters = buildAdapterRegistry([mkAdapter('mock')]);
    expect(() => pickDefaultAdapter(adapters, { ENGINE_PROVIDER: 'temporal' })).toThrow(
      /No adapter registered for provider: temporal/
    );
  });

  it('throws when no adapters are registered', () => {
    const adapters = buildAdapterRegistry([]);
    expect(() => pickDefaultAdapter(adapters, {})).toThrow(/No adapters registered/);
  });
});
