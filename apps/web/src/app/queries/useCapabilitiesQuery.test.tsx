// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CapabilitiesPort } from '../ports/capabilities';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import { queryKeys } from './queryKeys';
import { createCapabilitiesQueryOptions, useCapabilitiesQuery } from './useCapabilitiesQuery';

describe('useCapabilitiesQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires the app services provider so the capabilities seam stays composition-owned', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let observedError: unknown;

    function Probe(): null {
      useCapabilitiesQuery();
      return null;
    }

    await expect(async () => {
      try {
        await withTestQueryClient(createElement(Probe));
      } catch (error) {
        observedError = error;
        throw error;
      }
    }).rejects.toThrow(/AppServicesProvider is required/i);

    expect(observedError).toBeInstanceOf(Error);
  });

  it('resolves capabilities through the injected capabilities port override', async () => {
    const payload = {
      apiVersion: '1.2.3',
      minFrontendVersion: '1.0.0',
      plugins: {
        cost: {
          available: true,
        },
      },
    };
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue(payload),
    };
    let observedState: ReturnType<typeof useCapabilitiesQuery> | undefined;

    function Probe(): null {
      observedState = useCapabilitiesQuery();
      return null;
    }

    const mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ ...createAppServicesTestOverrides(), capabilitiesPort }}>
        <Probe />
      </AppServicesProvider>
    );

    try {
      await waitForReactQuery(() => observedState?.status === 'success', {
        description: 'capabilities query success state',
      });

      expect(observedState?.data).toEqual(payload);
      expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it('owns the runtime capability cache policy around the injected port', async () => {
    const payload = {
      apiVersion: '1.2.3',
      minFrontendVersion: '1.0.0',
      plugins: {},
    };
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue(payload),
    };

    const options = createCapabilitiesQueryOptions(capabilitiesPort);

    expect(options.queryKey).toEqual(queryKeys.shell.capabilities());
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(60_000);
    await expect(options.queryFn()).resolves.toEqual(payload);
    expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
  });
});
