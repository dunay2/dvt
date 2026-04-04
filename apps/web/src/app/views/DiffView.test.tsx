// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { withTestQueryClient, waitForReactQuery } from '../../testing/reactQueryHarness';
import DiffView from './DiffView';

function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
  return {
    getGraphSnapshot: async () => ({ nodes: [], edges: [] }),
    getDiffChanges: async () => [
      {
        id: '1',
        nodeId: 'model.analytics.fct_sales',
        type: 'changed',
        severity: 'breaking',
        description: 'Removed discount_amount column',
        oldValue: 'DECIMAL',
        newValue: null,
      },
      {
        id: '2',
        nodeId: 'model.analytics.dim_store',
        type: 'added',
        severity: 'info',
        description: 'Added region column',
      },
    ],
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
      options: { includeColumns: false, addTests: false, addFreshness: false },
    }),
    ...overrides,
  };
}

describe('DiffView', () => {
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

  it('renders diff summary and graph items', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('model.analytics.fct_sales') === true,
      { description: 'diff changes render' }
    );

    expect(mounted.container.textContent).toContain('Diff Viewer');
    expect(mounted.container.textContent).toContain('Graph Diff');
    expect(mounted.container.textContent).toContain('Breaking');
    expect(mounted.container.textContent).toContain('model.analytics.fct_sales');
  });

  it('filters to breaking changes only', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('model.analytics.dim_store') === true,
      { description: 'initial diff changes render' }
    );

    const breakingButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Breaking Only')
    );
    expect(breakingButton).toBeTruthy();

    await act(async () => {
      breakingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mounted.container.textContent).toContain('model.analytics.fct_sales');
    expect(mounted.container.textContent).not.toContain('model.analytics.dim_store');
  });
});
