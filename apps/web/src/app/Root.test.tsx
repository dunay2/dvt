// @vitest-environment jsdom

import { fireEvent, waitFor, within } from '@testing-library/dom';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import type { CapabilitiesPort } from './ports/capabilities';
import {
  createHealthzProbe,
  createPlatformHealthSnapshot,
} from '../capabilities/platform-health/testing/platformHealthFixtures';
import { queryKeys } from './queries/queryKeys';
import { waitForReactQuery, withTestQueryClient } from '../testing/reactQueryHarness';
import Root, { RootShell } from './Root';
import { AppServicesProvider, useAppDataSourceMode } from './services/AppServicesContext';
import { useAppStore } from './stores/appStore';
import { useUiLayoutStore } from './stores/uiLayoutStore';

function createRootShellNode(capability: PlatformHealthCapabilityApi): JSX.Element {
  const capabilitiesPort: CapabilitiesPort = {
    loadCapabilities: vi.fn().mockResolvedValue({
      apiVersion: '1.0.0',
      minFrontendVersion: '1.0.0',
      plugins: {},
    }),
  };

  return (
    <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
      <MemoryRouter>
        <Routes>
          <Route element={<RootShell platformHealthCapability={capability} />} path="/">
            <Route element={<div>Workspace route</div>} index />
          </Route>
        </Routes>
      </MemoryRouter>
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
    activeTabs: [{ id: 'main-canvas', type: 'canvas', label: 'Main Graph' }],
    activeTabId: 'main-canvas',
    connectionStatus: { rest: 'ok', liveEvents: 'connected' },
  });
}

function RootServicesProbe(): JSX.Element {
  const mode = useAppDataSourceMode();
  return <div data-testid="root-services-probe">mode:{mode}</div>;
}

describe('RootShell platform health UX', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppStore();
    resetUiLayoutStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not falsely show ok while the first platform health query is still pending', async () => {
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
        expect(view.getByText('Checking')).toBeTruthy();
      });
      expect(view.queryByText('Backend offline')).toBeNull();
      expect(view.queryByText('Backend degraded')).toBeNull();
      expect(mounted.container.textContent).not.toContain('REST API: ok');
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

      const appShellFrame = mounted.container.querySelector('[data-slot="app-shell-frame"]');
      const appShellBody = mounted.container.querySelector('[data-slot="app-shell-body"]');
      const appShellMain = mounted.container.querySelector('[data-slot="app-shell-main"]');
      const appShellLeftNavigation = mounted.container.querySelector(
        '[data-slot="app-shell-left-navigation"]'
      );
      const appShellOutlet = mounted.container.querySelector('[data-slot="app-shell-outlet"]');
      const shellTopBar = mounted.container.querySelector('[data-slot="shell-top-bar"]');
      const shellGitRef = mounted.container.querySelector('[data-slot="shell-git-ref"]');
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

      expect(appShellFrame).not.toBeNull();
      expect(appShellBody).not.toBeNull();
      expect(appShellLeftNavigation?.parentElement).toBe(appShellBody);
      expect(appShellMain?.parentElement).toBe(appShellBody);
      expect(appShellOutlet?.closest('[data-slot="app-shell-main"]')).toBe(appShellMain);
      expect(appShellOutlet?.textContent).toContain('Workspace route');
      expect(shellTopBar?.textContent).toContain('Raven');
      expect(shellTopBar?.textContent).toContain('Shell');
      expect(shellTopBar?.className).toContain('bg-[var(--surface-shell)]');
      expect(shellTopBar?.querySelector('[data-slot="shell-git-ref"]')).toBeTruthy();
      expect(shellTopBar?.querySelector('[data-slot="shell-workspace-selectors"]')).toBeTruthy();
      expect(shellTopBar?.querySelector('[data-slot="shell-menu-trigger"]')).toBeTruthy();
      expect(shellGitRef?.className).toContain('bg-[var(--surface-app)]');
      expect(shellGitRef?.className).toContain('border-[color:var(--border-default)]');
      expect(shellWorkspaceSelectors).toBeTruthy();
      expect(shellMenuTrigger?.textContent).toContain('Shell');
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
      await waitForReactQuery(
        () =>
          mounted.queryClient.getQueryState(queryKeys.shell.platformHealthSnapshot())?.status ===
          'success',
        {
          description: 'healthy platform health query',
        }
      );

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
      await waitForReactQuery(
        () =>
          mounted.queryClient.getQueryState(queryKeys.shell.platformHealthSnapshot())?.status ===
          'success',
        {
          description: 'healthy platform health query',
        }
      );

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
  it('keeps service wiring available when Root owns the app-services provider', async () => {
    const mounted = await withTestQueryClient(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Root />} path="/">
            <Route element={<RootServicesProbe />} index />
          </Route>
        </Routes>
      </MemoryRouter>
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
