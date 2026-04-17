// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AppProviders from './AppProviders';
import { createAppRoutes } from './routes';
import { createTestQueryClient, waitForReactQuery } from '../testing/reactQueryHarness';
import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from './views/canvas/canvasDraftPresentationState';

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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();

    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('renders a controlled fallback when route runtime dependencies are missing', async () => {
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
        container.querySelector('[data-slot="app-route-error-boundary"]') !== null &&
        container.textContent?.includes('The application hit an unexpected error.') === true,
      {
        description: 'route error boundary fallback',
      }
    );

    expect(container.textContent).toContain('AppServicesProvider is required to consume app services.');
    expect(container.textContent).not.toContain('Unexpected Application Error!');
  });

  it('renders the canvas route when app providers are present', async () => {
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
        <AppProviders overrides={{ mode: 'mock', capabilitiesPort }}>
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
    const leftNavigationCaptions = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="left-navigation-caption"]'),
    ].map((node) => node.textContent?.trim());
    expect(leftNavigationCaptions).toContain('Canvas');
    expect(capabilitiesPort.loadCapabilities).toHaveBeenCalledTimes(1);
  });

  it('declares bootstrap contracts for the active route set in route metadata', () => {
    const rootRoute = createAppRoutes()[0];
    const canvasRoute = rootRoute?.children?.find((route) => route.path === 'canvas');
    const lineageRoute = rootRoute?.children?.find((route) => route.path === 'lineage');
    const runsRoute = rootRoute?.children?.find((route) => route.path === 'runs');
    const costRoute = rootRoute?.children?.find((route) => route.path === 'cost');
    const pluginsRoute = rootRoute?.children?.find((route) => route.path === 'plugins');

    expect(canvasRoute?.id).toBe('dbt.canvas');
    expect(canvasRoute?.handle).toEqual({
      routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
    });
    expect(lineageRoute?.id).toBe('dbt.lineage');
    expect(lineageRoute?.handle).toMatchObject({
      routeBootstrap: {
        mode: 'published',
      },
    });
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
  });
});
