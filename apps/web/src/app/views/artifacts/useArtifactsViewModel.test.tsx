// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IWorkspaceFilesQueryPort } from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { useArtifactsViewModel } from './useArtifactsViewModel';

function buildWorkspaceFilesQueryPort(
  overrides?: Partial<IWorkspaceFilesQueryPort>
): IWorkspaceFilesQueryPort {
  return {
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content: '{}',
      lastModified: '2026-04-06T00:00:00Z',
    }),
    ...overrides,
  };
}

function Probe(): JSX.Element {
  const viewModel = useArtifactsViewModel({ status: 'idle' });

  return (
    <div>
      <span data-testid="manifest-path">
        {viewModel.previewDocuments['manifest.json']?.path ?? 'none'}
      </span>
      <span data-testid="artifacts-count">{viewModel.artifacts.length}</span>
      <span data-testid="loading-state">{String(viewModel.isLoading)}</span>
      <span data-testid="error-message">{viewModel.errorMessage ?? 'none'}</span>
      <span data-testid="manifest-content">
        {JSON.stringify(viewModel.previewDocuments['manifest.json']?.content ?? null)}
      </span>
      <span data-testid="pipeline-path">
        {viewModel.previewDocuments['pipelines/sales_pipeline.yaml']?.path ?? 'none'}
      </span>
      <span data-testid="pipeline-content">
        {String(viewModel.previewDocuments['pipelines/sales_pipeline.yaml']?.content ?? 'none')}
      </span>
      <span data-testid="model-path">
        {viewModel.previewDocuments['models/analytics/model_orders.sql']?.path ?? 'none'}
      </span>
      <span data-testid="model-language">
        {viewModel.previewDocuments['models/analytics/model_orders.sql']?.language ?? 'none'}
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
          ...createAppServicesTestOverrides(),
          workspaceFilesQuery: buildWorkspaceFilesQueryPort({
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
    expect(mounted.container.querySelector('[data-testid="artifacts-count"]')?.textContent).toBe(
      '3'
    );
    expect(
      mounted.container.querySelector('[data-testid="manifest-content"]')?.textContent
    ).toContain('"workspace"');
  });

  it('exposes workflow project artifacts persisted in workspace files', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceFilesQuery: buildWorkspaceFilesQueryPort({
            listFiles: async () => [
              {
                path: 'pipelines',
                name: 'pipelines',
                kind: 'directory',
                children: [
                  {
                    path: 'pipelines/sales_pipeline.yaml',
                    name: 'sales_pipeline.yaml',
                    kind: 'file',
                  },
                ],
              },
              {
                path: 'models',
                name: 'models',
                kind: 'directory',
                children: [
                  {
                    path: 'models/analytics',
                    name: 'analytics',
                    kind: 'directory',
                    children: [
                      {
                        path: 'models/analytics/model_orders.sql',
                        name: 'model_orders.sql',
                        kind: 'file',
                      },
                    ],
                  },
                ],
              },
            ],
            getFileContent: async (path) => ({
              path,
              name: path.split('/').at(-1) ?? path,
              language: path.endsWith('.sql') ? 'sql' : 'yaml',
              content: path.endsWith('.sql')
                ? 'select * from raw.orders'
                : 'executionTarget: warehouse\nentrypoint: models/analytics/model_orders.sql',
              lastModified: '2026-04-06T10:00:00Z',
            }),
          }),
        }}
      >
        <Probe />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('pipelines/sales_pipeline.yaml') === true,
      { description: 'workflow artifact resolution' }
    );

    expect(mounted.container.querySelector('[data-testid="artifacts-count"]')?.textContent).toBe(
      '2'
    );
    expect(mounted.container.querySelector('[data-testid="pipeline-path"]')?.textContent).toBe(
      'pipelines/sales_pipeline.yaml'
    );
    expect(
      mounted.container.querySelector('[data-testid="pipeline-content"]')?.textContent
    ).toContain('executionTarget');
    expect(mounted.container.querySelector('[data-testid="model-path"]')?.textContent).toBe(
      'models/analytics/model_orders.sql'
    );
    expect(mounted.container.querySelector('[data-testid="model-language"]')?.textContent).toBe(
      'sql'
    );
    expect(mounted.container.querySelector('[data-testid="manifest-path"]')?.textContent).toBe(
      'none'
    );
  });

  it('returns an explicit empty result when no workspace artifacts exist', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceFilesQuery: buildWorkspaceFilesQueryPort(),
        }}
      >
        <Probe />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="loading-state"]')?.textContent === 'false',
      { description: 'empty artifact resolution' }
    );

    expect(mounted.container.querySelector('[data-testid="manifest-path"]')?.textContent).toBe(
      'none'
    );
    expect(mounted.container.querySelector('[data-testid="artifacts-count"]')?.textContent).toBe(
      '0'
    );
    expect(mounted.container.querySelector('[data-testid="error-message"]')?.textContent).toBe(
      'none'
    );
    expect(mounted.container.querySelector('[data-testid="manifest-content"]')?.textContent).toBe(
      'null'
    );
  });

  it('surfaces workspace lookup failure instead of fabricating fallback previews', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          workspaceFilesQuery: buildWorkspaceFilesQueryPort({
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
      () =>
        mounted?.container.querySelector('[data-testid="error-message"]')?.textContent ===
        'workspace unavailable',
      { description: 'workspace lookup failure surfaces explicitly' }
    );

    expect(mounted.container.querySelector('[data-testid="manifest-path"]')?.textContent).toBe(
      'none'
    );
    expect(mounted.container.querySelector('[data-testid="artifacts-count"]')?.textContent).toBe(
      '0'
    );
    expect(mounted.container.querySelector('[data-testid="manifest-content"]')?.textContent).toBe(
      'null'
    );
  });
});
