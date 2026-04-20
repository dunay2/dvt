// @vitest-environment jsdom
import { waitFor, within } from '@testing-library/dom';
import type { CapabilitiesPort } from './ports/capabilities';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import { createPlatformHealthSnapshot } from '../capabilities/platform-health/testing/platformHealthFixtures';
import { withTestQueryClient } from '../testing/reactQueryHarness';
import { createBlockedRouteBootstrapPresentation, createCompleteRouteBootstrapPresentation } from './bootstrap/routeBootstrapContract';
import { resetRouteBootstrapPresentation } from './bootstrap/routeBootstrapRegistry';
import { CANVAS_ROUTE_BOOTSTRAP_REGISTRATION, RouteBootstrapProbe, createRootShellNode } from './Root.bootstrapRoute.test.support';
import { resetRootShellStores } from './Root.test.support';

const bootstrapScreenMocks = vi.hoisted(() => ({
  completeBootstrapScreen: vi.fn(),
  isBootstrapScreenVisible: vi.fn(() => false),
  setBootstrapStepStatus: vi.fn(),
  showBootstrapFailure: vi.fn(),
}));

vi.mock('./bootstrap/appBootstrapScreen', () => ({
  completeBootstrapScreen: bootstrapScreenMocks.completeBootstrapScreen,
  isBootstrapScreenVisible: bootstrapScreenMocks.isBootstrapScreenVisible,
  setBootstrapStepStatus: bootstrapScreenMocks.setBootstrapStepStatus,
  showBootstrapFailure: bootstrapScreenMocks.showBootstrapFailure,
}));

async function expectRouteBootstrapStep(args: {
  status: 'pending' | 'complete' | 'blocked' | 'error';
  detail: string;
}): Promise<void> {
  await waitFor(() => {
    expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
      'route',
      args.status,
      args.detail
    );
  });
}

async function expectRouteBootstrapCompletion(detail: string): Promise<void> {
  await expectRouteBootstrapStep({
    status: 'complete',
    detail,
  });
  await waitFor(() => {
    expect(bootstrapScreenMocks.completeBootstrapScreen).toHaveBeenCalled();
  });
}

function createResolvedCapability(): PlatformHealthCapabilityApi {
  return {
    loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
  };
}

describe('RootShell bootstrap flow', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRootShellStores();
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    bootstrapScreenMocks.completeBootstrapScreen.mockReset();
    bootstrapScreenMocks.setBootstrapStepStatus.mockReset();
  });

  afterEach(() => {
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    vi.useRealTimers();
  });

  it('keeps health bootstrap pending until the first platform health query settles', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally unresolved for the initial pending state.
          })
      ),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'health',
          'pending'
        );
      });
      expect(view.getByText('Checking')).toBeTruthy();
      expect(mounted.container.querySelector('[data-slot="app-shell-frame"]')).not.toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps capabilities bootstrap pending until runtime capabilities settle', async () => {
    const capability = createResolvedCapability();
    const pendingCapabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally unresolved for the initial pending state.
          })
      ),
    };
    const mounted = await withTestQueryClient(
      createRootShellNode(capability, ['/'], pendingCapabilitiesPort)
    );

    try {
      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'capabilities',
          'pending'
        );
      });
      expect(mounted.container.querySelector('[data-slot="app-shell-frame"]')).not.toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps canvas route bootstrap pending until the route presentation seam publishes operability', async () => {
    const capability = createResolvedCapability();
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/canvas']));

    try {
      await expectRouteBootstrapStep({
        status: 'pending',
        detail: 'Preparing canvas route',
      });
      expect(bootstrapScreenMocks.setBootstrapStepStatus).not.toHaveBeenCalledWith(
        'route',
        'complete',
        'Canvas workbench route is ready'
      );
      expect(bootstrapScreenMocks.completeBootstrapScreen).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps Raven blocked when the canvas presentation seam publishes blocked recovery posture', async () => {
    const capability = createResolvedCapability();
    const mounted = await withTestQueryClient(
      createRootShellNode(
        capability,
        ['/canvas'],
        undefined,
        <RouteBootstrapProbe
          registration={CANVAS_ROUTE_BOOTSTRAP_REGISTRATION}
          presentationState={createBlockedRouteBootstrapPresentation(
            'Canvas has paused draft editing because the persisted draft disappeared. Adopt the current workspace snapshot before continuing.'
          )}
        >
          <div>Canvas route</div>
        </RouteBootstrapProbe>
      )
    );

    try {
      await expectRouteBootstrapStep({
        status: 'blocked',
        detail:
          'Canvas has paused draft editing because the persisted draft disappeared. Adopt the current workspace snapshot before continuing.',
      });
      expect(bootstrapScreenMocks.completeBootstrapScreen).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
    }
  });

  it('completes Raven startup when the canvas presentation seam publishes complete posture', async () => {
    const capability = createResolvedCapability();
    const mounted = await withTestQueryClient(
      createRootShellNode(
        capability,
        ['/canvas'],
        undefined,
        <RouteBootstrapProbe
          registration={CANVAS_ROUTE_BOOTSTRAP_REGISTRATION}
          presentationState={createCompleteRouteBootstrapPresentation('Canvas is ready')}
        >
          <div>Canvas route</div>
        </RouteBootstrapProbe>
      )
    );

    try {
      await expectRouteBootstrapCompletion('Canvas is ready');
    } finally {
      await mounted.cleanup();
    }
  });

  it('completes Raven startup when a truly static route settles through its route contract', async () => {
    const capability = createResolvedCapability();
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/plugins']));

    try {
      await expectRouteBootstrapCompletion('Plugins is ready');
    } finally {
      await mounted.cleanup();
    }
  });

  it('completes Raven startup for the shell admin static route through its route contract', async () => {
    const capability = createResolvedCapability();
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/admin']));

    try {
      await expectRouteBootstrapCompletion('Admin is ready');
    } finally {
      await mounted.cleanup();
    }
  });
});
