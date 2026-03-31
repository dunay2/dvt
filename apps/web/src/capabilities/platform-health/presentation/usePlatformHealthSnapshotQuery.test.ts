// @vitest-environment jsdom

import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../application/platformHealthCapability';
import { createPlatformHealthSnapshot } from '../testing/platformHealthFixtures';
import {
  createPlatformHealthSnapshotQueryOptions,
  platformHealthQueryKey,
  usePlatformHealthSnapshotQuery,
} from './usePlatformHealthSnapshotQuery';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';

describe('createPlatformHealthSnapshotQueryOptions', () => {
  it('builds stable query options around the injected capability', async () => {
    const snapshot = createPlatformHealthSnapshot();
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(snapshot),
    };

    const options = createPlatformHealthSnapshotQueryOptions(capability);

    expect(options.queryKey).toEqual(platformHealthQueryKey);
    expect(options.refetchInterval).toBe(15_000);
    expect(options.staleTime).toBe(5_000);
    expect(options.retry).toBe(1);
    await expect(options.queryFn()).resolves.toEqual(snapshot);
    expect(capability.loadSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe('usePlatformHealthSnapshotQuery', () => {
  it('resolves the injected capability inside a QueryClient boundary', async () => {
    const snapshot = createPlatformHealthSnapshot();
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(snapshot),
    };
    let observedState: ReturnType<typeof usePlatformHealthSnapshotQuery> | undefined;

    function Probe(): null {
      observedState = usePlatformHealthSnapshotQuery(capability);
      return null;
    }

    const mounted = await withTestQueryClient(createElement(Probe));

    try {
      await waitForReactQuery(() => observedState?.status === 'success', {
        description: 'platform health success state',
      });

      expect(observedState?.data).toEqual(snapshot);
      expect(observedState?.isSuccess).toBe(true);
      expect(capability.loadSnapshot).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it('supports custom advancement when the query resolves asynchronously', async () => {
    const snapshot = createPlatformHealthSnapshot();
    let releaseSnapshot: (() => void) | undefined;
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseSnapshot = () => resolve(snapshot);
          })
      ),
    };
    let observedState: ReturnType<typeof usePlatformHealthSnapshotQuery> | undefined;

    function Probe(): null {
      observedState = usePlatformHealthSnapshotQuery(capability);
      return null;
    }

    const mounted = await withTestQueryClient(createElement(Probe));

    try {
      await waitForReactQuery(() => observedState?.status === 'success', {
        advance: () => {
          releaseSnapshot?.();
        },
        description: 'platform health controlled success state',
        intervalMs: 1,
        timeoutMs: 500,
      });

      expect(observedState?.data).toEqual(snapshot);
      expect(observedState?.isSuccess).toBe(true);
      expect(capability.loadSnapshot).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });
});
