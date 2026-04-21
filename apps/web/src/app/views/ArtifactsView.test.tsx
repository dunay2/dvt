// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import ArtifactsView from './ArtifactsView';
import { useLocalManifestImport } from './artifacts/useLocalManifestImport';

vi.mock('./artifacts/useLocalManifestImport', async () => {
  const actual = await vi.importActual<typeof import('./artifacts/useLocalManifestImport')>(
    './artifacts/useLocalManifestImport'
  );

  return {
    ...actual,
    useLocalManifestImport: vi.fn(actual.useLocalManifestImport),
  };
});

vi.mock('../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ path, value }: { path?: string; value: string }) => (
    <div data-path={path} data-testid="monaco-code-viewer">
      {value}
    </div>
  ),
}));

describe('ArtifactsView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;
  const mockedUseLocalManifestImport = vi.mocked(useLocalManifestImport);

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
    mockedUseLocalManifestImport.mockReset();
    mockedUseLocalManifestImport.mockImplementation(() => ({
      state: { status: 'idle' },
      fileInputRef: { current: null },
      openFilePicker: vi.fn(),
      handleInputChange: vi.fn(),
      handleDrop: vi.fn(),
      handleDragOver: vi.fn(),
      clear: vi.fn(),
    }));
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
    expect(mounted.container.textContent).toContain('Loaded Artifacts');
    expect(mounted.container.textContent).toContain('manifest.json');
    expect(mounted.container.textContent).toContain('run_results.json');
    expect(mounted.container.textContent).toContain('catalog.json');
    expect(mounted.container.querySelector('[data-testid="monaco-code-viewer"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('target/manifest.json');
    expect(mounted.container.textContent).toContain('About dbt Artifacts');
  });

  it('keeps route header outside the scroll body and preserves section-title spacing', async () => {
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
      { description: 'workspace artifact previews render before layout assertions' }
    );

    const header = mounted.container.querySelector('[data-slot="route-workbench-header"]');
    const body = mounted.container.querySelector('[data-slot="route-workbench-body"]');
    const routeTitle = header?.querySelector('h1');
    const importHeading = Array.from(mounted.container.querySelectorAll('h2')).find((heading) =>
      heading.textContent?.includes('Import Manifest')
    );
    const artifactsHeading = Array.from(mounted.container.querySelectorAll('h2')).find((heading) =>
      heading.textContent?.includes('Loaded Artifacts')
    );

    expect(routeTitle?.textContent).toContain('dbt Artifacts');
    expect(body?.textContent).toContain('Import Manifest');
    expect(body?.textContent).toContain('Loaded Artifacts');
    expect(body?.querySelector('h1')).toBeNull();
    expect(importHeading?.className).toContain('mb-3');
    expect(artifactsHeading?.className).toContain('mb-3');
  });

  it('renders an explicit empty state when no workspace artifacts are loaded', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService({
            listFiles: async () => [],
          }),
        }}
      >
        <ArtifactsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="artifacts-empty-state"]') !== null,
      { description: 'artifacts empty state renders' }
    );

    expect(mounted.container.textContent).toContain('No artifacts loaded');
    expect(mounted.container.textContent).toContain('Import Manifest');
    expect(mounted.container.textContent).not.toContain('Loaded Artifacts');
    expect(mounted.container.querySelector('[data-testid="monaco-code-viewer"]')).toBeNull();
  });

  it('renders an explicit route error when workspace artifact loading fails', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'api',
          workspaceService: buildWorkspaceService({
            listFiles: async () => {
              throw new Error('workspace unavailable');
            },
          }),
        }}
      >
        <ArtifactsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="artifacts-error-state"]') !== null,
      { description: 'artifacts error state renders' }
    );

    expect(mounted.container.textContent).toContain('Artifacts unavailable');
    expect(mounted.container.textContent).toContain('workspace unavailable');
    expect(mounted.container.textContent).toContain('Import Manifest');
    expect(mounted.container.querySelector('[data-testid="monaco-code-viewer"]')).toBeNull();
  });

  it('renders an invalid import state when a rejected manifest is the only available source', async () => {
    mockedUseLocalManifestImport.mockImplementation(() => ({
      state: { status: 'error', message: 'Object does not look like a dbt manifest.' },
      fileInputRef: { current: null },
      openFilePicker: vi.fn(),
      handleInputChange: vi.fn(),
      handleDrop: vi.fn(),
      handleDragOver: vi.fn(),
      clear: vi.fn(),
    }));

    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService({
            listFiles: async () => [],
          }),
        }}
      >
        <ArtifactsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-slot="artifacts-invalid-import-state"]') !== null,
      { description: 'invalid import state renders' }
    );

    expect(mounted.container.textContent).toContain('Manifest import rejected');
    expect(mounted.container.textContent).toContain('Object does not look like a dbt manifest.');
    expect(mounted.container.textContent).toContain('Import Manifest');
    expect(mounted.container.querySelector('[data-testid="monaco-code-viewer"]')).toBeNull();
  });
});
