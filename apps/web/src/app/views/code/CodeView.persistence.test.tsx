/** Prove Code inspection never invokes the working-tree mutation rail. */
import { act, createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspaceFileContentCommandPort } from '../../ports/workspace';
import type { CodeViewHandle } from '../CodeView';
import { createCodeViewTestHarness } from './tests/CodeView.test-support';

describe('CodeView read-only file session', () => {
  const harness = createCodeViewTestHarness();
  const {
    copy,
    defaultDbtFileScope,
    buildWorkspaceFilesQueryPort,
    createTestQueryClient,
    getContainer,
    setupContainer,
    renderCodeView,
    waitFor,
    waitForInitialRender,
  } = harness;
  afterEach(harness.cleanup);

  it.each([true, false])(
    'opens file-backed Code read-only without writing or reconciling (route=%s)',
    async (publishRouteBootstrap) => {
      const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
      const reconcilePersistedFile = vi.fn();
      const codeViewRef = createRef<CodeViewHandle>();
      setupContainer();
      await renderCodeView({ saveFileContent }, publishRouteBootstrap, codeViewRef, {
        fileScope: defaultDbtFileScope,
        reconcilePersistedFile,
      });
      await waitForInitialRender(publishRouteBootstrap);

      expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
      expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.textContent).toBe(
        'select * from orders'
      );
      expect(getContainer().textContent).toContain(copy.workingTreeReadOnlyLabel);
      await act(async () => {
        expect(await codeViewRef.current?.flush()).toBe(true);
      });
      expect(saveFileContent).not.toHaveBeenCalled();
      expect(reconcilePersistedFile).not.toHaveBeenCalled();
    }
  );

  it('shows a newly accepted file revision without creating a local edit', async () => {
    const queryClient = createTestQueryClient();
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const reconcilePersistedFile = vi.fn();
    let content = 'select 1 as accepted';
    let revision = 'a'.repeat(64);
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      fileScope: defaultDbtFileScope,
      reconcilePersistedFile,
      queryClient,
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        getFileContent: async (path) => ({
          path,
          name: path.split('/').at(-1)!,
          language: 'sql',
          content,
          contentSha256: revision,
          lastModified: '2026-10-30T00:00:00Z',
        }),
      }),
    });
    await waitFor(
      () =>
        getContainer().querySelector('[data-testid="monaco-code-viewer"]')?.textContent === content
    );
    const viewer = getContainer().querySelector('[data-testid="monaco-code-viewer"]');
    content = 'select 2 as externally_updated';
    revision = 'b'.repeat(64);
    await act(async () => {
      await queryClient.refetchQueries();
    });
    await waitFor(() => viewer?.textContent === content);

    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')).toBe(viewer);
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(saveFileContent).not.toHaveBeenCalled();
    expect(reconcilePersistedFile).not.toHaveBeenCalled();
  });

  it('does not turn a file-read failure into a persistence or reconciliation attempt', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    const reconcilePersistedFile = vi.fn();
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      fileScope: defaultDbtFileScope,
      reconcilePersistedFile,
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        getFileContent: async () => {
          throw new Error('File read unavailable');
        },
      }),
    });
    await waitFor(
      () => getContainer().querySelector('[data-slot="code-preview-error-state"]') != null
    );

    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')).toBeNull();
    expect(saveFileContent).not.toHaveBeenCalled();
    expect(reconcilePersistedFile).not.toHaveBeenCalled();
  });
});
