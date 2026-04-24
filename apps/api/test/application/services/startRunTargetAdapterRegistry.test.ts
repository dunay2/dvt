import { describe, expect, it } from 'vitest';

import { createStartRunTargetAdapterRegistryFromValues } from '../../../src/application/services/startRunTargetAdapterRegistry.js';

describe('createStartRunTargetAdapterRegistryFromValues', () => {
  it('keeps only supported startRun adapters from values', () => {
    const registry = createStartRunTargetAdapterRegistryFromValues(['mock', 'temporal', 'conductor']);

    expect(registry.listSupported()).toEqual(['temporal']);
    expect(registry.isSupported('mock')).toBe(false);
    expect(registry.isSupported('temporal')).toBe(true);
    expect(registry.isSupported('conductor')).toBe(false);
  });

  it('returns empty list when no startRun-capable adapters are present', () => {
    const registry = createStartRunTargetAdapterRegistryFromValues(['conductor', 'other']);

    expect(registry.listSupported()).toEqual([]);
    expect(registry.isSupported('mock')).toBe(false);
  });
});
