// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
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
    ...overrides,
  };
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
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;

    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
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
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <AdminView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('Admin') === true, {
      description: 'admin roles render',
    });

    expect(mounted.container.textContent).toContain('Admin & RBAC');
    expect(mounted.container.textContent).toContain('Backend status');
    expect(mounted.container.textContent).toContain('Admin');
  });

  it('filters audit entries by search query', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <AdminView initialTab="audit" />
      </AppServicesProvider>
    );

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
});
