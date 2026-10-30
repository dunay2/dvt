/** Prove CodeView file selection without writes or a second session owner. */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IWorkspaceFileContentCommandPort, WorkspaceFileEntry } from '../../ports/workspace';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import type { CodeViewFileScope } from '../CodeView';
import { createCodeViewTestHarness } from './tests/CodeView.test-support';

describe('CodeView selection', () => {
  const harness = createCodeViewTestHarness();
  const {
    buildWorkspaceFilesQueryPort,
    waitFor,
    createTestQueryClient,
    getContainer,
    setupContainer,
    renderCodeView,
    waitForInitialRender,
  } = harness;
  afterEach(harness.cleanup);

  async function expectSelectedPath(path: string): Promise<void> {
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-viewer"]')
          ?.getAttribute('data-path') === path
    );
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  }

  async function selectFile(path: string): Promise<void> {
    const entry = getContainer().querySelector<HTMLButtonElement>(
      `[data-slot="code-workspace-file-entry"][data-workspace-path="${path}"]`
    );
    expect(entry).not.toBeNull();
    await act(async () => entry?.click());
    await expectSelectedPath(path);
  }

  it('readmits a repeated explicit path after manual navigation without writing either file', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const options = {
      fileScope: { kind: 'workspace-files' } as const,
      queryClient: createTestQueryClient(),
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => [
          { path: 'notes/a.md', name: 'a.md', kind: 'file' },
          { path: 'notes/b.md', name: 'b.md', kind: 'file' },
        ],
        getFileContent: async (path) => ({
          path,
          name: path.split('/').at(-1)!,
          language: 'markdown',
          content: `Accepted ${path}`,
          contentSha256: (path === 'notes/a.md' ? 'a' : 'b').repeat(64),
          lastModified: '2026-10-30T00:00:00Z',
        }),
      }),
      workspaceGraphSnapshotQuery: {
        getGraphSnapshot: async () => ({
          authoringAuthority: mockGraphDraftAuthoringAuthority,
          nodes: [],
          edges: [],
        }),
      },
    };
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      ...options,
      fileSelectionRequest: { path: 'notes/b.md' },
    });
    await expectSelectedPath('notes/b.md');
    await selectFile('notes/a.md');
    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.textContent).toBe(
      'Accepted notes/a.md'
    );
    await renderCodeView({ saveFileContent }, false, undefined, {
      ...options,
      fileSelectionRequest: { path: 'notes/b.md' },
    });
    await expectSelectedPath('notes/b.md');
    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.textContent).toBe(
      'Accepted notes/b.md'
    );
    await selectFile('notes/a.md');
    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.textContent).toBe(
      'Accepted notes/a.md'
    );
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it('accepts the latest requested workspace file when the authorized tree finishes loading', async () => {
    let resolveTree: ((entries: WorkspaceFileEntry[]) => void) | undefined;
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const options = {
      fileScope: { kind: 'workspace-files' } as const,
      queryClient: createTestQueryClient(),
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: () =>
          new Promise<WorkspaceFileEntry[]>((resolve) => {
            resolveTree = resolve;
          }),
      }),
      workspaceGraphSnapshotQuery: {
        getGraphSnapshot: async () => ({
          authoringAuthority: mockGraphDraftAuthoringAuthority,
          nodes: [],
          edges: [],
        }),
      },
    };
    setupContainer();
    try {
      await renderCodeView({ saveFileContent }, false, undefined, {
        ...options,
        initialPath: 'notes/a.md',
      });
      await renderCodeView({ saveFileContent }, false, undefined, {
        ...options,
        initialPath: 'notes/b.md',
      });
      await act(async () =>
        resolveTree?.([
          { path: 'notes/a.md', name: 'a.md', kind: 'file' },
          { path: 'notes/b.md', name: 'b.md', kind: 'file' },
        ])
      );
      await expectSelectedPath('notes/b.md');
      expect(saveFileContent).not.toHaveBeenCalled();
    } finally {
      await act(async () => resolveTree?.([]));
    }
  });

  it('ignores an unlisted file request and keeps the accepted file visible', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const workspaceFilesQuery = buildWorkspaceFilesQueryPort();
    const getFileContent = vi.spyOn(workspaceFilesQuery, 'getFileContent');
    const options = {
      fileScope: { kind: 'workspace-files' } as const,
      workspaceFilesQuery,
      queryClient: createTestQueryClient(),
    };
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      ...options,
      fileSelectionRequest: { path: 'models/staging/stg_orders.sql' },
    });
    await expectSelectedPath('models/staging/stg_orders.sql');
    const viewer = getContainer().querySelector('[data-testid="monaco-code-viewer"]');
    await renderCodeView({ saveFileContent }, false, undefined, {
      ...options,
      fileSelectionRequest: { path: 'private/unlisted.sql' },
    });

    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')).toBe(viewer);
    expect(viewer?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');
    expect(getFileContent.mock.calls.some(([path]) => path === 'private/unlisted.sql')).toBe(false);
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it('keeps a manual project-file selection until the contextual target changes', async () => {
    setupContainer();
    await renderCodeView(undefined, false, undefined, {
      fileScope: {
        kind: 'dbt-project-files',
        projectRoot: '.',
        initialPath: 'models/staging/stg_orders.sql',
      },
    });
    await waitForInitialRender(false);
    await selectFile('models/staging/stg_customers.sql');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.getAttribute('data-path')
    ).toBe('models/staging/stg_customers.sql');
  });

  it('resets a node file selection when the contextual target becomes the project', async () => {
    const workspaceFilesQuery = buildWorkspaceFilesQueryPort({
      listFiles: async () => [
        { path: 'dbt_project.yml', name: 'dbt_project.yml', kind: 'file' },
        {
          path: 'models',
          name: 'models',
          kind: 'directory',
          children: [
            {
              path: 'models/staging/stg_orders.sql',
              name: 'stg_orders.sql',
              kind: 'file',
            },
            {
              path: 'models/staging/stg_customers.sql',
              name: 'stg_customers.sql',
              kind: 'file',
            },
          ],
        },
      ],
    });
    const nodeScope: CodeViewFileScope = {
      kind: 'dbt-project-files',
      projectRoot: '.',
      initialPath: 'models/staging/stg_orders.sql',
    };
    setupContainer();
    await renderCodeView(undefined, false, undefined, {
      fileScope: nodeScope,
      workspaceFilesQuery,
    });
    await waitForInitialRender(false);
    await selectFile('models/staging/stg_customers.sql');
    await renderCodeView(undefined, false, undefined, {
      fileScope: { kind: 'dbt-project-files', projectRoot: '.' },
      workspaceFilesQuery,
    });
    await expectSelectedPath('dbt_project.yml');
  });
});
