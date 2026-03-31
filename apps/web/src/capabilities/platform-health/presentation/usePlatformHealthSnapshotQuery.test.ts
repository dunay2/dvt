import { describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../application/platformHealthCapability';
import { createPlatformHealthSnapshot } from '../testing/platformHealthFixtures';
import {
  createPlatformHealthSnapshotQueryOptions,
  platformHealthQueryKey,
} from './usePlatformHealthSnapshotQuery';

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
