import { describe, expect, it, vi } from 'vitest';

import { createHttpRuntimeCapabilitiesClient } from './httpRuntimeCapabilitiesClient';

describe('createHttpRuntimeCapabilitiesClient', () => {
  it('loads capabilities through the governed API client without session headers', async () => {
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
    const apiClient = {
      getJson: vi.fn().mockResolvedValue(payload),
    };

    const client = createHttpRuntimeCapabilitiesClient(apiClient as never);

    await expect(client.loadCapabilities()).resolves.toEqual(payload);
    expect(apiClient.getJson).toHaveBeenCalledWith('/capabilities', {
      includeSessionHeaders: false,
    });
  });
});
