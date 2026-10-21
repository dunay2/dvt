// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitFor } from '@testing-library/dom';
import React, { act, StrictMode, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDbReadyDto,
  createHealthzDto,
  createReadyzDto,
  createVersionDto,
} from '../../capabilities/platform-health/testing/platformHealthHttpHarness';
import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { createTestQueryClient, withTestQueryClient } from '../../testing/reactQueryHarness';
import AppProviders from '../AppProviders';
import { setBootstrapStepStatus, startBootstrapScreen } from '../bootstrap/appBootstrapScreen';
import { createCompleteRouteBootstrapPresentation } from '../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { queryKeys } from '../queries/queryKeys';
import { resetRootShellStores } from '../Root.test.support';
import { createAppRoutes } from '../routes';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { createDeferredView } from './createDeferredView';
import { PluginContributionBoundary } from './PluginContributionBoundary';
import * as pluginRegistry from './registry';

type RouteModule = Readonly<{ default: React.ComponentType }>;

function createPendingModule(): Readonly<{
  promise: Promise<RouteModule>;
  resolve: (module: RouteModule) => void;
  reject: (error: unknown) => void;
}> {
  let resolve!: (module: RouteModule) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<RouteModule>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('createDeferredView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'en' });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders the route view after its deferred module resolves', async () => {
    const pendingModule = createPendingModule();
    const load = vi.fn(() => pendingModule.promise);
    const DeferredView = createDeferredView(load);

    await act(async () => {
      root.render(<DeferredView />);
    });

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading view…');

    await act(async () => {
      pendingModule.resolve({ default: () => <main>Loaded route</main> });
      await pendingModule.promise;
    });

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
    expect(container.textContent).toContain('Loaded route');

    act(() => root.render(null));
    act(() => root.render(<DeferredView />));

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
    expect(container.textContent).toContain('Loaded route');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('settles a shared import before a suspended route can commit', async () => {
    const pendingModule = createPendingModule();
    const load = vi.fn(() => pendingModule.promise);
    const DeferredView = createDeferredView(load);
    let canCommit = false;
    let allowCommit!: () => void;
    const pendingCommit = new Promise<void>((resolve) => {
      allowCommit = resolve;
    });
    function AwaitRouteCommit(): null {
      if (!canCommit) throw pendingCommit;
      return null;
    }

    await act(async () => {
      root.render(
        <Suspense fallback={<p>Waiting for route context</p>}>
          <DeferredView />
          <AwaitRouteCommit />
        </Suspense>
      );
    });

    expect(container.textContent).toBe('Waiting for route context');
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingModule.resolve({ default: () => <main>Loaded before commit</main> });
      await pendingModule.promise;
    });

    expect(container.textContent).toBe('Waiting for route context');

    await act(async () => {
      canCommit = true;
      allowCommit();
      await pendingCommit;
    });

    expect(container.textContent).toBe('Loaded before commit');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('notifies the replacement StrictMode consumer when the original consumer leaves', async () => {
    const pendingModule = createPendingModule();
    const load = vi.fn(() => pendingModule.promise);
    const DeferredView = createDeferredView(load);
    const route = (
      <StrictMode>
        <DeferredView />
      </StrictMode>
    );

    await act(async () => root.render(route));
    act(() => root.render(<main>Another route</main>));
    await act(async () => root.render(route));

    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).not.toBeNull();

    await act(async () => {
      pendingModule.resolve({ default: () => <main>Replacement route ready</main> });
      await pendingModule.promise;
    });

    expect(container.textContent).toBe('Replacement route ready');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('localizes the visible loading state in Spanish', async () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const DeferredView = createDeferredView(() => createPendingModule().promise);

    await act(async () => {
      root.render(<DeferredView />);
    });

    expect(container.textContent).toContain('Cargando vista…');
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
  });

  it.each([
    { name: 'an Error', reason: new Error('route import failed') },
    { name: 'null', reason: null },
    { name: 'undefined', reason: undefined },
  ])('propagates a module rejected with $name to the existing boundary', async ({ reason }) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingModule = createPendingModule();
    const DeferredView = createDeferredView(() => pendingModule.promise);

    await act(async () => {
      root.render(
        <PluginContributionBoundary resetKey="route" fallback={<p>Route unavailable</p>}>
          <DeferredView />
        </PluginContributionBoundary>
      );
    });

    await act(async () => {
      pendingModule.reject(reason);
      await pendingModule.promise.catch(() => undefined);
    });

    expect(container.textContent).toBe('Route unavailable');
    expect(container.querySelector('[data-slot="plugin-route-module-loading"]')).toBeNull();
  });
});

