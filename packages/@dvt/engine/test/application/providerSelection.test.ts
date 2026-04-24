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
    getProviderStatusView: async () => ({ provider, providerStatus: 'RUNNING' }),
    signal: async () => {},
  };
}

describe('providerSelection', () => {
  it('resolves temporal as default provider when ENGINE_PROVIDER is unset', () => {
    expect(resolveEngineProvider({})).toBe('temporal');
  });

  it('resolves temporal from ENGINE_PROVIDER when valid', () => {
    expect(resolveEngineProvider({ ENGINE_PROVIDER: 'temporal' })).toBe('temporal');
  });

  it('throws on invalid ENGINE_PROVIDER values', () => {
    expect(() => resolveEngineProvider({ ENGINE_PROVIDER: 'conductor' })).toThrow(
      /ENGINE_PROVIDER_INVALID/
    );
  });

  it('builds adapter registry without duplicates', () => {
    const map = buildAdapterRegistry([mkAdapter('temporal')]);
    expect(map.size).toBe(1);
    expect(map.get('temporal')?.provider).toBe('temporal');
  });

  it('rejects duplicate providers in adapter registry', () => {
    expect(() => buildAdapterRegistry([mkAdapter('temporal'), mkAdapter('temporal')])).toThrow(
      /ADAPTER_DUPLICATE_PROVIDER/
    );
  });

  it('picks default adapter using ENGINE_PROVIDER override', () => {
    const adapters = buildAdapterRegistry([mkAdapter('temporal')]);

    const selected = pickDefaultAdapter(adapters, { ENGINE_PROVIDER: 'temporal' });
    expect(selected.provider).toBe('temporal');
  });

  it('still throws when ENGINE_PROVIDER override targets an unregistered adapter', () => {
    const adapters = buildAdapterRegistry([]);
    expect(() => pickDefaultAdapter(adapters, { ENGINE_PROVIDER: 'temporal' })).toThrow(
      /engine\.error\.adapter_not_registered/
    );
  });

  it('throws when no adapters are registered', () => {
    const adapters = buildAdapterRegistry([]);
    expect(() => pickDefaultAdapter(adapters, {})).toThrow(/No adapters registered/);
  });
});
