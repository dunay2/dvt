import { describe, expect, it, vi } from 'vitest';

import { createRuntimeCapabilitiesCapability } from './runtimeCapabilitiesCapability';

describe('createRuntimeCapabilitiesCapability', () => {
  it('delegates capability loading to the injected reader', async () => {
    const payload = {
      apiVersion: '0.1.0',
      minFrontendVersion: '0.1.0',
      plugins: {
        cost: {
          available: false,
          reason: 'Backend cost capability is not implemented yet',
        },
      },
    };
    const reader = {
      loadCapabilities: vi.fn().mockResolvedValue(payload),
    };

    const capability = createRuntimeCapabilitiesCapability(reader);

    await expect(capability.loadCapabilities()).resolves.toEqual(payload);
    expect(reader.loadCapabilities).toHaveBeenCalledTimes(1);
  });
});
