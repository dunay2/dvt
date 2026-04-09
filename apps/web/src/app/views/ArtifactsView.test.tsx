// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import ArtifactsView from './ArtifactsView';

vi.mock('../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ path, value }: { path?: string; value: string }) => (
    <div data-path={path} data-testid="monaco-code-viewer">
      {value}
    </div>
  ),
}));

describe('ArtifactsView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
    return {
      getGraphSnapshot: async () => ({ nodes: [], edges: [] }),
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
        options: { includeColumns: false, addTests: false, addFreshness: false },
      }),
      listFiles: async () => [
        {
          path: 'target',
          name: 'target',
          kind: 'directory',
          children: [
            { path: 'target/manifest.json', name: 'manifest.json', kind: 'file' },
            { path: 'target/run_results.json', name: 'run_results.json', kind: 'file' },
            { path: 'target/catalog.json', name: 'catalog.json', kind: 'file' },
          ],
        },
      ],
      getFileContent: async (path) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'json',
        content: JSON.stringify({ metadata: { dbt_schema_version: 'workspace', path } }),
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

  beforeEach(() => {
    mounted = null;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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

  it('renders import area, workspace artifacts and preview tabs', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
        }}
      >
        <ArtifactsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('target/manifest.json') === true,
      { description: 'workspace artifact previews render' }
    );

    expect(mounted.container.textContent).toContain('dbt Artifacts');
    expect(mounted.container.textContent).toContain('Import Manifest');
    expect(mounted.container.textContent).toContain('Drop manifest.json here');
    expect(mounted.container.textContent).toContain('Server Artifacts');
    expect(mounted.container.textContent).toContain('manifest.json');
    expect(mounted.container.textContent).toContain('run_results.json');
    expect(mounted.container.textContent).toContain('catalog.json');
    expect(mounted.container.querySelector('[data-testid="monaco-code-viewer"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('target/manifest.json');
    expect(mounted.container.textContent).toContain('About dbt Artifacts');
  });
});
