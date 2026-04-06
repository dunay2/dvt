import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import CodeView from './CodeView';

vi.mock('../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    value,
    path,
    language,
  }: {
    value: string;
    path?: string;
    language: string;
  }) => (
    <div data-language={language} data-path={path} data-testid="monaco-code-viewer">
      {value}
    </div>
  ),
}));

function buildWorkspaceService(): IWorkspacePort {
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
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [
          { path: 'models/staging/stg_orders.sql', name: 'stg_orders.sql', kind: 'file' },
          { path: 'README.md', name: 'README.md', kind: 'file' },
        ],
      },
    ],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: path.endsWith('.sql') ? 'sql' : 'markdown',
      content: path.endsWith('.sql') ? 'select * from orders' : '# Workspace',
      lastModified: '2026-04-06T00:00:00Z',
    }),
    saveFileContent: async (path, content) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content,
      lastModified: '2026-04-06T00:00:00Z',
    }),
  };
}

describe('CodeView', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  async function waitFor(predicate: () => boolean): Promise<void> {
    for (let index = 0; index < 20; index += 1) {
      if (predicate()) {
        return;
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    throw new Error('Timed out waiting for CodeView to settle');
  }

  it('renders the workspace tree and previews the first file', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider client={new QueryClient()}>
          <AppServicesProvider
            overrides={{
              mode: 'mock',
              workspaceService: buildWorkspaceService(),
            }}
          >
            <CodeView />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    expect(container.textContent).toContain('Code');
    expect(container.textContent).toContain('Explorer');

    await waitFor(() => container?.textContent?.includes('stg_orders.sql') === true);
    await waitFor(() => container?.querySelector('[data-testid="monaco-code-viewer"]') != null);

    expect(container.textContent).toContain('stg_orders.sql');

    const viewer = container.querySelector('[data-testid="monaco-code-viewer"]');
    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');
    expect(viewer?.textContent).toContain('select * from orders');
  });
});
