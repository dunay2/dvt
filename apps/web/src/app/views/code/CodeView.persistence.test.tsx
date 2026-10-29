/** Prove CodeView persistence without duplicating its host or editor boundary. */
import { act, createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  WorkspaceFileSaveReceipt,
} from '../../ports/workspace';
import type { CodeViewHandle, CodeViewFileScope } from '../CodeView';
import { createCodeViewTestHarness } from './tests/CodeView.test-support';

describe('CodeView persistence', () => {
  const harness = createCodeViewTestHarness();
  const {
    copy,
    defaultEditableFileScope,
    buildWorkspaceFilesQueryPort,
    waitFor,
    getContainer,
    setupContainer,
    renderCodeView,
    waitForInitialRender,
    editAndVerifyEditor,
  } = harness;
  afterEach(harness.cleanup);

  function verifyInitialState(): HTMLTextAreaElement | null {
    const currentContainer = getContainer();
    expect(currentContainer.textContent).toContain('stg_orders.sql');
    expect(
      currentContainer.querySelector('[data-slot="code-working-tree-status"]')?.textContent
    ).toContain(copy.workingTreeSynchronizedLabel);
    expect(currentContainer.textContent).toContain(copy.workingTreeSynchronizedMessage);
    expect(
      currentContainer.querySelector('[data-slot="route-workbench-left-panel"]')?.textContent
    ).toContain(copy.explorerTitle);
    expect(
      currentContainer.querySelector('[data-slot="route-workbench-primary-surface"]')?.textContent
    ).toContain(copy.workingTreeSynchronizedLabel);
    expect(
      currentContainer.querySelector('[data-slot="route-workbench-right-panel"]')?.textContent
    ).toContain(copy.historyTitle);

    const editor = currentContainer.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(editor).not.toBeNull();
    expect(editor?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');
    expect(editor?.value).toContain('select * from orders');
    return editor;
  }

  it('renders the workspace tree and synchronizes edited content without a Save action', async () => {
    const saveFileContent = vi.fn(async (): Promise<WorkspaceFileSaveReceipt> => ({
      kind: 'saved',
      disposition: 'updated',
      path: 'models/staging/stg_orders.sql',
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-07-12T00:00:01.000Z',
    }));
    setupContainer();
    await renderCodeView({ saveFileContent }, true, undefined, {
      fileScope: defaultEditableFileScope,
    });
    await waitForInitialRender();
    const editor = verifyInitialState();

    vi.useFakeTimers();
    await editAndVerifyEditor(editor);
    expect(
      getContainer().querySelector('[data-slot="code-working-tree-status"]')?.textContent
    ).toContain(copy.workingTreeModifiedLabel);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(saveFileContent).toHaveBeenCalledWith({
      path: 'models/staging/stg_orders.sql',
      content: 'select 1 as edited_value',
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
    });
    expect(
      getContainer().querySelector('[data-slot="code-working-tree-status"]')?.textContent
    ).toContain(copy.workingTreeSynchronizedLabel);
    expect(getContainer().textContent).not.toContain('Save');
  });

  it('does not report synchronized when an authoritative read supersedes the save receipt', async () => {
    const receipt: WorkspaceFileSaveReceipt = {
      kind: 'saved',
      disposition: 'updated',
      path: 'models/staging/stg_orders.sql',
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-07-12T00:00:01.000Z',
    };
    const getFileContent = vi.fn(async (path: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: getFileContent.mock.calls.length === 1 ? 'select * from orders' : 'select 3',
      contentSha256: getFileContent.mock.calls.length === 1 ? 'a'.repeat(64) : 'e'.repeat(64),
      lastModified: '2026-07-12T00:00:02.000Z',
    }));
    const reconcilePersistedFile = vi.fn(async () => ({
      kind: 'fresh' as const,
      analysisSha256: 'c'.repeat(64),
      projectContentSetSha256: 'd'.repeat(64),
    }));
    setupContainer();
    await renderCodeView({ saveFileContent: vi.fn(async () => receipt) }, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({ getFileContent }),
      reconcilePersistedFile,
      fileScope: defaultEditableFileScope,
    });
    await waitForInitialRender();

    vi.useFakeTimers();
    await editAndVerifyEditor(verifyInitialState());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(reconcilePersistedFile).toHaveBeenCalledWith(receipt);
    expect(
      getContainer()
        .querySelector('[data-slot="code-working-tree-status"]')
        ?.getAttribute('data-phase')
    ).toBe('persisted_superseded');
    expect(getContainer().textContent).toContain(copy.workingTreePersistedSupersededLabel);
  });

  it('distinguishes final file-verification failure from project-analysis failure', async () => {
    const receipt: WorkspaceFileSaveReceipt = {
      kind: 'saved',
      disposition: 'updated',
      path: 'models/staging/stg_orders.sql',
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-07-12T00:00:01.000Z',
    };
    const getFileContent = vi
      .fn<IWorkspaceFilesQueryPort['getFileContent']>()
      .mockResolvedValueOnce({
        path: receipt.path,
        name: 'stg_orders.sql',
        language: 'sql',
        content: 'select * from orders',
        contentSha256: 'a'.repeat(64),
        lastModified: '2026-07-12T00:00:00.000Z',
      })
      .mockRejectedValueOnce(new Error('workspace read unavailable'));
    setupContainer();
    await renderCodeView({ saveFileContent: vi.fn(async () => receipt) }, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({ getFileContent }),
      reconcilePersistedFile: vi.fn(async () => ({
        kind: 'fresh' as const,
        analysisSha256: 'c'.repeat(64),
        projectContentSetSha256: 'd'.repeat(64),
      })),
      fileScope: defaultEditableFileScope,
    });
    await waitForInitialRender();

    vi.useFakeTimers();
    await editAndVerifyEditor(verifyInitialState());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(
      getContainer()
        .querySelector('[data-slot="code-working-tree-status"]')
        ?.getAttribute('data-phase')
    ).toBe('persisted_verification_unavailable');
    expect(getContainer().textContent).toContain(
      copy.workingTreePersistedVerificationUnavailableLabel
    );
  });

  it('flushes the modified file before changing the selected file', async () => {
    let resolveSave!: (receipt: WorkspaceFileSaveReceipt) => void;
    const saveFileContent = vi.fn(
      () =>
        new Promise<WorkspaceFileSaveReceipt>((resolve) => {
          resolveSave = resolve;
        })
    );
    setupContainer();
    await renderCodeView({ saveFileContent }, true, undefined, {
      fileScope: defaultEditableFileScope,
    });
    await waitForInitialRender();
    const editor = verifyInitialState();
    await editAndVerifyEditor(editor);

    const nextFileButton = getContainer().querySelector<HTMLButtonElement>(
      '[data-slot="code-workspace-file-entry"][data-workspace-path="models/staging/stg_customers.sql"]'
    );
    expect(nextFileButton).not.toBeNull();
    await act(async () => nextFileButton?.click());

    expect(saveFileContent).toHaveBeenCalledOnce();
    expect(editor?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');

    await act(async () => {
      resolveSave({
        kind: 'saved',
        disposition: 'updated',
        path: 'models/staging/stg_orders.sql',
        contentSha256: 'b'.repeat(64),
        lastModified: '2026-07-12T00:00:01.000Z',
      });
    });
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/staging/stg_customers.sql'
    );
  });

  it('flushes the active buffer before a contextual target changes its initial path', async () => {
    let resolveSave!: (receipt: WorkspaceFileSaveReceipt) => void;
    const commandPort = {
      saveFileContent: vi.fn(
        () =>
          new Promise<WorkspaceFileSaveReceipt>((resolve) => {
            resolveSave = resolve;
          })
      ),
    };
    const initialScope: CodeViewFileScope = {
      kind: 'dbt-project-files',
      projectRoot: '.',
      initialPath: 'models/staging/stg_orders.sql',
    };
    setupContainer();
    await renderCodeView(commandPort, false, undefined, { fileScope: initialScope });
    await waitForInitialRender(false);
    const editor = getContainer().querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(editor?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');
    await editAndVerifyEditor(editor);

    await renderCodeView(commandPort, false, undefined, {
      fileScope: {
        ...initialScope,
        initialPath: 'models/staging/stg_customers.sql',
      },
    });

    expect(commandPort.saveFileContent).toHaveBeenCalledOnce();
    expect(editor?.getAttribute('data-path')).toBe('models/staging/stg_orders.sql');

    await act(async () => {
      resolveSave({
        kind: 'saved',
        disposition: 'updated',
        path: 'models/staging/stg_orders.sql',
        contentSha256: 'b'.repeat(64),
        lastModified: '2026-07-19T00:00:00.000Z',
      });
    });
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/staging/stg_customers.sql'
    );
  });

  it('keeps the active target when persistence blocks a contextual target change', async () => {
    const commandPort = {
      saveFileContent: vi.fn(async () => {
        throw new Error('write unavailable');
      }),
    };
    const initialScope: CodeViewFileScope = {
      kind: 'dbt-project-files',
      projectRoot: '.',
      initialPath: 'models/staging/stg_orders.sql',
    };
    setupContainer();
    await renderCodeView(commandPort, false, undefined, { fileScope: initialScope });
    await waitForInitialRender(false);
    const editor = getContainer().querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    await editAndVerifyEditor(editor);

    await renderCodeView(commandPort, false, undefined, {
      fileScope: {
        ...initialScope,
        initialPath: 'models/staging/stg_customers.sql',
      },
    });
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-slot="code-working-tree-status"]')
          ?.getAttribute('data-phase') === 'failed'
    );

    expect(commandPort.saveFileContent).toHaveBeenCalledOnce();
    expect(
      getContainer().querySelector('[data-testid="monaco-code-editor"]')?.getAttribute('data-path')
    ).toBe('models/staging/stg_orders.sql');
  });

  it('applies the requested contextual target after persistence retry succeeds', async () => {
    const commandPort = {
      saveFileContent: vi
        .fn<IWorkspaceFileContentCommandPort['saveFileContent']>()
        .mockRejectedValueOnce(new Error('write unavailable'))
        .mockResolvedValueOnce({
          kind: 'saved',
          disposition: 'updated',
          path: 'models/staging/stg_orders.sql',
          contentSha256: 'b'.repeat(64),
          lastModified: '2026-07-19T00:00:00.000Z',
        }),
    };
    const initialScope: CodeViewFileScope = {
      kind: 'dbt-project-files',
      projectRoot: '.',
      initialPath: 'models/staging/stg_orders.sql',
    };
    setupContainer();
    await renderCodeView(commandPort, false, undefined, { fileScope: initialScope });
    await waitForInitialRender(false);
    const editor = getContainer().querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    await editAndVerifyEditor(editor);

    await renderCodeView(commandPort, false, undefined, {
      fileScope: {
        ...initialScope,
        initialPath: 'models/staging/stg_customers.sql',
      },
    });
    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-slot="code-working-tree-status"]')
          ?.getAttribute('data-phase') === 'failed'
    );

    const retryButton = getContainer().querySelector<HTMLButtonElement>(
      '[data-slot="code-working-tree-status"] button'
    );
    await act(async () => retryButton?.click());

    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/staging/stg_customers.sql'
    );
    expect(commandPort.saveFileContent).toHaveBeenCalledTimes(2);
  });

  it('exposes a close-time flush without waiting for the debounce interval', async () => {
    const saveFileContent = vi.fn(async (): Promise<WorkspaceFileSaveReceipt> => ({
      kind: 'saved',
      disposition: 'updated',
      path: 'models/staging/stg_orders.sql',
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-07-12T00:00:01.000Z',
    }));
    const codeViewRef = createRef<CodeViewHandle>();
    setupContainer();
    await renderCodeView({ saveFileContent }, true, codeViewRef, {
      fileScope: defaultEditableFileScope,
    });
    await waitForInitialRender();
    await editAndVerifyEditor(verifyInitialState());

    let flushed = false;
    await act(async () => {
      flushed = (await codeViewRef.current?.flush()) ?? false;
    });

    expect(flushed).toBe(true);
    expect(saveFileContent).toHaveBeenCalledTimes(1);
  });
});
