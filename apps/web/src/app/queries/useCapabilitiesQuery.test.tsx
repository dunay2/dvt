// @vitest-environment jsdom

import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CapabilitiesPort } from '../ports/capabilities';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import { useCapabilitiesQuery } from './useCapabilitiesQuery';

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
      <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
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
});
