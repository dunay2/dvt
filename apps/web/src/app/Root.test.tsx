// @vitest-environment jsdom

import { fireEvent, waitFor, within } from '@testing-library/dom';
import { act, useEffect } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import type { RouteBootstrapPresentation } from './bootstrap/routeBootstrapContract';
import StaticRouteBootstrapBoundary from './bootstrap/StaticRouteBootstrapBoundary';
import {
  createPublishedRouteBootstrapHandle,
  createStaticRouteBootstrapHandle,
} from './bootstrap/routeBootstrapContract';
import {
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from './bootstrap/routeBootstrapRegistry';
import { getRouteBootstrapRegistration } from './bootstrap/routeBootstrapRegistration';
import type { CapabilitiesPort } from './ports/capabilities';
import {
  createHealthzProbe,
  createPlatformHealthSnapshot,
} from '../capabilities/platform-health/testing/platformHealthFixtures';
import AppRouteErrorBoundary from './AppRouteErrorBoundary';
import { queryKeys } from './queries/queryKeys';
import { waitForReactQuery, withTestQueryClient } from '../testing/reactQueryHarness';
import AppProviders from './AppProviders';
import Root, { RootShell } from './Root';
import { AppServicesProvider, useAppDataSourceMode } from './services/AppServicesContext';
import { useAppStore } from './stores/appStore';
import { useUiLayoutStore } from './stores/uiLayoutStore';
import { DEFAULT_CANVAS_PALETTE_ID } from './views/canvas/canvasPalette';
import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from './views/canvas/canvasDraftPresentationState';

const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

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

function createRootShellNode(
  capability: PlatformHealthCapabilityApi,
  initialEntries: string[] = ['/'],
  capabilitiesPort?: CapabilitiesPort,
  canvasRouteElement: JSX.Element = <div>Canvas route</div>
): JSX.Element {
  const defaultCapabilitiesPort: CapabilitiesPort = {
    loadCapabilities: vi.fn().mockResolvedValue({
      apiVersion: '1.0.0',
      minFrontendVersion: '1.0.0',
      plugins: {},
    }),
  };

  const workspaceRouteHandle = {
    routeBootstrap: createStaticRouteBootstrapHandle({
      pendingDetail: 'Preparing workspace route',
      readyDetail: 'Workspace is ready',
    }),
  };
  const pluginsRouteHandle = {
    routeBootstrap: createStaticRouteBootstrapHandle({
      pendingDetail: 'Preparing Plugins route',
      readyDetail: 'Plugins is ready',
    }),
  };
  const adminRouteHandle = {
    routeBootstrap: createStaticRouteBootstrapHandle({
      pendingDetail: 'Preparing Admin route',
      readyDetail: 'Admin is ready',
    }),
  };
  const runsRouteHandle = {
    routeBootstrap: createPublishedRouteBootstrapHandle({
      pendingDetail: 'Preparing Runs route',
    }),
  };
  const runDetailRouteHandle = {
    routeBootstrap: createPublishedRouteBootstrapHandle({
      pendingDetail: 'Preparing Run detail route',
    }),
  };

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootShell platformHealthCapability={capability} />,
        children: [
          {
            id: 'test.workspace',
            index: true,
            handle: workspaceRouteHandle,
            element: (
              <StaticRouteBootstrapBoundary
                registration={getRouteBootstrapRegistration('test.workspace', workspaceRouteHandle)}
              >
                <div>Workspace route</div>
              </StaticRouteBootstrapBoundary>
            ),
          },
          {
            id: 'dbt.canvas',
            path: 'canvas',
            handle: { routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE },
            element: canvasRouteElement,
          },
          {
            id: 'test.plugins',
            path: 'plugins',
            handle: pluginsRouteHandle,
            element: (
              <StaticRouteBootstrapBoundary
                registration={getRouteBootstrapRegistration('test.plugins', pluginsRouteHandle)}
              >
                <div>Plugins route</div>
              </StaticRouteBootstrapBoundary>
            ),
          },
          {
            id: 'shell.admin',
            path: 'admin',
            handle: adminRouteHandle,
            element: (
              <StaticRouteBootstrapBoundary
                registration={getRouteBootstrapRegistration('shell.admin', adminRouteHandle)}
              >
                <div>Admin route</div>
              </StaticRouteBootstrapBoundary>
            ),
          },
          {
            id: 'test.runs',
            path: 'runs',
            handle: runsRouteHandle,
            element: (
              <PublishedRouteBootstrapProbe
                registration={getRouteBootstrapRegistration('test.runs', runsRouteHandle)!}
                presentationState={buildRouteBootstrapPresentation({
                  detail: 'Runs route is ready',
                })}
              >
                <div>Runs route</div>
              </PublishedRouteBootstrapProbe>
            ),
          },
          {
            id: 'test.run-detail',
            path: 'runs/:runId',
            handle: runDetailRouteHandle,
            element: (
              <PublishedRouteBootstrapProbe
                registration={
                  getRouteBootstrapRegistration('test.run-detail', runDetailRouteHandle)!
                }
                presentationState={buildRouteBootstrapPresentation({
                  detail: 'Run detail route is ready',
                })}
              >
                <div>Run detail route</div>
              </PublishedRouteBootstrapProbe>
            ),
          },
        ],
      },
    ],
    { initialEntries }
  );

  return (
    <AppServicesProvider
      overrides={{ mode: 'mock', capabilitiesPort: capabilitiesPort ?? defaultCapabilitiesPort }}
    >
      <RouterProvider router={router} />
    </AppServicesProvider>
  );
}

