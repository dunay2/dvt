// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import AdminView from './AdminView';

function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
  return {
    getGraphSnapshot: async () => ({ nodes: [], edges: [] }),
    getDiffChanges: async () => [],
    getPlugins: async () => [],
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
    listWarehouseConnections: async () => [],
    listWarehouseTables: async () => [],
    importSources: async () => ({
      success: true,
      sourcesCreated: 0,
      tablesImported: 0,
      yamlFiles: [],
      grouping: 'schema',
      options: { includeColumns: false, addTests: false, addFreshness: false },
    }),
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content: '',
      lastModified: '2026-04-06T00:00:00Z',
    }),
    saveFileContent: async (path, content) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content,
      lastModified: '2026-04-06T00:00:00Z',
    }),
    ...overrides,
  };
}

function createAdminRouteElement(
  initialTab?: 'platform' | 'roles' | 'permissions' | 'audit'
): React.ReactElement {
  return (
    <AppServicesProvider
      overrides={{
        mode: 'mock',
        capabilitiesPort: {
          loadCapabilities: async () => ({
            apiVersion: '1.0.0',
            minFrontendVersion: '1.0.0',
            plugins: { dbt: { available: true } },
          }),
        },
        workspaceService: buildWorkspaceService(),
      }}
    >
      <AdminView initialTab={initialTab} />
    </AppServicesProvider>
  );
}

function createAdminRouteRouter({
  initialEntry = '/admin',
  initialTab,
}: {
  initialEntry?: string;
  initialTab?: 'platform' | 'roles' | 'permissions' | 'audit';
} = {}): ReturnType<typeof createMemoryRouter> {
  return createMemoryRouter(
    [
      {
        path: '/admin',
        element: createAdminRouteElement(initialTab),
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

class TestResizeObserver implements ResizeObserver {
  private readonly observedElements = new Set<Element>();

  constructor(_callback: ResizeObserverCallback) {}

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
      return new Response('{}', { status: 200 });
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

  it('renders platform and roles data from services', async () => {
    const router = createAdminRouteRouter();
    mounted = await withTestQueryClient(<RouterProvider router={router} />);

    await waitForReactQuery(() => mounted?.container.textContent?.includes('Admin') === true, {
      description: 'admin roles render',
    });

    expect(mounted.container.textContent).toContain('Admin & RBAC');
    expect(mounted.container.textContent).toContain('Backend status');
    expect(mounted.container.textContent).toContain('Admin');
  });

  it('filters audit entries by search query', async () => {
    const router = createAdminRouteRouter({ initialTab: 'audit' });
    mounted = await withTestQueryClient(<RouterProvider router={router} />);

    await waitForReactQuery(() => mounted?.container.textContent?.includes('Admin') === true, {
      description: 'admin roles render before audit tab',
    });

    await waitFor(() => {
      expect(document.querySelector('input[placeholder="Search audit log..."]')).toBeTruthy();
    });
    const input = document.querySelector(
      'input[placeholder="Search audit log..."]'
    ) as HTMLInputElement | null;

    await act(async () => {
      if (input) {
        fireEvent.change(input, { target: { value: 'anne' } });
      }
    });

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain('plan://alpha');
      expect(mounted?.container.textContent).not.toContain('rbac://admin');
    });
  });

  it('records the selected tab in the route so F5 keeps the operator position', async () => {
    const router = createAdminRouteRouter();
    mounted = await withTestQueryClient(<RouterProvider router={router} />);

    await waitForReactQuery(() => mounted?.container.textContent?.includes('Admin') === true, {
      description: 'admin route ready before tab navigation',
    });

    const auditTab = Array.from(mounted?.container.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.includes('Audit Log') === true
    );

    await act(async () => {
      fireEvent.mouseDown(auditTab as HTMLElement, { button: 0 });
      fireEvent.click(auditTab as HTMLElement);
    });

    expect(router.state.location.search).toBe('?tab=audit');
  });

  it('hydrates the selected tab from the route after a browser refresh', async () => {
    const router = createAdminRouteRouter({ initialEntry: '/admin?tab=audit' });
    mounted = await withTestQueryClient(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(document.querySelector('input[placeholder="Search audit log..."]')).toBeTruthy();
    });
  });
});
