// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  FileContent,
  IWorkspaceDiffQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
} from '../ports/workspace';
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

function buildFileContent(path: string): FileContent {
  if (path.includes('dim_store')) {
    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: [
        'SELECT',
        '  s.store_id,',
        '  s.store_name,',
        '  s.store_city',
        'FROM raw.store_dim s',
      ].join('\n'),
      lastModified: '2026-04-06T00:00:00Z',
    };
  }

  return {
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
  };
}

function buildDiffViewWorkspacePorts(overrides?: {
  graph?: Partial<IWorkspaceGraphSnapshotQueryPort>;
  diff?: Partial<IWorkspaceDiffQueryPort>;
  files?: Partial<IWorkspaceFilesQueryPort>;
}): {
  workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  workspaceDiffQuery: IWorkspaceDiffQueryPort;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
} {
  const workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort = {
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
    ...overrides?.graph,
  };
  const workspaceDiffQuery: IWorkspaceDiffQueryPort = {
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
    ...overrides?.diff,
  };
  const workspaceFilesQuery: IWorkspaceFilesQueryPort = {
    listFiles: async () => [],
    getFileContent: async (path) => buildFileContent(path),
    ...overrides?.files,
  };
  return {
    workspaceGraphSnapshotQuery,
    workspaceDiffQuery,
    workspaceFilesQuery,
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
          ...buildDiffViewWorkspacePorts(),
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

  it('renders the governed empty state when no diff changes are available', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            diff: { getDiffChanges: async () => [] },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-empty-state"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Diff Viewer');
    expect(mounted.container.textContent).toContain('No diff changes available');
    expect(mounted.container.textContent).not.toContain('Graph Diff');
  });

  it('renders the governed error state when diff changes fail to load', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            diff: {
              getDiffChanges: async () => {
                throw new Error('Diff pipeline offline');
              },
            },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-error-state"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Unable to load diff review');
    expect(mounted.container.textContent).toContain('Diff pipeline offline');
    expect(mounted.container.textContent).toContain('Diff Viewer');
  });

  it('keeps diff header and summary outside the scroll-owned body', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts(),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'diff changes render before layout assertions',
    });

    const header = mounted.container.querySelector('[data-slot="route-workbench-header"]');
    const body = mounted.container.querySelector('[data-slot="route-workbench-body"]');
    const compareCodes = Array.from(header?.querySelectorAll('code') ?? []);

    expect(header?.querySelector('[data-slot="diff-header"]')).not.toBeNull();
    expect(header?.querySelector('[data-slot="diff-summary-cards"]')).not.toBeNull();
    expect(body?.querySelector('[data-slot="diff-header"]')).toBeNull();
    expect(body?.querySelector('[data-slot="diff-summary-cards"]')).toBeNull();
    expect(body?.querySelector('[data-slot="diff-tabs"]')).not.toBeNull();
    expect(compareCodes.length).toBeGreaterThanOrEqual(2);
    expect(compareCodes[0]?.className).toContain('border');
    expect(compareCodes[1]?.className).toContain('border');
  });

  it('renders Monaco-backed SQL diff when the SQL tab is selected', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts(),
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

  it('shows governed SQL loading state while workspace file content is still loading', async () => {
    let resolveFileContent!: (value: FileContent) => void;

    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            files: {
              getFileContent: () =>
                new Promise<FileContent>((resolve) => {
                  resolveFileContent = resolve;
                }),
            },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'diff changes render before SQL loading assertions',
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
      expect(
        mounted?.container.querySelector('[data-slot="diff-sql-loading-state"]')
      ).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Loading SQL preview');
    expect(mounted.container.querySelector('[data-testid="monaco-diff-viewer"]')).toBeNull();

    resolveFileContent(buildFileContent('models/marts/fct_sales.sql'));
  });

  it('shows governed SQL preview error when the current workspace file fails to load', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            files: {
              getFileContent: async () => {
                throw new Error('Workspace file preview offline');
              },
            },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'diff changes render before SQL error assertions',
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
      expect(mounted?.container.querySelector('[data-slot="diff-sql-error-state"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Unable to load SQL preview');
    expect(mounted.container.textContent).toContain('Workspace file preview offline');
    expect(mounted.container.querySelector('[data-testid="monaco-diff-viewer"]')).toBeNull();
  });

  it('derives catalog summary highlights from the actual diff document', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            diff: {
              getDiffChanges: async () => [
                {
                  id: '3',
                  nodeId: 'fct_sales',
                  type: 'changed',
                  severity: 'warning',
                  description: 'Column type changed: order_date',
                  oldValue: 'DATE',
                  newValue: 'TIMESTAMP',
                },
                {
                  id: '4',
                  nodeId: 'fct_sales',
                  type: 'added',
                  severity: 'info',
                  description: 'Column added: gross_amount',
                  oldValue: null,
                  newValue: 'gross_amount NUMERIC(18,2)',
                },
              ],
            },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'diff changes render before catalog assertions',
    });

    const catalogTab = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Catalog Diff')
    );
    expect(catalogTab).toBeTruthy();

    await act(async () => {
      if (catalogTab) {
        fireEvent.mouseDown(catalogTab, { button: 0 });
        fireEvent.click(catalogTab);
      }
    });

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-catalog-summary"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('order_date');
    expect(mounted.container.textContent).toContain('DATE -> TIMESTAMP');
    expect(mounted.container.textContent).toContain('gross_amount');
    expect(mounted.container.textContent).toContain('NUMERIC(18,2)');
    expect(mounted.container.textContent).toContain('Column Added');
    expect(mounted.container.textContent).toContain('Type Changed');
    expect(mounted.container.textContent).not.toContain('discount_amount');
    expect(mounted.container.textContent).not.toContain('Column Removed');
  });

  it('preserves graph review and shows compare-context fallback when the changed node is missing from the graph', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            graph: {
              getGraphSnapshot: async () => ({
                nodes: [],
                edges: [],
              }),
            },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'graph diff still renders when compare context is missing',
    });

    expect(mounted.container.textContent).toContain('fct_sales');

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
      expect(
        mounted?.container.querySelector('[data-slot="diff-sql-unavailable-state"]')
      ).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Compare context unavailable');
    expect(mounted.container.querySelector('[data-testid="monaco-diff-viewer"]')).toBeNull();
  });

  it('filters to breaking changes only', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          ...buildDiffViewWorkspacePorts({
            graph: {
              getGraphSnapshot: async () => ({
                nodes: [
                  {
                    id: 'dim_store',
                    name: 'dim_store',
                    type: 'MODEL',
                    package: 'analytics',
                    path: 'models/dimensions/dim_store.sql',
                    tags: [],
                    status: 'success',
                    dependencies: [],
                    compiledSql: [
                      'SELECT',
                      '  s.store_id,',
                      '  s.store_name',
                      'FROM raw.store_dim s',
                    ].join('\n'),
                    columns: [
                      { name: 'store_id', type: 'INTEGER', nullable: false },
                      { name: 'store_name', type: 'TEXT', nullable: false },
                      { name: 'store_city', type: 'TEXT', nullable: true },
                    ],
                  },
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
            },
            diff: {
              getDiffChanges: async () => [
                {
                  id: '1',
                  nodeId: 'dim_store',
                  type: 'added',
                  severity: 'info',
                  description: 'Column added: store_region',
                  oldValue: null,
                  newValue: 'store_region TEXT',
                },
                {
                  id: '2',
                  nodeId: 'fct_sales',
                  type: 'changed',
                  severity: 'breaking',
                  description: 'Column removed: discount_amount',
                  oldValue: 'discount_amount DECIMAL',
                  newValue: null,
                },
              ],
            },
          }),
        }}
      >
        <DiffView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('dim_store') === true, {
      description: 'initial diff changes render for both nodes',
    });

    const breakingButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Breaking Only')
    );
    expect(breakingButton).toBeTruthy();

    await act(async () => {
      breakingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain('fct_sales');
      expect(mounted?.container.textContent).not.toContain('dim_store');
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
    expect(mounted.container.textContent).toContain('models/marts/fct_sales.sql (current)');
    expect(mounted.container.textContent).not.toContain('dim_store (current)');

    const catalogTab = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Catalog Diff')
    );
    expect(catalogTab).toBeTruthy();

    await act(async () => {
      if (catalogTab) {
        fireEvent.mouseDown(catalogTab, { button: 0 });
        fireEvent.click(catalogTab);
      }
    });

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-catalog-summary"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('fct_sales');
    expect(mounted.container.textContent).toContain('discount_amount');
    expect(mounted.container.textContent).toContain('Column Removed');
    expect(mounted.container.textContent).not.toContain('store_region');
    expect(mounted.container.textContent).not.toContain('Column Added');
  });
});
