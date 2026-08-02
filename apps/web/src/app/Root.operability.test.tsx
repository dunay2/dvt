// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import {
  createHealthzProbe,
  createPlatformHealthSnapshot,
} from '../capabilities/platform-health/testing/platformHealthFixtures';
import type { FrontendOperabilitySink } from './ports/frontendOperability';
import type { CapabilitiesPort } from './ports/capabilities';
import { queryKeys } from './queries/queryKeys';
import { createRootShellNode } from './Root.bootstrapRoute.test.support';
import { resetRootShellStores } from './Root.test.support';
import { withTestQueryClient } from '../testing/reactQueryHarness';

describe('RootShell frontend operability', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRootShellStores();
  });

  it('records a capabilities bootstrap failure once', async () => {
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockRejectedValue(new Error('private upstream detail')),
    };
    const healthCapability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(
      createRootShellNode(healthCapability, ['/'], capabilitiesPort, <div>Canvas route</div>, {
        frontendOperabilitySink: { record },
      })
    );

    try {
      await waitFor(() => {
        expect(record).toHaveBeenCalledWith({
          type: 'frontend.bootstrap.failed',
          phase: 'capabilities',
          reasonCode: 'capabilities-query-failed',
        });
      });
      expect(record).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it('records a degraded surface transition once across equal refetches', async () => {
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const degradedSnapshot = createPlatformHealthSnapshot({
      healthz: createHealthzProbe({
        data: {
          ok: true,
          status: 'degraded',
          components: {
            intentReconciler: {
              status: 'degraded',
              reasonCode: 'runtime_unavailable',
            },
          },
        },
      }),
    });
    const healthCapability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(degradedSnapshot),
    };
    const mounted = await withTestQueryClient(
      createRootShellNode(healthCapability, ['/'], undefined, <div>Canvas route</div>, {
        frontendOperabilitySink: { record },
      })
    );

    try {
      await waitFor(() => {
        expect(record).toHaveBeenCalledWith({
          type: 'frontend.surface.degraded',
          surface: 'shell.platform-health',
          state: 'partial',
          reasonCode: 'platform-health-state-transition',
        });
      });

      await act(async () => {
        await mounted.queryClient.refetchQueries({
          queryKey: queryKeys.shell.platformHealthSnapshot(),
        });
      });

      expect(record).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });
});