function createBrokenRootShellNode(
  capability: PlatformHealthCapabilityApi,
  initialEntries: string[] = ['/broken']
): JSX.Element {
  const defaultCapabilitiesPort: CapabilitiesPort = {
    loadCapabilities: vi.fn().mockResolvedValue({
      apiVersion: '1.0.0',
      minFrontendVersion: '1.0.0',
      plugins: {},
    }),
  };

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootShell platformHealthCapability={capability} />,
        errorElement: <AppRouteErrorBoundary />,
        children: [
          {
            id: 'broken.route',
            path: 'broken',
            element: <div>Broken route</div>,
          },
        ],
      },
    ],
    { initialEntries }
  );

  return (
    <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort: defaultCapabilitiesPort }}>
      <RouterProvider router={router} />
    </AppServicesProvider>
  );
}

function resetAppStore(): void {
  useAppStore.setState({
    connectionStatus: { rest: 'ok', liveEvents: 'connected' },
    consolePanelHeight: 0,
    consolePanelVisible: false,
    focusMode: false,
  });
}

function resetUiLayoutStore(): void {
  useUiLayoutStore.setState({
    leftNavCollapsed: false,
    explorerPanelWidth: 280,
    explorerPanelVisible: false,
    inspectorPanelWidth: 380,
    inspectorPanelVisible: false,
    consolePanelHeight: 0,
    consolePanelVisible: false,
    focusMode: false,
    gridSize: 20,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    activeTabs: [{ id: 'main-canvas', type: 'canvas', label: 'Main Graph' }],
    activeTabId: 'main-canvas',
    connectionStatus: { rest: 'ok', liveEvents: 'connected' },
  });
}

function RootServicesProbe(): JSX.Element {
  const mode = useAppDataSourceMode();
  return <div data-testid="root-services-probe">mode:{mode}</div>;
}

function buildRouteBootstrapPresentation(
  overrides?: Partial<RouteBootstrapPresentation>
): RouteBootstrapPresentation {
  return {
    status: 'complete',
    detail: 'Canvas is ready',
    canComplete: true,
    ...overrides,
  };
}

function CanvasBootstrapProbe({
  presentationState,
}: {
  presentationState: RouteBootstrapPresentation;
}): JSX.Element {
  useEffect(() => {
    publishRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION, presentationState);

    return () => {
      resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    };
  }, [presentationState.canComplete, presentationState.detail, presentationState.status]);

  return <div>Canvas route</div>;
}

function PublishedRouteBootstrapProbe({
  registration,
  presentationState,
  children,
}: {
  registration: NonNullable<
    ReturnType<typeof getRouteBootstrapRegistration>
  >;
  presentationState: RouteBootstrapPresentation;
  children: JSX.Element;
}): JSX.Element {
  useEffect(() => {
    publishRouteBootstrapPresentation(registration, presentationState);

    return () => {
      resetRouteBootstrapPresentation(registration);
    };
  }, [
    presentationState.canComplete,
    presentationState.detail,
    presentationState.status,
    registration,
  ]);

  return children;
}

