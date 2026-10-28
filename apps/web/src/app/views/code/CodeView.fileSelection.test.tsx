/** Prove CodeView selection without duplicating its host or editor boundary. */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IWorkspaceFileContentCommandPort, WorkspaceFileEntry } from '../../ports/workspace';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
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
    editAndVerifyEditor,
  } = harness;
  afterEach(harness.cleanup);

  it.each(['saved', 'conflict'] as const)(
    'readmits a repeated explicit path after internal navigation while retaining %s protection',
    async (outcome) => {
      let settleSave: (() => void) | undefined;
      const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
        () =>
          new Promise((resolve, reject) => {
            settleSave = () =>
              outcome === 'conflict'
                ? reject(new WorkspaceFileRevisionConflictError('notes/a.md'))
                : resolve({
                    kind: 'saved',
                    disposition: 'updated',
                    path: 'notes/a.md',
                    contentSha256: 'b'.repeat(64),
                    lastModified: '2026-10-28T00:00:00.000Z',
                  });
          })
      );
      const options = {
        fileScope: { kind: 'workspace-files' } as const,
        initialPath: 'notes/b.md',
        queryClient: createTestQueryClient(),
        workspaceFilesQuery: buildWorkspaceFilesQueryPort({
          listFiles: async () => [
            { path: 'notes/a.md', name: 'a.md', kind: 'file' },
            { path: 'notes/b.md', name: 'b.md', kind: 'file' },
          ],
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
          fileSelectionRequest: { path: 'notes/b.md' },
        });
        await waitFor(
          () =>
            getContainer()
              .querySelector('[data-testid="monaco-code-editor"]')
              ?.getAttribute('data-path') === 'notes/b.md'
        );
        const first = getContainer().querySelector<HTMLButtonElement>(
          '[data-slot="code-workspace-file-entry"][data-workspace-path="notes/a.md"]'
        );
        expect(first).not.toBeNull();
        await act(async () => first?.click());
        await waitFor(
          () =>
            getContainer()
              .querySelector('[data-testid="monaco-code-editor"]')
              ?.getAttribute('data-path') === 'notes/a.md'
        );
        const editor = getContainer().querySelector<HTMLTextAreaElement>(
          '[data-testid="monaco-code-editor"]'
        );
        await editAndVerifyEditor(editor);
        await renderCodeView({ saveFileContent }, false, undefined, {
          ...options,
          fileSelectionRequest: { path: 'notes/b.md' },
        });
        expect(saveFileContent).toHaveBeenCalledOnce();
        expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
        expect(editor?.getAttribute('data-path')).toBe('notes/a.md');
        expect(editor?.value).toBe('select 1 as edited_value');
        await act(async () => settleSave?.());
        if (outcome === 'saved') {
          await waitFor(
            () =>
              getContainer()
                .querySelector('[data-testid="monaco-code-editor"]')
                ?.getAttribute('data-path') === 'notes/b.md'
          );
        } else {
          await waitFor(
            () =>
              getContainer()
                .querySelector('[data-slot="code-working-tree-status"]')
                ?.getAttribute('data-phase') === 'conflict'
          );
          expect(editor?.getAttribute('data-path')).toBe('notes/a.md');
          expect(editor?.value).toBe('select 1 as edited_value');
        }
        expect(saveFileContent).toHaveBeenCalledOnce();
      } finally {
        await act(async () => settleSave?.());
      }
    }
  );

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
      await waitFor(
        () =>
          getContainer()
            .querySelector('[data-testid="monaco-code-editor"]')
            ?.getAttribute('data-path') === 'notes/b.md'
      );
      expect(saveFileContent).not.toHaveBeenCalled();
    } finally {
      await act(async () => resolveTree?.([]));
    }
  });

  it.each(['saved', 'conflict', 'unlisted'] as const)(
    'protects the mounted workspace buffer when file-change admission is %s',
    async (outcome) => {
      let settleSave: (() => void) | undefined;
      const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
        () =>
          new Promise((resolve, reject) => {
            settleSave = () =>
              outcome === 'conflict'
                ? reject(new WorkspaceFileRevisionConflictError('notes/a.md'))
                : resolve({
                    kind: 'saved',
                    disposition: 'updated',
                    path: 'notes/a.md',
                    contentSha256: 'b'.repeat(64),
                    lastModified: '2026-10-28T00:00:00.000Z',
                  });
          })
      );
      const workspaceFilesQuery = buildWorkspaceFilesQueryPort({
        listFiles: async () => [
          {
            path: 'notes',
            name: 'notes',
            kind: 'directory',
            children: [
              { path: 'notes/a.md', name: 'a.md', kind: 'file' },
              { path: 'notes/b.md', name: 'b.md', kind: 'file' },
            ],
          },
        ],
      });
      const getFileContent = vi.spyOn(workspaceFilesQuery, 'getFileContent');
      const options = {
        fileScope: { kind: 'workspace-files' } as const,
        queryClient: createTestQueryClient(),
        workspaceFilesQuery,
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
        await waitFor(
          () =>
            getContainer().querySelector(
              '[data-testid="monaco-code-editor"], [data-slot="code-route-empty-state"]'
            ) != null
        );
        const editor = getContainer().querySelector<HTMLTextAreaElement>(
          '[data-testid="monaco-code-editor"]'
        );
        expect(editor).not.toBeNull();
        await editAndVerifyEditor(editor);
        const requestedPath = outcome === 'unlisted' ? 'private/unlisted.md' : 'notes/b.md';
        await renderCodeView({ saveFileContent }, false, undefined, {
          ...options,
          initialPath: requestedPath,
        });
        expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
        expect(editor?.getAttribute('data-path')).toBe('notes/a.md');
        expect(editor?.value).toBe('select 1 as edited_value');
        expect(getFileContent.mock.calls.some(([path]) => path === requestedPath)).toBe(false);
        if (outcome === 'unlisted') {
          expect(saveFileContent).not.toHaveBeenCalled();
          return;
        }
        expect(saveFileContent).toHaveBeenCalledOnce();
        await act(async () => settleSave?.());
        if (outcome === 'saved') {
          await waitFor(
            () =>
              getContainer()
                .querySelector('[data-testid="monaco-code-editor"]')
                ?.getAttribute('data-path') === 'notes/b.md'
          );
        } else {
          await waitFor(
            () =>
              getContainer()
                .querySelector('[data-slot="code-working-tree-status"]')
                ?.getAttribute('data-phase') === 'conflict'
          );
          expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
          expect(editor?.getAttribute('data-path')).toBe('notes/a.md');
          expect(editor?.value).toBe('select 1 as edited_value');
          expect(getFileContent.mock.calls.some(([path]) => path === 'notes/b.md')).toBe(false);
        }
        expect(saveFileContent).toHaveBeenCalledOnce();
      } finally {
        await act(async () => settleSave?.());
      }
    }
  );

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

    const nextFileButton = getContainer().querySelector<HTMLButtonElement>(
      '[data-slot="code-workspace-file-entry"][data-workspace-path="models/staging/stg_customers.sql"]'
    );
    expect(nextFileButton).not.toBeNull();
    await act(async () => nextFileButton?.click());
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/staging/stg_customers.sql'
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      getContainer().querySelector('[data-testid="monaco-code-editor"]')?.getAttribute('data-path')
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

    const nextFileButton = getContainer().querySelector<HTMLButtonElement>(
      '[data-slot="code-workspace-file-entry"][data-workspace-path="models/staging/stg_customers.sql"]'
    );
    await act(async () => nextFileButton?.click());
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/staging/stg_customers.sql'
    );

    await renderCodeView(undefined, false, undefined, {
      fileScope: { kind: 'dbt-project-files', projectRoot: '.' },
      workspaceFilesQuery,
    });

    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'dbt_project.yml'
    );
  });
});
