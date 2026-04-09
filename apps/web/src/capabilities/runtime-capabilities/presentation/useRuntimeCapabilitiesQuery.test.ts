// @vitest-environment jsdom

import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../../app/queries/queryKeys';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { RuntimeCapabilitiesCapabilityApi } from '../application/runtimeCapabilitiesCapability';
import {
  createRuntimeCapabilitiesQueryOptions,
  isPluginAvailableFromCapabilities,
  useRuntimeCapabilitiesQuery,
} from './useRuntimeCapabilitiesQuery';

describe('createRuntimeCapabilitiesQueryOptions', () => {
  it('builds stable query options around the injected capability', async () => {
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
    const capability: RuntimeCapabilitiesCapabilityApi = {
      loadCapabilities: vi.fn().mockResolvedValue(payload),
    };

    const options = createRuntimeCapabilitiesQueryOptions(capability);

    expect(options.queryKey).toEqual(queryKeys.shell.capabilities());
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(60_000);
    await expect(options.queryFn()).resolves.toEqual(payload);
    expect(capability.loadCapabilities).toHaveBeenCalledTimes(1);
  });
});

describe('useRuntimeCapabilitiesQuery', () => {
  it('resolves the injected capability inside a QueryClient boundary', async () => {
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
    const capability: RuntimeCapabilitiesCapabilityApi = {
      loadCapabilities: vi.fn().mockResolvedValue(payload),
    };
    let observedState: ReturnType<typeof useRuntimeCapabilitiesQuery> | undefined;

    function Probe(): null {
      observedState = useRuntimeCapabilitiesQuery(capability);
      return null;
    }

    const mounted = await withTestQueryClient(createElement(Probe));

    try {
      await waitForReactQuery(() => observedState?.status === 'success', {
        description: 'runtime capabilities success state',
      });

      expect(observedState?.data).toEqual(payload);
      expect(observedState?.isSuccess).toBe(true);
      expect(capability.loadCapabilities).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });
});

describe('isPluginAvailableFromCapabilities', () => {
  it('fails open when the backend did not report a plugin', () => {
    expect(isPluginAvailableFromCapabilities(undefined, 'cost')).toBe(true);
    expect(
      isPluginAvailableFromCapabilities(
        {
          apiVersion: '0.1.0',
          minFrontendVersion: '0.1.0',
          plugins: {},
        },
        'cost'
      )
    ).toBe(true);
  });

  it('returns false only when the backend explicitly marks a plugin unavailable', () => {
    expect(
      isPluginAvailableFromCapabilities(
        {
          apiVersion: '0.1.0',
          minFrontendVersion: '0.1.0',
          plugins: {
            cost: {
              available: false,
              reason: 'Backend cost capability is not implemented yet',
            },
          },
        },
        'cost'
      )
    ).toBe(false);
  });
});