async function waitForShellBootstrapSurface(
  mounted: Awaited<ReturnType<typeof withTestQueryClient>>
): Promise<void> {
  await waitFor(() => {
    expect(mounted.container.querySelector('[data-slot="app-shell-frame"]')).not.toBeNull();
  });
}

describe('RootShell platform health UX', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppStore();
    resetUiLayoutStore();
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
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
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
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/canvas']));

    try {
      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'route',
          'pending',
          'Preparing canvas route'
        );
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
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(
      createRootShellNode(
        capability,
        ['/canvas'],
        undefined,
        <CanvasBootstrapProbe
          presentationState={buildRouteBootstrapPresentation({
            status: 'blocked',
            detail:
              'Canvas has paused draft editing because the persisted draft disappeared. Adopt the current workspace snapshot before continuing.',
            canComplete: false,
          })}
        />
      )
    );

    try {
      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'route',
          'blocked',
          'Canvas has paused draft editing because the persisted draft disappeared. Adopt the current workspace snapshot before continuing.'
        );
      });
      expect(bootstrapScreenMocks.completeBootstrapScreen).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
    }
  });

  it('completes Raven startup when the canvas presentation seam publishes complete posture', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(
      createRootShellNode(
        capability,
        ['/canvas'],
        undefined,
        <CanvasBootstrapProbe presentationState={buildRouteBootstrapPresentation()} />
      )
    );

    try {
      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'route',
          'complete',
          'Canvas is ready'
        );
      });
      await waitFor(() => {
        expect(bootstrapScreenMocks.completeBootstrapScreen).toHaveBeenCalled();
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('completes Raven startup when a truly static route settles through its route contract', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/plugins']));

    try {
      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'route',
          'complete',
          'Plugins is ready'
        );
      });
      await waitFor(() => {
        expect(bootstrapScreenMocks.completeBootstrapScreen).toHaveBeenCalled();
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('completes Raven startup for the shell admin static route through its route contract', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/admin']));

    try {
      await waitFor(() => {
        expect(bootstrapScreenMocks.setBootstrapStepStatus).toHaveBeenCalledWith(
          'route',
          'complete',
          'Admin is ready'
        );
      });
      await waitFor(() => {
        expect(bootstrapScreenMocks.completeBootstrapScreen).toHaveBeenCalled();
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('shows a persistent offline banner with retry action when the query fails', async () => {
    vi.useFakeTimers();
    const loadSnapshot = vi.fn().mockRejectedValue(new Error('Unable to reach /healthz'));
    const capability: PlatformHealthCapabilityApi = { loadSnapshot };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_200);
      });

      await waitFor(() => {
        expect(view.getByText('Backend offline')).toBeTruthy();
      });
      expect(view.getByText('Offline')).toBeTruthy();

      const retryButton = view.getByRole('button', { name: /retry now/i });
      const initialCallCount = loadSnapshot.mock.calls.length;

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(loadSnapshot.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('shows a persistent degraded banner when the health snapshot reports degraded state', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(
        createPlatformHealthSnapshot({
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
        })
      ),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await waitForReactQuery(
        () => mounted.container.textContent?.includes('Backend degraded') === true,
        {
          description: 'degraded shell banner',
        }
      );

      expect(view.getByText('Degraded')).toBeTruthy();
      expect(view.getByText('Intent reconciler degraded: runtime_unavailable.')).toBeTruthy();
      expect(view.getByRole('button', { name: /retry now/i })).toBeTruthy();
    } finally {
      await mounted.cleanup();
    }
  });

  it('hides the persistent banner when the health snapshot is healthy', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      await waitForReactQuery(
        () =>
          mounted.queryClient.getQueryState(queryKeys.shell.platformHealthSnapshot())?.status ===
          'success',
        {
          description: 'healthy platform health query',
        }
      );

      expect(mounted.container.querySelector('[data-testid="shell-health-banner"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it('renders shell top bar and left navigation with governed shell chrome', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability, ['/canvas']));

    try {
      await waitForShellBootstrapSurface(mounted);
      await waitForReactQuery(
        () =>
          mounted.queryClient.getQueryState(queryKeys.shell.platformHealthSnapshot())?.status ===
          'success',
        {
          description: 'healthy platform health query for shell chrome',
        }
      );

      const appShellFrame = mounted.container.querySelector('[data-slot="app-shell-frame"]');
      const appShellBody = mounted.container.querySelector('[data-slot="app-shell-body"]');
      const appShellMain = mounted.container.querySelector('[data-slot="app-shell-main"]');
      const appShellLeftNavigation = mounted.container.querySelector(
        '[data-slot="app-shell-left-navigation"]'
      );
      const appShellOutlet = mounted.container.querySelector('[data-slot="app-shell-outlet"]');
      const shellTopBar = mounted.container.querySelector('[data-slot="shell-top-bar"]');
      const shellGitRef = mounted.container.querySelector('[data-slot="shell-git-ref"]');
      const shellConnectionStatus = mounted.container.querySelector(
        '[data-slot="shell-connection-status"]'
      );
      const shellWorkspaceSelectors = mounted.container.querySelector(
        '[data-slot="shell-workspace-selectors"]'
      );
      const shellMenuTrigger = mounted.container.querySelector('[data-slot="shell-menu-trigger"]');
      const leftNavigationRail = mounted.container.querySelector(
        '[data-slot="left-navigation-rail"]'
      );
      const leftNavigationLinks = [
        ...mounted.container.querySelectorAll<HTMLAnchorElement>(
          '[data-slot="left-navigation-link"]'
        ),
      ];

      await waitFor(() => {
        expect(
          mounted.container.querySelector('[data-slot="shell-connection-status"]')?.className
        ).not.toContain('text-[var(--text-subtle)]');
      });

      expect(appShellFrame).not.toBeNull();
      expect(appShellBody).not.toBeNull();
      expect(appShellLeftNavigation?.parentElement).toBe(appShellBody);
      expect(appShellMain?.parentElement).toBe(appShellBody);
      expect(appShellOutlet?.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
      expect(appShellOutlet?.textContent).toContain('Canvas route');
      expect(shellTopBar?.textContent).toContain('Raven');
      expect(shellTopBar?.textContent).toContain('View');
      expect(shellTopBar?.className).toContain('bg-[var(--surface-shell)]');
      expect(shellTopBar?.querySelector('[data-slot="shell-git-ref"]')).toBeTruthy();
      expect(shellTopBar?.querySelector('[data-slot="shell-workspace-selectors"]')).toBeTruthy();
      expect(shellTopBar?.querySelector('[data-slot="shell-menu-trigger"]')).toBeTruthy();
      expect(shellConnectionStatus).toBeTruthy();
      expect(shellConnectionStatus?.className).toContain('text-[var(--text-default)]');
      expect(shellGitRef?.className).toContain('bg-[var(--surface-app)]');
      expect(shellGitRef?.className).toContain('border-[color:var(--border-default)]');
      expect(shellWorkspaceSelectors).toBeTruthy();
      expect(shellWorkspaceSelectors?.querySelectorAll('[role="combobox"]')).toHaveLength(3);
      expect(shellMenuTrigger?.textContent).toContain('View');
      expect(leftNavigationRail?.className).toContain('bg-[var(--surface-shell)]');
      expect(leftNavigationRail?.className).toContain('h-full');
      expect(leftNavigationLinks.map((link) => link.getAttribute('href'))).toEqual([
        '/canvas',
        '/lineage',
        '/code',
        '/diff',
        '/artifacts',
        '/runs',
        '/cost',
        '/plugins',
        '/admin',
      ]);
      const leftNavigationCaptions = [
        ...mounted.container.querySelectorAll<HTMLElement>('[data-slot="left-navigation-caption"]'),
      ].map((node) => node.textContent?.trim());
      const canvasNavigationLink = leftNavigationLinks.find(
        (link) => link.getAttribute('href') === '/canvas'
      );
      expect(leftNavigationCaptions).toContain('Runs');
      expect(leftNavigationCaptions).toContain('Canvas');
      expect(canvasNavigationLink?.className).toContain('grid-cols-[18px_1fr]');
      expect(canvasNavigationLink?.className).toContain('border-[color:var(--status-running)]');
      expect(canvasNavigationLink?.className).not.toContain('isActive');
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps the runs navigation item active for run detail routes', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(
      createRootShellNode(capability, ['/runs/run_123'])
    );

    try {
      await waitForShellBootstrapSurface(mounted);

      const runsNavigationLink = [
        ...mounted.container.querySelectorAll<HTMLAnchorElement>('[data-slot="left-navigation-link"]'),
      ].find((link) => link.getAttribute('href') === '/runs');

      expect(mounted.container.textContent).toContain('Run detail route');
      expect(runsNavigationLink?.className).toContain('border-[color:var(--status-running)]');
      expect(runsNavigationLink?.className).not.toContain('isActive');
    } finally {
      await mounted.cleanup();
    }
  });

  it('preserves focus-mode behavior by hiding the left rail while keeping the shell top bar', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    useUiLayoutStore.setState({ focusMode: true });
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      await waitForShellBootstrapSurface(mounted);

      expect(mounted.container.querySelector('[data-slot="left-navigation-rail"]')).toBeNull();
      expect(mounted.container.querySelector('[data-slot="app-shell-bottom-drawer"]')).toBeNull();
      expect(mounted.container.querySelector('[data-slot="shell-top-bar"]')).toBeTruthy();
    } finally {
      await mounted.cleanup();
    }
  });

  it('renders the bottom console drawer inside the app shell frame when enabled', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    useUiLayoutStore.setState({ consolePanelVisible: true, consolePanelHeight: 160 });
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      await waitForShellBootstrapSurface(mounted);

      const bottomDrawer = mounted.container.querySelector('[data-slot="app-shell-bottom-drawer"]');
      const appShellMain = mounted.container.querySelector('[data-slot="app-shell-main"]');
      const consoleDrawer = mounted.container.querySelector('[data-slot="bottom-console-drawer"]');

      expect(bottomDrawer).not.toBeNull();
      expect(bottomDrawer?.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
      expect(consoleDrawer).not.toBeNull();
      expect(bottomDrawer?.textContent).toContain('Console');
      expect(bottomDrawer?.textContent).toContain('Start a run to see execution output here.');
    } finally {
      await mounted.cleanup();
    }
  });

  it('updates the visible countdown using the existing auto-refresh cadence', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T12:00:00.000Z'));
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(
        createPlatformHealthSnapshot({
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
        })
      ),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await waitForReactQuery(
        () => mounted.container.textContent?.includes('Auto-refresh in 15s.') === true,
        {
          description: 'initial auto-refresh countdown',
          intervalMs: 1,
          timeoutMs: 500,
          tick: async () => {
            await vi.advanceTimersByTimeAsync(1);
          },
        }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      await waitForReactQuery(
        () => mounted.container.textContent?.includes('Auto-refresh in 10s.') === true,
        {
          description: 'updated auto-refresh countdown',
          intervalMs: 1,
          timeoutMs: 500,
          tick: async () => {
            await vi.advanceTimersByTimeAsync(1);
          },
        }
      );

      expect(view.getByText('Auto-refresh in 10s.')).toBeTruthy();
    } finally {
      await mounted.cleanup();
    }
  });
});

describe('Root integration guard', () => {
  it('keeps service wiring available when app-level providers wrap the routed shell', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <Root />,
          children: [
            {
              id: 'test.workspace',
              index: true,
              handle: {
                routeBootstrap: createStaticRouteBootstrapHandle({
                  pendingDetail: 'Preparing workspace route',
                  readyDetail: 'Workspace is ready',
                }),
              },
              element: <RootServicesProbe />,
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    );
    const mounted = await withTestQueryClient(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    );

    try {
      await waitFor(() => {
        expect(within(mounted.container).getByTestId('root-services-probe').textContent).toContain(
          'mode:'
        );
      });
    } finally {
      await mounted.cleanup();
    }
  });
});

describe('Root bootstrap contract guard', () => {
  it('fails fast with a typed localized error when the active route lacks bootstrap registration', async () => {
    document.documentElement.lang = 'en';
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES');

    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(
        createPlatformHealthSnapshot({
          fetchedAt: '2026-04-18T10:00:00.000Z',
        })
      ),
    };

    const mounted = await withTestQueryClient(createBrokenRootShellNode(capability));

    try {
      await waitFor(() => {
        expect(
          mounted.container.querySelector('[data-slot="app-route-error-boundary"]')
        ).not.toBeNull();
      });

      expect(mounted.container.textContent).toContain(
        'Falta el registro activo de route bootstrap para la ruta actual.'
      );
    } finally {
      await mounted.cleanup();
    }
  });
});
