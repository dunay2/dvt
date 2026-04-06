// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IWorkspacePort } from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { useArtifactsViewModel } from './useArtifactsViewModel';

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
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content: '{}',
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

function Probe(): JSX.Element {
  const viewModel = useArtifactsViewModel({ status: 'idle' });

  return (
    <div>
      <span data-testid="manifest-path">{viewModel.previewDocuments['manifest.json'].path}</span>
      <span data-testid="artifacts-count">{viewModel.artifacts.length}</span>
      <span data-testid="manifest-content">
        {JSON.stringify(viewModel.previewDocuments['manifest.json'].content)}
      </span>
    </div>
  );
}

describe('useArtifactsViewModel', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
  });

  it('uses workspace artifacts when the files exist', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'mock',
          workspaceService: buildWorkspaceService({
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
              content: JSON.stringify({ metadata: { source: 'workspace', path } }),
              lastModified: '2026-04-06T10:00:00Z',
            }),
          }),
        }}
      >
        <Probe />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('target/manifest.json') === true,
      { description: 'workspace artifact resolution' }
    );

    expect(mounted.container.querySelector('[data-testid="manifest-path"]')?.textContent).toBe(
      'target/manifest.json'
    );
    expect(mounted.container.querySelector('[data-testid="artifacts-count"]')?.textContent).toBe('3');
    expect(mounted.container.querySelector('[data-testid="manifest-content"]')?.textContent).toContain(
      '"workspace"'
    );
  });

  it('falls back to default previews when workspace artifact lookup fails', async () => {
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
        <Probe />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('manifest.json') === true,
      { description: 'artifact fallback preview' }
    );

    expect(mounted.container.querySelector('[data-testid="manifest-path"]')?.textContent).toBe(
      'manifest.json'
    );
    expect(mounted.container.querySelector('[data-testid="artifacts-count"]')?.textContent).toBe('3');
    expect(mounted.container.querySelector('[data-testid="manifest-content"]')?.textContent).toContain(
      'dbt_schema_version'
    );
  });
});
