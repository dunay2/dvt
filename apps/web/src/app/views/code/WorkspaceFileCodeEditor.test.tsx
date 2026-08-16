/** Owned concern: prove one known workspace file reuses the authoritative Code edit lifecycle. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import type { IWorkspaceFilesQueryPort, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import {
  WorkspaceFileCodeEditor,
  type WorkspaceFileCodeEditorHandle,
} from './WorkspaceFileCodeEditor';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    onChange,
    path,
    value,
  }: {
    onChange: (value: string) => void;
    path?: string;
    value: string;
  }) => (
    <textarea
      data-path={path}
      data-testid="monaco-code-editor"
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

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: buildWorkspaceFilesQueryPort(),
              workspaceFileContentCommand: { saveFileContent },
            }}
          >
            <WorkspaceFileCodeEditor
              ref={handle}
              authority="dbt-project-files"
              graphOwnedPaths={new Set<string>()}
              path={FILE_PATH}
              {...props}
            />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    for (let index = 0; index < 20 && !container.querySelector('[data-path]'); index += 1) {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    }

    return { handle, saveFileContent };
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
});
