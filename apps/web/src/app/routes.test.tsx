// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { createAppServicesTestOverrides } from '../testing/appServicesTestDoubles';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUsePublishedRouteBootstrap = vi.hoisted(() => vi.fn());

vi.mock('./bootstrap/usePublishedRouteBootstrap', () => ({
  usePublishedRouteBootstrap: (...args: unknown[]) => mockUsePublishedRouteBootstrap(...args),
}));

import AppProviders from './AppProviders';
import {
  findChildRouteById,
  findChildRouteByPath,
  getRootRoute,
  readLeftNavigationCaptions,
} from './appRoute.test.support';
import { createHydrationCompleteBootstrapCommand } from './bootstrap/appBootstrapCommands';
import { setBootstrapStepStatus, startBootstrapScreen } from './bootstrap/appBootstrapScreen';
import type { CapabilitiesResponse } from './queries/useCapabilitiesQuery';
import { createAppRoutes } from './routes';
import { createTestQueryClient, waitForReactQuery } from '../testing/reactQueryHarness';
import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from './views/canvas/canvasDraftPresentationStore';

const jsonHeaders = {
  'content-type': 'application/json',
};

const ROUTE_INTEGRATION_TIMEOUT_MS = 15_000;

function mountBootstrapDom(): void {
  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <div id="app-loading-screen" data-state="loading">
        <output id="app-loading-announcement"></output>
        <h1 id="app-loading-title"></h1>
        <p id="app-loading-message"></p>
        <ul id="app-loading-steps">
          <li data-bootstrap-step="hydrate" data-status="pending"><span data-bootstrap-detail></span></li>
          <li data-bootstrap-step="services" data-status="pending"><span data-bootstrap-detail></span></li>
          <li data-bootstrap-step="capabilities" data-status="pending"><span data-bootstrap-detail></span></li>
          <li data-bootstrap-step="health" data-status="pending"><span data-bootstrap-detail></span></li>
          <li data-bootstrap-step="route" data-status="pending"><span data-bootstrap-detail></span></li>
        </ul>
        <div id="app-loading-progress"></div>
        <span id="app-loading-version"></span>
        <span id="app-loading-build-date"></span>
      </div>
    `
  );
}

function buildAuthenticatedSessionResponse(): Response {
  return new Response(
    JSON.stringify({
      authenticated: true,
      permissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canPersistGraphDraft: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
}

function buildWorkspaceContextResponse(): Response {
  return new Response(
    JSON.stringify({
      defaultWorkspace: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        projectName: 'Analytics',
        environmentId: 'dev',
      },
      availableWorkspaces: [
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          projectName: 'Analytics',
          environmentId: 'dev',
        },
      ],
      deploymentScope: {
        targetAdapter: 'temporal',
        availableTargetAdapters: ['temporal'],
      },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
}

function buildEmptyJsonResponse(status = 200): Response {
  return new Response(JSON.stringify({}), {
    status,
    headers: jsonHeaders,
  });
}

function buildAuthenticatedRouteResponse(url: string): Response | undefined {
  if (url.endsWith('/session')) {
    return buildAuthenticatedSessionResponse();
  }

  if (url.endsWith('/workspace/context')) {
    return buildWorkspaceContextResponse();
  }

  return undefined;
}

function stubAuthenticatedSessionFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    return buildAuthenticatedRouteResponse(String(input)) ?? buildEmptyJsonResponse();
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubMissingSessionRouteFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/session')) {
      return new Response(
        JSON.stringify({
          error: {
            type: 'not_found',
            reason: 'route_not_registered',
          },
        }),
        {
          status: 404,
          headers: jsonHeaders,
        }
      );
    }

    return buildEmptyJsonResponse();
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('app routes', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUsePublishedRouteBootstrap.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();

    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('redirects protected routes to login when session resolution is unavailable', async () => {
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/canvas'],
    });
    const queryClient = createTestQueryClient();

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );
    });

    await waitForReactQuery(() => container.textContent?.includes('Login required') === true, {
      description: 'login gate fallback',
    });

    expect(container.textContent).toContain('Login required');
  });

  it('shows protected runtime unavailable guidance when session route is not mounted', async () => {
    stubMissingSessionRouteFetch();
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/canvas'],
    });
    const queryClient = createTestQueryClient();

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );
    });

    await waitForReactQuery(
      () =>
        container.textContent?.includes(
          'Protected runtime session route is unavailable. Verify OIDC/API runtime posture.'
        ) === true,
      {
        description: 'runtime unavailable login guidance',
      }
    );

    expect(container.textContent).toContain('Login required');
  });

  it('settles the startup gate for the public login route without resolving workspace runtime', async () => {
    vi.useFakeTimers();
    mountBootstrapDom();
    startBootstrapScreen();
    setBootstrapStepStatus(createHydrationCompleteBootstrapCommand());
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/login?returnTo=%2F'],
    });

    await act(async () => {
      root.render(
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      );
    });

    await waitForReactQuery(() => container.textContent?.includes('Login required') === true, {
      description: 'public login route',
    });
    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    expect(document.getElementById('app-loading-screen')).toBeNull();
    expect(container.textContent).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(mockUsePublishedRouteBootstrap).not.toHaveBeenCalled();
  });

  it('recovers a configured local bearer session from the login route and returns to the protected route', async () => {
    const refreshUrl = 'http://auth.example/__dvt/local-protected-runtime/token';
    vi.stubEnv('VITE_API_BEARER_TOKEN_REFRESH_URL', refreshUrl);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === refreshUrl) {
        return new Response(JSON.stringify({ bearerToken: 'fresh-dev-bearer-token' }), {
          status: 200,
          headers: jsonHeaders,
        });
      }

      return buildAuthenticatedRouteResponse(url) ?? buildEmptyJsonResponse();
    });
    vi.stubGlobal('fetch', fetchMock);
    const capabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue({
        apiVersion: '1.0.0',
        minFrontendVersion: '1.0.0',
        plugins: {},
      }),
    };
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/login?returnTo=%2Fcanvas'],
    });

    await act(async () => {
      root.render(
        <AppProviders overrides={{ ...createAppServicesTestOverrides(), capabilitiesPort }}>
          <RouterProvider router={router} />
        </AppProviders>
      );
    });

    await waitForReactQuery(() => container.textContent?.includes('Login required') === true, {
      description: 'public login route',
    });
    const recoveryButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start local dev session')
    );

    expect(recoveryButton).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      fireEvent.click(recoveryButton as HTMLButtonElement);
      await Promise.resolve();
    });

    await waitForReactQuery(
      () => container.querySelector('[data-slot="app-shell-frame"]') !== null,
      {
        description: 'protected shell after local session recovery',
      }
    );

    expect(router.state.location.pathname).toBe('/canvas');
    expect(fetchMock).toHaveBeenCalledWith(refreshUrl, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
  });

  it('keeps the user on login when local bearer session recovery fails', async () => {
    const refreshUrl = 'http://auth.example/__dvt/local-protected-runtime/token';
    vi.stubEnv('VITE_API_BEARER_TOKEN_REFRESH_URL', refreshUrl);
    const fetchMock = vi.fn(async () => buildEmptyJsonResponse(500));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/login?returnTo=%2Fcanvas'],
    });

    await act(async () => {
      root.render(
        <AppProviders overrides={createAppServicesTestOverrides()}>
          <RouterProvider router={router} />
        </AppProviders>
      );
    });

    await waitForReactQuery(() => container.textContent?.includes('Login required') === true, {
      description: 'public login route',
    });
    const recoveryButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start local dev session')
    );

    expect(recoveryButton).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      fireEvent.click(recoveryButton as HTMLButtonElement);
      await Promise.resolve();
    });

    await waitForReactQuery(
      () =>
        container.textContent?.includes(
          'Local session recovery did not return a usable bearer token'
        ) === true,
      {
        description: 'local session recovery failure',
      }
    );

    expect(router.state.location.pathname).toBe('/login');
    expect(fetchMock).toHaveBeenCalledWith(refreshUrl, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
  });

  it('renders the canvas route when app providers are present', async () => {
    stubAuthenticatedSessionFetch();
    const capabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue({
        apiVersion: '1.0.0',
        minFrontendVersion: '1.0.0',
        plugins: {},
      }),
    };
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/canvas'],
    });

    await act(async () => {
      root.render(
        <AppProviders overrides={{ ...createAppServicesTestOverrides(), capabilitiesPort }}>
          <RouterProvider router={router} />
        </AppProviders>
      );
    });

    await waitForReactQuery(
      () => container.querySelector('[data-slot="app-shell-frame"]') !== null,
      {
        description: 'app shell frame',
      }
    );

    expect(container.querySelector('[data-slot="app-route-error-boundary"]')).toBeNull();
    expect(container.textContent).not.toContain('Unexpected Application Error!');
    expect(container.querySelector('[data-slot="shell-active-surface"]')).toBeNull();
    expect(readLeftNavigationCaptions(container)).toEqual([]);
    expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
  });

  it('keeps retired Canvas workbench route shapes out of active routing', () => {
    const rootRoute = getRootRoute(createAppRoutes());

    expect(findChildRouteByPath(rootRoute, 'canvas/:workbenchTab')).toBeUndefined();
    expect(findChildRouteByPath(rootRoute, 'canvas/*')).toBeUndefined();
  });

  it(
    'waits for backend plugin capabilities before redirecting direct plugin routes',
    async () => {
      stubAuthenticatedSessionFetch();
      const capabilitiesPort = {
        loadCapabilities: vi.fn(() => new Promise<CapabilitiesResponse>(() => {})),
      };
      const router = createMemoryRouter(createAppRoutes(), {
        initialEntries: ['/cost'],
      });

      await act(async () => {
        root.render(
          <AppProviders overrides={{ ...createAppServicesTestOverrides(), capabilitiesPort }}>
            <RouterProvider router={router} />
          </AppProviders>
        );
      });

      await waitForReactQuery(() => container.textContent?.includes('Loading view...') === true, {
        description: 'pending backend plugin capability route guard',
        timeoutMs: ROUTE_INTEGRATION_TIMEOUT_MS,
      });

      expect(router.state.location.pathname).toBe('/cost');
      expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
    },
    ROUTE_INTEGRATION_TIMEOUT_MS
  );

  it('declares bootstrap contracts for the active route set in route metadata', () => {
    const rootRoute = getRootRoute(createAppRoutes());
    const redirectRoute = findChildRouteById(rootRoute, 'shell.default-core-redirect');
    const canvasRoute = findChildRouteByPath(rootRoute, 'canvas');
    const lineageRoute = findChildRouteByPath(rootRoute, 'lineage');
    const codeRoute = findChildRouteByPath(rootRoute, 'code');
    const diffRoute = findChildRouteByPath(rootRoute, 'diff');
    const artifactsRoute = findChildRouteByPath(rootRoute, 'artifacts');
    const runsRoute = findChildRouteByPath(rootRoute, 'runs');
    const costRoute = findChildRouteByPath(rootRoute, 'cost');
    const pluginsRoute = findChildRouteByPath(rootRoute, 'plugins');
    const adminRoute = findChildRouteByPath(rootRoute, 'admin');

    expect(redirectRoute?.id).toBe('shell.default-core-redirect');
    expect(redirectRoute?.handle).toMatchObject({
      routeBootstrap: {
        mode: 'published',
        initialPresentation: {
          detail: 'Selecting initial workspace route',
        },
      },
    });
    expect(canvasRoute?.id).toBe('dbt.canvas');
    expect(canvasRoute?.handle).toEqual({
      routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
    });
    expect(findChildRouteByPath(rootRoute, 'canvas/:workbenchTab')).toBeUndefined();
    expect(codeRoute).toBeUndefined();
    expect(lineageRoute).toBeUndefined();
    expect(diffRoute).toBeUndefined();
    expect(artifactsRoute).toBeUndefined();
    expect(runsRoute?.id).toBe('monitoring.runs');
    expect(runsRoute?.handle).toMatchObject({
      routeBootstrap: {
        mode: 'published',
      },
    });
    expect(costRoute?.id).toBe('cost.dashboard');
    expect(costRoute?.handle).toMatchObject({
      routeBootstrap: {
        mode: 'published',
      },
    });
    expect(pluginsRoute?.id).toBe('shell.plugins');
    expect(pluginsRoute?.handle).toMatchObject({
      routeBootstrap: {
        mode: 'static',
      },
    });
    expect(adminRoute?.id).toBe('shell.admin');
    expect(adminRoute?.handle).toMatchObject({
      routeBootstrap: {
        mode: 'static',
      },
    });
  });

  it('contains plugin route render failures below the application shell', () => {
    const rootRoute = getRootRoute(createAppRoutes());
    const pluginRoutes = rootRoute.children?.filter((route) =>
      ['monitoring.runs', 'cost.dashboard'].includes(route.id ?? '')
    );

    expect(pluginRoutes).toHaveLength(2);
    expect(pluginRoutes?.every((route) => route.errorElement != null)).toBe(true);
  });

  it(
    'publishes the default redirect route through explicit route bootstrap ownership',
    async () => {
      stubAuthenticatedSessionFetch();
      const capabilitiesPort = {
        loadCapabilities: vi.fn().mockResolvedValue({
          apiVersion: '1.0.0',
          minFrontendVersion: '1.0.0',
          plugins: {},
        }),
      };
      const router = createMemoryRouter(createAppRoutes(), {
        initialEntries: ['/'],
      });

      await act(async () => {
        root.render(
          <AppProviders overrides={{ ...createAppServicesTestOverrides(), capabilitiesPort }}>
            <RouterProvider router={router} />
          </AppProviders>
        );
      });

      await waitForReactQuery(
        () =>
          mockUsePublishedRouteBootstrap.mock.calls.some(
            ([routeId, presentation]) =>
              routeId === 'shell.default-core-redirect' &&
              presentation &&
              typeof presentation === 'object' &&
              (presentation as { status?: string }).status === 'pending' &&
              (presentation as { detail?: string }).detail === 'Selecting initial workspace route'
          ),
        {
          description: 'default redirect route bootstrap publication',
          timeoutMs: ROUTE_INTEGRATION_TIMEOUT_MS,
        }
      );
    },
    ROUTE_INTEGRATION_TIMEOUT_MS
  );
});
