import { describe, expect, it, vi } from 'vitest';

import { createPlatformHealthSnapshot } from '../testing/platformHealthFixtures';
import { createPlatformHealthCapability } from './platformHealthCapability';

describe('createPlatformHealthCapability', () => {
  it('delegates snapshot loading to the injected reader', async () => {
    const snapshot = createPlatformHealthSnapshot();
    const reader = {
      loadSnapshot: vi.fn().mockResolvedValue(snapshot),
    };

    const capability = createPlatformHealthCapability(reader);

    await expect(capability.loadSnapshot()).resolves.toEqual(snapshot);
    expect(reader.loadSnapshot).toHaveBeenCalledTimes(1);
  });
});
