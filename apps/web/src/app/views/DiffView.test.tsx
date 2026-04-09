// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { withTestQueryClient, waitForReactQuery } from '../../testing/reactQueryHarness';
import DiffView from './DiffView';

vi.mock('../components/monaco/MonacoDiffViewer', () => ({
  MonacoDiffViewer: ({
    modified,
    modifiedLabel,
    original,
    originalLabel,
  }: {
    modified: string;
    modifiedLabel: string;
    original: string;
    originalLabel: string;
  }) => (
    <div data-testid="monaco-diff-viewer">
      <span>{originalLabel}</span>
      <span>{modifiedLabel}</span>
      <pre>{original}</pre>
      <pre>{modified}</pre>
    </div>
  ),
}));

function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
  return {
    getGraphSnapshot: async () => ({
      nodes: [
        {
          id: 'fct_sales',
          name: 'fct_sales',
          type: 'MODEL',
          package: 'analytics',
          path: 'models/marts/fct_sales.sql',
          tags: [],
          status: 'success',
          dependencies: ['stg_orders', 'dim_store'],
          compiledSql: [
            'SELECT',
            '  o.order_id,',
            '  o.customer_id,',
            '  o.order_date,',
            '  s.store_id,',
            '  o.total_amount',
            'FROM {{ ref("stg_orders") }} o',
            'LEFT JOIN {{ ref("dim_store") }} s',
            '  ON o.store_id = s.store_id',
          ].join('\n'),
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
            { name: 'order_date', type: 'DATE', nullable: false },
            { name: 'store_id', type: 'INTEGER', nullable: true },
            { name: 'total_amount', type: 'NUMERIC(18,2)', nullable: true },
          ],
        },
      ],
      edges: [],
    }),
    getDiffChanges: async () => [
      {
        id: '1',
        nodeId: 'fct_sales',
        type: 'changed',
        severity: 'breaking',
        description: 'Column removed: discount_amount',
        oldValue: 'discount_amount DECIMAL',
        newValue: null,
      },
      {
        id: '2',
        nodeId: 'fct_sales',
        type: 'changed',
        severity: 'info',
        description: 'Added WHERE clause filter',
        oldValue: 'No filter',
        newValue: "WHERE o.order_date >= '2020-01-01'",
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
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: [
        'SELECT',
        '  o.order_id,',
        '  o.customer_id,',
        '  o.order_date,',
        '  s.store_id,',
        '  o.total_amount',
        'FROM {{ ref("stg_orders") }} o',
        'LEFT JOIN {{ ref("dim_store") }} s',
        '  ON o.store_id = s.store_id',
        "WHERE o.order_date >= '2020-01-01'",
      ].join('\n'),
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

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'diff changes render',
    });

    expect(mounted.container.textContent).toContain('Diff Viewer');
    expect(mounted.container.textContent).toContain('Graph Diff');
    expect(mounted.container.textContent).toContain('Breaking');
    expect(mounted.container.textContent).toContain('fct_sales');
  });

  it('renders Monaco-backed SQL diff when the SQL tab is selected', async () => {
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

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'diff changes render before SQL tab interaction',
    });

    const sqlTab = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('SQL Diff')
    );
    expect(sqlTab).toBeTruthy();

    await act(async () => {
      if (sqlTab) {
        fireEvent.mouseDown(sqlTab, { button: 0 });
        fireEvent.click(sqlTab);
      }
    });

    await waitFor(() => {
      expect(sqlTab?.getAttribute('data-state')).toBe('active');
      expect(mounted?.container.querySelector('[data-testid="monaco-diff-viewer"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Compiled SQL Diff: fct_sales');
    expect(mounted.container.textContent).toContain('{{ ref("stg_orders") }}');
    expect(mounted.container.textContent).toContain("WHERE o.order_date >= '2020-01-01'");
    expect(mounted.container.textContent).toContain('discount_amount');
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
      () => mounted?.container.textContent?.includes("WHERE o.order_date >= '2020-01-01'") === true,
      { description: 'initial diff changes render' }
    );

    const breakingButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Breaking Only')
    );
    expect(breakingButton).toBeTruthy();

    await act(async () => {
      breakingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mounted.container.textContent).toContain('fct_sales');
    expect(mounted.container.textContent).not.toContain('dim_store');
  });
});
