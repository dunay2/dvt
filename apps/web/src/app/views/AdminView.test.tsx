// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/dom';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppServicesProvider } from '../services/AppServicesContext';
import type { IWorkspaceAdminReadPort } from '../ports/workspace';
import { withTestQueryClient } from '../../testing/reactQueryHarness';
import AdminView from './AdminView';
import { LeftNavigationRail } from '../components/LeftNavigation';
import { buildShellNavigationModel } from '../shell/shellNavigationModel';
import { resolveShellTopBarCopy } from '../components/shell/copy';
import { platformHealthQueryKey } from '../../capabilities/platform-health';
import {
  createHealthzDto,
  createReadyzDto,
  createDbReadyDto,
  jsonResponse,
} from '../../capabilities/platform-health/testing/platformHealthHttpHarness';

function buildWorkspaceAdminReadPort(
  overrides?: Partial<IWorkspaceAdminReadPort>
): IWorkspaceAdminReadPort {
  return {
    getRoles: async () => [
      {
        id: 'role-admin',
        name: 'Admin',
        permissions: {
          canPlan: true,
          canRun: true,
          canEditEdges: true,
          canManagePlugins: true,
          canManageRBAC: true,
        },
        scope: {},
      },
    ],
    getAuditLog: async () => [
      {
        id: 'audit-1',
        timestamp: '2026-04-04T09:00:00.000Z',
        user: 'anne',
        action: 'run.start',
        resource: 'plan://alpha',
        details: 'Started run',
        status: 'success',
      },
      {
        id: 'audit-2',
        timestamp: '2026-04-04T09:10:00.000Z',
        user: 'bob',
        action: 'role.update',
        resource: 'rbac://admin',
        details: 'Updated role',
        status: 'failed',
      },
    ],
    ...overrides,
  };
}

function createAdminRouteElement(workspaceAdminRead: IWorkspaceAdminReadPort): React.ReactElement {
  return (
    <AppServicesProvider
      overrides={{
        ...createAppServicesTestOverrides(),
        capabilitiesPort: {
          loadCapabilities: async () => ({
            apiVersion: '1.0.0',
            minFrontendVersion: '1.0.0',
            plugins: { dbt: { available: true } },
          }),
        },
        workspaceAdminRead,
      }}
    >
      <LeftNavigationRail
        navigationModel={buildShellNavigationModel([])}
        copy={resolveShellTopBarCopy('en')}
      />
      <AdminView />
    </AppServicesProvider>
  );
}

function createAdminRouteRouter(
  initialEntry: string,
  workspaceAdminRead = buildWorkspaceAdminReadPort()
): ReturnType<typeof createMemoryRouter> {
  return createMemoryRouter(
    [
      {
        path: '/admin',
        element: createAdminRouteElement(workspaceAdminRead),
      },
    ],
    { initialEntries: [initialEntry] }
  );
}

function readRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

function respondToAdminProbe(input: RequestInfo | URL): Response {
  const path = new URL(readRequestUrl(input), 'http://localhost').pathname;
  if (path.endsWith('/healthz')) return jsonResponse(createHealthzDto());
  if (path.endsWith('/readyz')) return jsonResponse(createReadyzDto());
  if (path.endsWith('/db/ready')) return jsonResponse(createDbReadyDto());
  if (path.endsWith('/version')) return new Response('', { status: 404 });
  return jsonResponse({});
}

class TestResizeObserver implements ResizeObserver {
  private readonly observedElements = new Set<Element>();

  observe(target: Element): void {
    this.observedElements.add(target);
  }

  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  disconnect(): void {
    this.observedElements.clear();
  }
}

