import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { IWorkspaceFilesQueryPort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { WorkspaceFileLoadError } from '../services/workspace/workspaceErrors';
import CodeView from './CodeView';

vi.mock('../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    onChange,
    value,
    path,
    language,
  }: {
    onChange: (value: string) => void;
    value: string;
    path?: string;
    language: string;
  }) => (
    <textarea
      data-language={language}
      data-path={path}
      data-testid="monaco-code-editor"
      onChange={(event) => onChange(event.currentTarget.value)}
      value={value}
    />
  ),
}));

function buildWorkspaceFilesQueryPort(
  overrides: Partial<IWorkspaceFilesQueryPort> = {}
): IWorkspaceFilesQueryPort {
  const port: IWorkspaceFilesQueryPort = {
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
  };

  return { ...port, ...overrides };
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

  function createTestQueryClient(): QueryClient {
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
  }

  it('renders the workspace tree and previews the first file', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          {' '}
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: buildWorkspaceFilesQueryPort(),
            }}
          >
            {' '}
            <CodeView />{' '}
          </AppServicesProvider>{' '}
        </QueryClientProvider>
      );
    });

    expect(container.textContent).toContain('Code');
    await waitFor(() => container?.textContent?.includes('stg_orders.sql') === true);
    await waitFor(() => container?.textContent?.includes('Explorer') === true);
    await waitFor(() => container?.querySelector('[data-testid="monaco-code-editor"]') != null);

    expect(container.textContent).toContain('stg_orders.sql');
    expect(container.querySelector('[data-slot="code-local-buffer-state"]')?.textContent).toContain(
      'Editable local buffer'
    );
    expect(container.textContent).toContain(
      'Changes are local until a governed save command exists.'
    );

    const editor = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(editor).not.toBeNull();
    expect(editor?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');
    expect(editor?.value).toContain('select * from orders');

    await act(async () => {
      if (!editor) {
        throw new Error('expected Monaco editor test double');
      }
      editor.value = 'select 1 as edited_value';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(editor?.value).toBe('select 1 as edited_value');
  });

  it('renders a governed route empty state when no workspace files are available', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          {' '}
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: buildWorkspaceFilesQueryPort({ listFiles: async () => [] }),
            }}
          >
            {' '}
            <CodeView />{' '}
          </AppServicesProvider>{' '}
        </QueryClientProvider>
      );
    });

    await waitFor(
      () =>
        container?.querySelector('[data-slot="code-route-empty-state"]') != null &&
        container.textContent?.includes('No workspace files available') === true
    );

    expect(container.querySelector('[data-slot="code-route-empty-state"]')?.textContent).toContain(
      'This workspace does not expose files to browse yet.'
    );
    expect(container.textContent).not.toContain('Explorer');
  });

  it('renders a governed route error state when the workspace tree cannot be loaded', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          {' '}
          <AppServicesProvider
            overrides={{
              workspaceFilesQuery: buildWorkspaceFilesQueryPort({
                listFiles: async () => {
                  throw new Error('request failed');
                },
              }),
            }}
          >
            {' '}
            <CodeView />{' '}
          </AppServicesProvider>{' '}
        </QueryClientProvider>
      );
    });

    await waitFor(
      () =>
        container?.querySelector('[data-slot="code-route-error-state"]') != null &&
        container.textContent?.includes('Workspace files unavailable') === true
    );

    expect(container.querySelector('[data-slot="code-route-error-state"]')?.textContent).toContain(
      'The file explorer could not be loaded right now.'
    );
    expect(container.textContent).not.toContain('Explorer');
  });

  it('keeps the explorer visible when the selected file preview resolves to file-not-found', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          {' '}
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: buildWorkspaceFilesQueryPort({
                getFileContent: async (path) => {
                  throw new WorkspaceFileLoadError('not_found', path);
                },
              }),
            }}
          >
            {' '}
            <CodeView />{' '}
          </AppServicesProvider>{' '}
        </QueryClientProvider>
      );
    });

    await waitFor(
      () =>
        container?.querySelector('[data-slot="code-preview-error-state"]') != null &&
        container.textContent?.includes('Selected file unavailable') === true
    );

    expect(container.textContent).toContain('Explorer');
    expect(container.textContent).toContain('stg_orders.sql');
    expect(
      container.querySelector('[data-slot="code-preview-error-state"]')?.textContent
    ).toContain('The selected file is no longer available in this workspace:');
    expect(
      container.querySelector('[data-slot="code-preview-error-state"]')?.textContent
    ).toContain('models/staging/stg_orders.sql');
    expect(container.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  });
});
