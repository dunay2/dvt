// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import { createPlatformHealthSnapshot } from '../capabilities/platform-health/testing/platformHealthFixtures';
import type { FrontendOperabilitySink } from './ports/frontendOperability';
import { createBrokenRootShellNode } from './Root.bootstrapRoute.test.support';
import { withTestQueryClient } from '../testing/reactQueryHarness';

describe('AppRouteErrorBoundary frontend operability', () => {
  it('records one normalized route failure per boundary activation', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(
      createBrokenRootShellNode(capability, ['/broken'], {
        frontendOperabilitySink: { record },
      })
    );

    try {
      await waitFor(() => {
        expect(record).toHaveBeenCalledWith({
          type: 'frontend.route.failed',
          routeId: 'broken.route',
          reasonCode: 'route-boundary-activated',
        });
      });
      expect(record).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
      await mounted.cleanup();
    }
  });
});
