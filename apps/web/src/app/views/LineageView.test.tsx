// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import LineageView from './LineageView';

function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
  return {
    getGraphSnapshot: async () => ({
      nodes: [
        {
          id: 'model.fct_orders',
          name: 'fct_orders',
          type: 'MODEL',
          package: 'analytics',
          path: 'models/fct_orders.sql',
          tags: [],
          status: 'success',
          dependencies: ['source.orders'],
          columns: [{ name: 'order_id', type: 'int', nullable: false }],
        },
        {
          id: 'source.orders',
          name: 'source_orders',
          type: 'SOURCE',
          package: 'analytics',
          path: 'models/source_orders.yml',
          tags: [],
          status: 'success',
          dependencies: [],
          columns: [{ name: 'order_id', type: 'int', nullable: false }],
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'source.orders',
          target: 'model.fct_orders',
          type: 'source',
        },
      ],
    }),
    getDiffChanges: async () => [],
    getPlugins: async () => [],
    getRoles: async () => [],
    getAuditLog: async () => [],
    listWarehouseConnections: async () => [],
    listWarehouseTables: async () => [],
    importSources: async () => ({
      success: true,
      sourcesCreated: 0,
      tablesImported: 0,
      yamlFiles: [],
      grouping: 'schema',
      options: {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    }),
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: '',
      lastModified: '2026-04-06T00:00:00Z',
    }),
    saveFileContent: async (path, content) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content,
      lastModified: '2026-04-06T00:00:00Z',
    }),
    ...overrides,
  };
}

describe('LineageView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

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
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders lineage graph and impact summary', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_orders') === true, {
      description: 'lineage graph render',
    });

    expect(mounted.container.textContent).toContain('Lineage Analysis');
    expect(mounted.container.textContent).toContain('Impact Summary');
    expect(mounted.container.textContent).toContain('fct_orders');
  });

  it('switches to column-level lineage', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_orders') === true, {
      description: 'lineage graph render for column mode',
    });

    const searchInput = document.querySelector('input');
    expect(searchInput).toBeTruthy();
    await act(async () => {
      if (searchInput) {
        searchInput.value = 'fct_orders';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const switchInput = document.getElementById('column-level');
    expect(switchInput).toBeTruthy();
    await act(async () => {
      switchInput?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mounted.container.textContent).toContain('Column lineage:');
    expect(mounted.container.textContent).toContain('source_orders.order_id');
    expect(mounted.container.textContent).toContain('fct_orders.order_id');
  });
});
