/** Owned concern: prove one known workspace file reuses the authoritative Code edit lifecycle. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import type { IWorkspaceFilesQueryPort, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
import {
  WorkspaceFileCodeEditor,
  type WorkspaceFileCodeEditorHandle,
} from './WorkspaceFileCodeEditor';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    onChange,
    path,
    readOnly,
    value,
  }: {
    onChange: (value: string) => void;
    path?: string;
    readOnly?: boolean;
    value: string;
  }) => (
    <textarea
      data-path={path}
      data-testid="monaco-code-editor"
      readOnly={readOnly}
      onChange={(event) => onChange(event.currentTarget.value)}
      value={value}
    />
  ),
}));

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ path, value }: { path?: string; value: string }) => (
    <pre data-path={path} data-testid="monaco-code-viewer">
      {value}
    </pre>
  ),
}));

const FILE_PATH = 'models/sources/src_raw.yml';

type RenderEditorResult = Readonly<{
  handle: React.RefObject<WorkspaceFileCodeEditorHandle>;
  saveFileContent: ReturnType<typeof vi.fn>;
  getFileContent: ReturnType<typeof vi.fn<IWorkspaceFilesQueryPort['getFileContent']>>;
  rerender: (props: Partial<React.ComponentProps<typeof WorkspaceFileCodeEditor>>) => Promise<void>;
}>;

function buildWorkspaceFilesQueryPort(): IWorkspaceFilesQueryPort {
  return {
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: 'src_raw.yml',
      language: 'yaml',
      content: 'version: 2\n',
      contentSha256: 'a'.repeat(64),
      lastModified: '2026-08-16T00:00:00.000Z',
    }),
  };
}

describe('WorkspaceFileCodeEditor', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
    vi.useRealTimers();
  });

  async function renderEditor(
    props: Partial<React.ComponentProps<typeof WorkspaceFileCodeEditor>> = {},
    handle = createRef<WorkspaceFileCodeEditorHandle>()
  ): Promise<RenderEditorResult> {
    const saveFileContent = vi.fn(async (): Promise<WorkspaceFileSaveReceipt> => ({
      kind: 'saved',
      disposition: 'updated',
      path: FILE_PATH,
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-08-16T00:00:01.000Z',
    }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryPort = buildWorkspaceFilesQueryPort();
    const getFileContent = vi.fn(queryPort.getFileContent);

    const render = (
      nextProps: Partial<React.ComponentProps<typeof WorkspaceFileCodeEditor>>
    ): void => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: { ...queryPort, getFileContent },
              workspaceFileContentCommand: { saveFileContent },
            }}
          >
            <WorkspaceFileCodeEditor
              ref={handle}
              authority="dbt-project-files"
              access="editable"
              graphOwnedPaths={new Set<string>()}
              path={FILE_PATH}
              {...nextProps}
            />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    };
    await act(async () => render(props));

    for (let index = 0; index < 20 && !container.querySelector('[data-path]'); index += 1) {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    }

    return {
      handle,
      saveFileContent,
      getFileContent,
      rerender: async (nextProps) => {
        await act(async () => render({ ...props, ...nextProps }));
      },
    };
  }

  it('edits the authoritative dbt file and exposes the existing flush lifecycle', async () => {
    const { handle, saveFileContent } = await renderEditor();
    const editor = container?.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );

    expect(editor?.getAttribute('data-path')).toBe(FILE_PATH);
    expect(container?.textContent).toContain(FILE_PATH);
    expect(container?.textContent).not.toContain('Save');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      valueSetter?.call(editor, 'version: 2\nsources: []\n');
      editor?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    let flushed = false;
    await act(async () => {
      flushed = (await handle.current?.flush()) ?? false;
    });

    expect(flushed).toBe(true);
    expect(saveFileContent).toHaveBeenCalledWith({
      path: FILE_PATH,
      content: 'version: 2\nsources: []\n',
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
    });
  });

  it('keeps a graph-owned file read-only', async () => {
    const { saveFileContent } = await renderEditor({
      authority: 'graph-draft',
      graphOwnedPaths: new Set([FILE_PATH]),
    });

    expect(container?.querySelector('[data-slot="code-working-tree-status"]')).toBeNull();
    expect(container?.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(container?.querySelector('[data-testid="monaco-code-viewer"]')).not.toBeNull();
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it('opens valid file authority in read-only access without saving', async () => {
    const { handle, saveFileContent } = await renderEditor({ access: 'read-only' });
    expect(container?.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(container?.querySelector('[data-testid="monaco-code-viewer"]')?.textContent).toBe(
      'version: 2\n'
    );
    expect(
      container?.querySelector('[data-slot="code-working-tree-status"]')?.getAttribute('data-phase')
    ).toBe('read_only');
    await act(async () => expect(await handle.current?.flush()).toBe(true));
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it('preserves a pending edit while restricting access and rejects further changes', async () => {
    const { handle, saveFileContent, rerender } = await renderEditor();
    const editor = container?.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(editor, 'version: 2\nsources: []\n');
      editor?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await rerender({ access: 'read-only' });
    expect(container?.querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
    expect(editor?.readOnly).toBe(true);
    expect(editor?.value).toBe('version: 2\nsources: []\n');
    await act(async () => {
      setValue?.call(editor, 'discard the previous draft');
      editor?.dispatchEvent(new Event('input', { bubbles: true }));
      expect(await handle.current?.flush()).toBe(true);
    });
    expect(saveFileContent).toHaveBeenCalledExactlyOnceWith({
      path: FILE_PATH,
      content: 'version: 2\nsources: []\n',
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
    });
    expect(container?.querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
    expect(editor?.value).toBe('version: 2\nsources: []\n');
    expect(
      container?.querySelector('[data-slot="code-working-tree-status"]')?.getAttribute('data-phase')
    ).toBe('read_only');
  });

  it('retains an in-flight edit when access becomes read-only', async () => {
    const { handle, saveFileContent, rerender } = await renderEditor();
    let completeSave: ((receipt: WorkspaceFileSaveReceipt) => void) | undefined;
    saveFileContent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeSave = resolve;
        })
    );
    const editor = container?.querySelector<HTMLTextAreaElement>('textarea');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        editor,
        'pending content'
      );
      editor?.dispatchEvent(new Event('input', { bubbles: true }));
      void handle.current?.flush();
    });
    expect(saveFileContent).toHaveBeenCalledOnce();
    await rerender({ access: 'read-only' });
    expect(container?.querySelector('textarea')).toBe(editor);
    expect(editor?.value).toBe('pending content');
    expect(editor?.readOnly).toBe(true);
    await act(async () => {
      completeSave?.({
        kind: 'saved',
        disposition: 'updated',
        path: FILE_PATH,
        contentSha256: 'b'.repeat(64),
        lastModified: '2026-08-16T00:00:01.000Z',
      });
    });
    expect(editor?.value).toBe('pending content');
    expect(container?.querySelector('textarea')).toBe(editor);
    expect(saveFileContent).toHaveBeenCalledOnce();
  });

  it('keeps the previous draft and model when a conflict reload fails with cached data', async () => {
    const { handle, saveFileContent, getFileContent, rerender } = await renderEditor();
    saveFileContent.mockRejectedValueOnce(new WorkspaceFileRevisionConflictError(FILE_PATH));
    const editor = container?.querySelector<HTMLTextAreaElement>('textarea');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        editor,
        'recover this draft'
      );
      editor?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => expect(await handle.current?.flush()).toBe(false));
    await rerender({ access: 'read-only' });
    getFileContent.mockRejectedValueOnce(new Error('read unavailable'));
    await act(async () => {
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="code-working-tree-status"] button')
        ?.click();
    });
    for (let index = 0; index < 20 && getFileContent.mock.calls.length < 2; index += 1) {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    expect(getFileContent).toHaveBeenCalledTimes(2);
    expect(container?.querySelector('textarea')).toBe(editor);
    expect(editor?.value).toBe('recover this draft');
    expect(editor?.readOnly).toBe(true);
    expect(
      container?.querySelector('[data-slot="code-working-tree-status"]')?.getAttribute('data-phase')
    ).toBe('conflict');
    expect(saveFileContent).toHaveBeenCalledOnce();
  });

  it('does not load an old reload response after another file has been selected', async () => {
    const { handle, saveFileContent, getFileContent, rerender } = await renderEditor();
    saveFileContent.mockRejectedValueOnce(new WorkspaceFileRevisionConflictError(FILE_PATH));
    const editor = container?.querySelector<HTMLTextAreaElement>('textarea');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        editor,
        'previous draft'
      );
      editor?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => expect(await handle.current?.flush()).toBe(false));
    let resolveOldRead:
      ((file: Awaited<ReturnType<IWorkspaceFilesQueryPort['getFileContent']>>) => void) | undefined;
    getFileContent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOldRead = resolve;
        })
    );
    await act(async () => {
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="code-working-tree-status"] button')
        ?.click();
    });
    const nextPath = 'models/next.sql';
    getFileContent.mockResolvedValueOnce({
      path: nextPath,
      name: 'next.sql',
      language: 'sql',
      content: 'select 2',
      contentSha256: 'c'.repeat(64),
      lastModified: '2026-08-16T00:00:02.000Z',
    });
    try {
      await rerender({ access: 'read-only', path: nextPath });
      for (
        let index = 0;
        index < 20 && !container?.querySelector('[data-testid="monaco-code-viewer"]');
        index += 1
      ) {
        await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
      }
      await act(async () => {
        resolveOldRead?.({
          path: FILE_PATH,
          name: 'src_raw.yml',
          language: 'yaml',
          content: 'obsolete original file',
          contentSha256: 'd'.repeat(64),
          lastModified: '2026-08-16T00:00:03.000Z',
        });
      });
      const viewer = container?.querySelector('[data-testid="monaco-code-viewer"]');
      expect(viewer?.getAttribute('data-path')).toBe(nextPath);
      expect(viewer?.textContent).toBe('select 2');
      expect(saveFileContent).toHaveBeenCalledOnce();
    } finally {
      resolveOldRead?.({
        path: FILE_PATH,
        name: 'src_raw.yml',
        language: 'yaml',
        content: 'obsolete original file',
        contentSha256: 'd'.repeat(64),
        lastModified: '2026-08-16T00:00:03.000Z',
      });
    }
  });
});
