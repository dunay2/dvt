// @vitest-environment jsdom

import { waitFor, within } from '@testing-library/dom';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import { createStaticRouteBootstrapHandle } from './bootstrap/routeBootstrapContract';
import { createPlatformHealthSnapshot } from '../capabilities/platform-health/testing/platformHealthFixtures';
import { withTestQueryClient } from '../testing/reactQueryHarness';
import AppProviders from './AppProviders';
import Root from './Root';
import { createBrokenRootShellNode } from './Root.bootstrapRoute.test.support';
import { RootServicesProbe } from './Root.test.support';

afterEach(() => {
  vi.restoreAllMocks();
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
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
      consoleErrorSpy.mockRestore();
      await mounted.cleanup();
    }
  });
});