describe('deferred route bootstrap composition', () => {
  const cssFailureMessage = 'Unable to preload CSS for /assets/RunsView-Dcs-ZTu0.css';
  const readyPresentation = createCompleteRouteBootstrapPresentation('Deferred run route is ready');
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
  let router: ReturnType<typeof createMemoryRouter> | undefined;
  let screen: HTMLElement;
  let unexpectedRequests: string[];

  function ReadyRunRoute(): JSX.Element {
    usePublishedRouteBootstrap('monitoring.run-detail', readyPresentation);
    return <main data-testid="deferred-run-ready">Deferred run route</main>;
  }

  async function mountDeferredRoute(
    pendingModule: ReturnType<typeof createPendingModule>,
    initialEntry = '/runs/bootstrap-proof'
  ): Promise<void> {
    const routeViews = pluginRegistry.getRouteViews();
    const DeferredView = createDeferredView(() => pendingModule.promise);
    expect(routeViews.some((view) => view.id === 'monitoring.run-detail')).toBe(true);
    vi.spyOn(pluginRegistry, 'getRouteViews').mockReturnValue(
      routeViews.map((view) =>
        view.id === 'monitoring.run-detail' ? { ...view, component: DeferredView } : view
      )
    );
    router = createMemoryRouter(createAppRoutes(), { initialEntries: [initialEntry] });
    const queryClient = createTestQueryClient();
    mounted = await withTestQueryClient(
      <AppProviders
        queryClient={queryClient}
        overrides={{
          ...createAppServicesTestOverrides(),
          capabilitiesPort: {
            loadCapabilities: vi.fn().mockResolvedValue({
              apiVersion: '1.0.0',
              minFrontendVersion: '1.0.0',
              plugins: {},
            }),
          },
        }}
      >
        <RouterProvider router={router} />
      </AppProviders>,
      queryClient
    );
  }

  beforeEach(() => {
    localStorage.clear();
    resetRootShellStores();
    useApplicationLanguageStore.setState({ language: 'en' });
    const indexHtml = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../index.html'),
      'utf8'
    );
    const sourceScreen = new DOMParser()
      .parseFromString(indexHtml, 'text/html')
      .getElementById('app-loading-screen');
    if (!sourceScreen) throw new Error('Production startup DOM is missing');
    screen = document.importNode(sourceScreen, true);
    document.body.appendChild(screen);
    startBootstrapScreen();
    setBootstrapStepStatus({ step: 'hydrate', status: 'complete' });
    unexpectedRequests = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const pathname = new URL(String(input), 'http://localhost').pathname;
        const workspace = {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          projectName: 'Analytics',
          environmentId: 'dev',
        };
        if (pathname === '/session') {
          return Response.json({ authenticated: true, permissions: {} });
        }
        if (pathname === '/workspace/context') {
          return Response.json({
            defaultWorkspace: workspace,
            availableWorkspaces: [workspace],
            deploymentScope: { targetAdapter: 'temporal', availableTargetAdapters: ['temporal'] },
          });
        }
        if (pathname === '/healthz') return Response.json(createHealthzDto());
        if (pathname === '/readyz') return Response.json(createReadyzDto());
        if (pathname === '/version') return Response.json(createVersionDto());
        if (pathname === '/db/ready') return Response.json(createDbReadyDto());
        unexpectedRequests.push(pathname);
        throw new Error(`Unexpected request in route composition proof: ${pathname}`);
      })
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await mounted?.cleanup();
    router?.dispose();
    mounted = undefined;
    router = undefined;
    screen?.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    expect(unexpectedRequests).toEqual([]);
  });

  it('keeps the actual startup screen pending until the imported route publishes readiness', async () => {
    const pendingModule = createPendingModule();
    await mountDeferredRoute(pendingModule);

    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="plugin-route-module-loading"]')
      ).not.toBeNull();
      expect(
        screen.querySelector('[data-bootstrap-step="health"]')?.getAttribute('data-status')
      ).toBe('complete');
      expect(screen.textContent).toContain('4/5 startup checks settled');
    });
    expect(screen.dataset.state).toBe('loading');
    expect(screen.querySelector('[data-bootstrap-step="route"]')?.getAttribute('data-status')).toBe(
      'pending'
    );

    await act(async () => {
      pendingModule.resolve({ default: ReadyRunRoute });
      await pendingModule.promise;
    });

    await waitFor(() => {
      expect(screen.dataset.state).toBe('complete');
      expect(mounted?.container.querySelector('[data-testid="deferred-run-ready"]')).not.toBeNull();
    });
    expect(screen.querySelector('[data-bootstrap-step="route"]')?.textContent).toContain(
      readyPresentation.detail
    );
    expect(mounted?.container.querySelector('[data-slot="app-route-error-boundary"]')).toBeNull();
  });

  it('preserves a rejected CSS import as a visible startup error through later capability settlement', async () => {
    const pendingModule = createPendingModule();
    await mountDeferredRoute(pendingModule);
    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="plugin-route-module-loading"]')
      ).not.toBeNull();
    });

    await act(async () => {
      pendingModule.reject(new Error(cssFailureMessage));
      await pendingModule.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.dataset.state).toBe('error'));
    expect(screen.querySelector('#app-loading-message')?.textContent).toBe(cssFailureMessage);
    expect(screen.querySelector('[data-bootstrap-step="route"]')?.getAttribute('data-status')).toBe(
      'error'
    );

    await act(async () => {
      mounted?.queryClient.setQueryData(queryKeys.shell.capabilities(), {
        apiVersion: '1.0.0',
        minFrontendVersion: '1.0.1',
        plugins: {},
      });
    });

    expect(screen.dataset.state).toBe('error');
    expect(screen.querySelector('#app-loading-message')?.textContent).toBe(cssFailureMessage);
    expect(
      mounted?.container.querySelector('[data-slot="plugin-route-module-loading"]')
    ).toBeNull();
  });

  it('exposes the original CSS error and recovery controls when an import fails after startup', async () => {
    const pendingModule = createPendingModule();
    await mountDeferredRoute(pendingModule, '/plugins');
    await waitFor(() => expect(document.getElementById('app-loading-screen')).toBeNull());

    await act(async () => {
      await router?.navigate('/runs/bootstrap-proof');
    });
    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="plugin-route-module-loading"]')
      ).not.toBeNull();
    });
    await act(async () => {
      pendingModule.reject(new Error(cssFailureMessage));
      await pendingModule.promise.catch(() => undefined);
    });

    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="app-route-error-boundary"]')?.textContent
      ).toContain(cssFailureMessage);
    });
    expect(mounted?.container.querySelector('[data-slot="app-route-error-reload"]')).toBeInstanceOf(
      HTMLButtonElement
    );
    expect(
      mounted?.container.querySelector('[data-slot="app-route-error-home"]')?.getAttribute('href')
    ).toBe('/');
    expect(mounted?.container.querySelector('[data-slot="app-shell-frame"]')).not.toBeNull();
    expect(
      mounted?.container.querySelector('[data-slot="plugin-route-module-loading"]')
    ).toBeNull();
  });
});