describe('AdminView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mounted = null;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = TestResizeObserver;

    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = readRequestUrl(input);
      if (url.includes('/api/capabilities')) {
        return new Response(
          JSON.stringify({
            apiVersion: '1.0.0',
            minFrontendVersion: '1.0.0',
            plugins: { dbt: { available: true } },
          }),
          { status: 200 }
        );
      }
      return respondToAdminProbe(input);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('shows four central destinations without reading protected section data', async () => {
    const read = buildWorkspaceAdminReadPort();
    const roles = vi.spyOn(read, 'getRoles');
    const audit = vi.spyOn(read, 'getAuditLog');
    const router = createAdminRouteRouter('/admin', read);
    mounted = await withTestQueryClient(<RouterProvider router={router} />);
    const directory = within(mounted.container).getByRole('navigation', { name: 'Security' });
    expect(directory.closest('[data-slot="route-workbench-primary-surface"]')).not.toBeNull();
    const destinations = within(directory).getAllByRole('link');
    expect(destinations.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Platform', '/admin?tab=platform'],
      ['Roles', '/admin?tab=roles'],
      ['Permissions', '/admin?tab=permissions'],
      ['Audit Log', '/admin?tab=audit'],
    ]);
    expect(mounted.container.querySelector('[data-slot="admin-section"]')).toBeNull();
    expect(roles).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    const rolesLink = within(directory).getByRole('link', { name: 'Roles' });
    await act(async () => fireEvent.click(rolesLink));
    const section = within(mounted.container).getByRole('region', { name: 'Roles' });
    await within(section).findByRole('heading', { name: 'Admin' });
    expect(roles).toHaveBeenCalledOnce();
  });

  it('filters audit entries by search query', async () => {
    const router = createAdminRouteRouter('/admin?tab=audit');
    mounted = await withTestQueryClient(<RouterProvider router={router} />);

    const input = within(mounted.container).getByPlaceholderText('Search audit log...');
    await act(async () => fireEvent.change(input, { target: { value: 'anne' } }));

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain('plan://alpha');
      expect(mounted?.container.textContent).not.toContain('rbac://admin');
    });
  });

  it('records the selected tab in the route so F5 keeps the operator position', async () => {
    const router = createAdminRouteRouter('/admin?filter=pending#events');
    mounted = await withTestQueryClient(<RouterProvider router={router} />);
    const directory = within(mounted.container).getByRole('navigation', { name: 'Security' });
    const audit = within(directory).getByRole('link', { name: 'Audit Log' });
    await act(async () => fireEvent.click(audit));
    expect(router.state.location.search).toBe('?filter=pending&tab=audit');
    expect(router.state.location.hash).toBe('#events');
    expect(within(mounted.container).getByRole('region', { name: 'Audit Log' })).toBeTruthy();
    const shield = within(mounted.container).getByRole('link', { name: 'Admin' });
    await act(async () => fireEvent.click(shield));
    expect(router.state.location.search).toBe('');
    expect(within(mounted.container).getByRole('navigation', { name: 'Security' })).toBeTruthy();
  });

  it('hydrates the selected tab from the route after a browser refresh', async () => {
    const router = createAdminRouteRouter('/admin?tab=audit');
    mounted = await withTestQueryClient(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(document.querySelector('input[placeholder="Search audit log..."]')).toBeTruthy();
    });
  });

  it('keeps summary and details consistent for observed readiness and an absent API version', async () => {
    // API version absence previously looked like a failed warning while readiness claimed healthy without data.
    mounted = await withTestQueryClient(
      <RouterProvider router={createAdminRouteRouter('/admin?tab=platform')} />
    );
    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
          ?.textContent
      ).toContain('Ready');
    });
    expect(
      mounted.container.querySelector('[data-slot="admin-health-probe"][data-endpoint="/readyz"]')
        ?.textContent
    ).toContain('Ready');
    expect(
      mounted.container
        .querySelector('[data-slot="admin-health-summary"][data-probe="version"]')
        ?.getAttribute('data-tone')
    ).toBe('neutral');
    expect(
      mounted.container.querySelector('[data-slot="admin-health-summary"][data-probe="version"]')
        ?.textContent
    ).toContain('Not exposed');
    expect(
      mounted.container.querySelector('[data-slot="admin-health-probe"][data-endpoint="/version"]')
        ?.textContent
    ).toContain('404');
    expect(mounted.container.textContent).not.toContain('readyz endpoint healthy');
  });

  it('renders checking while the real snapshot transport is pending', async () => {
    // Pending transport must not masquerade as an offline service before it has responded.
    let release: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((input: RequestInfo | URL) =>
      readRequestUrl(input).endsWith('/healthz')
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : Promise.resolve(respondToAdminProbe(input))
    );
    mounted = await withTestQueryClient(
      <RouterProvider router={createAdminRouteRouter('/admin?tab=platform')} />
    );
    expect(
      mounted.container.querySelector('[data-slot="admin-health-summary"][data-probe="backend"]')
        ?.textContent
    ).toContain('Checking');
    expect(
      mounted.container.querySelector('[data-slot="admin-health-summary"][data-probe="backend"]')
        ?.textContent
    ).not.toContain('Offline');
    await act(async () => {
      release?.(jsonResponse(createHealthzDto()));
    });
    await waitFor(() =>
      expect(
        mounted?.container.querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
          ?.textContent
      ).toContain('Ready')
    );
  });

  it('shows an access-denied probe as a failure in summary and details', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      readRequestUrl(input).endsWith('/readyz')
        ? jsonResponse({ error: 'forbidden' }, 403)
        : respondToAdminProbe(input)
    );
    mounted = await withTestQueryClient(
      <RouterProvider router={createAdminRouteRouter('/admin?tab=platform')} />
    );
    await waitFor(() =>
      expect(
        mounted?.container.querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
          ?.textContent
      ).toContain('Access denied')
    );
    expect(
      mounted.container
        .querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
        ?.getAttribute('data-tone')
    ).toBe('danger');
    expect(
      mounted.container.querySelector(
        '[data-slot="admin-health-probe"][data-endpoint="/readyz"] [data-tone="danger"]'
      )?.textContent
    ).toContain('Access denied');
  });

  it('does not infer readiness from an incomplete optional response', async () => {
    // An empty diagnostic body contains no positive or negative readiness fact.
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      readRequestUrl(input).endsWith('/readyz') ? jsonResponse({}) : respondToAdminProbe(input)
    );
    mounted = await withTestQueryClient(
      <RouterProvider router={createAdminRouteRouter('/admin?tab=platform')} />
    );
    await waitFor(() =>
      expect(
        mounted?.container.querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
          ?.textContent
      ).toContain('No observation')
    );
    expect(
      mounted.container
        .querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
        ?.getAttribute('data-tone')
    ).toBe('neutral');
  });

  it('marks retained healthy data historical after a failed refresh', async () => {
    mounted = await withTestQueryClient(
      <RouterProvider router={createAdminRouteRouter('/admin?tab=platform')} />
    );
    await waitFor(() =>
      expect(
        mounted?.container.querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
          ?.textContent
      ).toContain('Ready')
    );
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (readRequestUrl(input).endsWith('/healthz')) throw new Error('health transport failed');
      return respondToAdminProbe(input);
    });
    await act(async () => {
      await mounted?.queryClient.refetchQueries({ queryKey: platformHealthQueryKey });
    });
    await waitFor(
      () =>
        expect(
          mounted?.container.querySelector(
            '[data-slot="admin-health-summary"][data-probe="backend"]'
          )?.textContent
        ).toContain('Refresh failed'),
      { timeout: 5000 }
    );
    expect(
      mounted.container.querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
        ?.textContent
    ).toContain('Last observed: Ready');
    expect(
      mounted.container
        .querySelector('[data-slot="admin-health-summary"][data-probe="readyz"]')
        ?.getAttribute('data-tone')
    ).toBe('neutral');
    expect(
      mounted.container.querySelector('[data-slot="admin-health-probe"][data-endpoint="/readyz"]')
        ?.textContent
    ).toContain('Last observed: Ready');
  });
});
