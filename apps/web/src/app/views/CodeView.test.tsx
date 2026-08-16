/** Owned concern: prove the Code workbench renders workspace files through semantic slots. */
import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { act, createRef, type RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  WorkspaceFileSaveReceipt,
  WorkspaceGraphSnapshot,
} from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { mockGraphDraftAuthoringAuthority } from '../../testing/workspacePortDoubles';
import { WorkspaceFileLoadError } from '../services/workspace/workspaceErrors';
import CodeView, { type CodeViewFileScope, type CodeViewHandle } from './CodeView';
import { resolveCodeViewCopy } from './code/codeViewCopy';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

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
    <pre data-language={language} data-path={path} data-testid="monaco-code-viewer">
      {value}
    </pre>
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
          {
            path: 'models/staging/stg_customers.sql',
            name: 'stg_customers.sql',
            kind: 'file',
          },
        ],
      },
    ],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: path.endsWith('.sql') ? 'sql' : path.endsWith('.yaml') ? 'yaml' : 'markdown',
      content: path.endsWith('.sql')
        ? 'select * from orders'
        : path.endsWith('.yaml')
          ? 'executionTarget: "postgres"\nentrypoint: "models/analytics/model_orders.sql"'
          : '# Workspace',
      contentSha256: 'a'.repeat(64),
      lastModified: '2026-04-06T00:00:00Z',
    }),
  };

  return { ...port, ...overrides };
}

describe('CodeView', () => {
  const copy = resolveCodeViewCopy('en-US');
  const defaultEditableFileScope: CodeViewFileScope = {
    kind: 'dbt-project-files',
    projectRoot: '.',
    initialPath: 'models/staging/stg_orders.sql',
  };
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
    vi.useRealTimers();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
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

  function getContainer(): HTMLDivElement {
    if (!container) {
      throw new Error('expected CodeView test container');
    }

    return container;
  }

  function setupContainer(): void {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  }

  async function renderCodeView(
    workspaceFileContentCommand?: IWorkspaceFileContentCommandPort,
    publishRouteBootstrap = true,
    codeViewRef?: RefObject<CodeViewHandle>,
    options: Readonly<{
      workspaceFilesQuery?: IWorkspaceFilesQueryPort;
      reconcilePersistedFile?: NonNullable<
        Parameters<typeof CodeView>[0]['reconcilePersistedFile']
      >;
      fileScope?: CodeViewFileScope;
    }> = {}
  ): Promise<void> {
    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          {' '}
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: options.workspaceFilesQuery ?? buildWorkspaceFilesQueryPort(),
              ...(workspaceFileContentCommand ? { workspaceFileContentCommand } : {}),
            }}
          >
            {' '}
            <CodeView
              ref={codeViewRef}
              publishRouteBootstrap={publishRouteBootstrap}
              fileScope={options.fileScope}
              reconcilePersistedFile={options.reconcilePersistedFile}
            />{' '}
          </AppServicesProvider>{' '}
        </QueryClientProvider>
      );
    });
  }

  async function waitForInitialRender(expectRouteHeader = true): Promise<void> {
    const currentContainer = getContainer();
    if (expectRouteHeader) {
      expect(currentContainer.textContent).toContain(copy.title);
    }
    await waitFor(() => container?.textContent?.includes('stg_orders.sql') === true);
    await waitFor(() => container?.textContent?.includes(copy.explorerTitle) === true);
    await waitFor(
      () =>
        container?.querySelector('[data-testid="monaco-code-editor"]') != null ||
        container?.querySelector('[data-testid="monaco-code-viewer"]') != null
    );
  }

  it('reacts to the configured application language inside a contextual workbench', async () => {
    setupContainer();
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    await renderCodeView(undefined, false, undefined, { fileScope: defaultEditableFileScope });
    await waitFor(() => getContainer().textContent?.includes('Explorador') === true);

    expect(getContainer().textContent).toContain('Explorador');
    expect(getContainer().textContent).not.toContain('Canvas-generated');

    act(() => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    });
    await waitFor(() => getContainer().textContent?.includes('Explorer') === true);

    expect(getContainer().textContent).toContain('Explorer');
    expect(getContainer().textContent).not.toContain('Generado por el Canvas');
  });

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

  async function editAndVerifyEditor(editor: HTMLTextAreaElement | null): Promise<void> {
    await act(async () => {
      if (!editor) {
        throw new Error('expected Monaco editor test double');
      }
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      valueSetter?.call(editor, 'select 1 as edited_value');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(editor?.value).toBe('select 1 as edited_value');
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

  it('uses embedded geometry without the history rail inside Canvas', async () => {
    setupContainer();
    await renderCodeView(undefined, false);
    await waitForInitialRender(false);

    expect(
      getContainer()
        .querySelector('[data-slot="route-workbench-frame"]')
        ?.getAttribute('data-presentation-mode')
    ).toBe('embedded');
    expect(getContainer().querySelector('[data-slot="route-workbench-left-panel"]')).not.toBeNull();
    expect(
      getContainer().querySelector('[data-slot="route-workbench-primary-surface"]')
    ).not.toBeNull();
    expect(getContainer().querySelector('[data-slot="route-workbench-right-panel"]')).toBeNull();
    expect(getContainer().querySelector('[data-slot="route-workbench-header"]')).toBeNull();
  });

  it('renders selected-file history and hands revision review to Diff', async () => {
    setupContainer();
    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: buildWorkspaceFilesQueryPort(),
              workspaceFileHistoryQuery: {
                getFileHistory: async (path) => [
                  {
                    commitSha: '0123456789abcdef',
                    shortSha: '0123456',
                    authorName: 'Ada',
                    authoredAt: '2026-05-22T12:00:00.000Z',
                    subject: `Update ${path}`,
                    path,
                  },
                ],
              },
            }}
          >
            <CodeView />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    await waitForInitialRender();
    await waitFor(() => container?.textContent?.includes('File history') === true);

    const currentContainer = getContainer();
    expect(
      currentContainer.querySelector('[data-slot="route-workbench-right-panel"]')?.textContent
    ).toContain('Update models/staging/stg_orders.sql');

    const handoff = currentContainer.querySelector<HTMLAnchorElement>(
      '[data-slot="code-file-history-open-diff"]'
    );
    expect(handoff?.getAttribute('href')).toContain('/diff');
    expect(handoff?.getAttribute('href')).toContain('models%2Fstaging%2Fstg_orders.sql');
    expect(handoff?.getAttribute('href')).toContain('0123456789abcdef');
  });

  it('opens a Canvas workflow pipeline file as project code', async () => {
    setupContainer();
    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
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
                        path: 'models/analytics/model_orders.sql',
                        name: 'model_orders.sql',
                        kind: 'file',
                      },
                    ],
                  },
                ],
              }),
            }}
          >
            <CodeView />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    await waitFor(() => container?.textContent?.includes('sales_pipeline.yaml') === true);
    await waitFor(() => container?.querySelector('[data-testid="monaco-code-editor"]') != null);

    const editor = getContainer().querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(editor?.getAttribute('data-path')).toBe('pipelines/sales_pipeline.yaml');
    expect(editor?.getAttribute('data-language')).toBe('yaml');
    expect(editor?.value).toContain('entrypoint: "models/analytics/model_orders.sql"');
  });

  it('scopes the explorer to files that represent the active graph', async () => {
    const graphSnapshot: WorkspaceGraphSnapshot = {
      authoringAuthority: mockGraphDraftAuthoringAuthority,
      nodes: [
        {
          id: 'orders_model',
          name: 'payments model',
          type: 'MODEL',
          package: 'dbt',
          path: '',
          tags: ['model'],
          status: 'idle',
          dependencies: ['warehouse_payments'],
        },
      ],
      edges: [],
    };

    setupContainer();
    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceGraphSnapshotQuery: {
                getGraphSnapshot: async () => graphSnapshot,
              },
              workspaceFilesQuery: buildWorkspaceFilesQueryPort({
                listFiles: async () => [
                  {
                    path: 'dbt_project.yml',
                    name: 'dbt_project.yml',
                    kind: 'file',
                  },
                  {
                    path: 'models',
                    name: 'models',
                    kind: 'directory',
                    children: [
                      {
                        path: 'models/orders_model.sql',
                        name: 'orders_model.sql',
                        kind: 'file',
                      },
                      {
                        path: 'models/payments_model.sql',
                        name: 'payments_model.sql',
                        kind: 'file',
                      },
                      {
                        path: 'models/schema.yml',
                        name: 'schema.yml',
                        kind: 'file',
                      },
                    ],
                  },
                ],
                getFileContent: async (path) => ({
                  path,
                  name: path.split('/').at(-1) ?? path,
                  language: path.endsWith('.sql') ? 'sql' : 'yaml',
                  content:
                    path === 'models/payments_model.sql'
                      ? "{{ config(materialized='table') }}\n\nselect *\nfrom {{ source('finance_warehouse', 'payments_final') }}"
                      : 'version: 2',
                  contentSha256: 'a'.repeat(64),
                  lastModified: '2026-06-01T00:00:00.000Z',
                }),
              }),
            }}
          >
            <CodeView />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    await waitFor(() => container?.textContent?.includes('payments_model.sql') === true);
    await waitFor(() => container?.querySelector('[data-testid="monaco-code-viewer"]') != null);

    const currentContainer = getContainer();
    expect(currentContainer.textContent).toContain('dbt_project.yml');
    expect(currentContainer.textContent).toContain('payments_model.sql');
    expect(currentContainer.textContent).toContain('schema.yml');
    expect(currentContainer.textContent).not.toContain('orders_model.sql');

    const viewer = currentContainer.querySelector<HTMLElement>(
      '[data-testid="monaco-code-viewer"]'
    );
    expect(viewer?.getAttribute('data-path')).toBe('models/payments_model.sql');
    expect(viewer?.textContent).toContain("{{ source('finance_warehouse', 'payments_final') }}");
    expect(currentContainer.textContent).not.toContain(copy.workingTreeGraphOwnedReadOnlyLabel);
    expect(currentContainer.querySelector('[data-slot="code-working-tree-status"]')).toBeNull();
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
        container.textContent?.includes(copy.routeEmptyTitle) === true
    );

    expect(container.querySelector('[data-slot="code-route-empty-state"]')?.textContent).toContain(
      copy.routeEmptyMessage
    );
    expect(container.textContent).not.toContain(copy.explorerTitle);
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
              ...createAppServicesTestOverrides(),
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
        container.textContent?.includes(copy.routeErrorTitle) === true
    );

    expect(container.querySelector('[data-slot="code-route-error-state"]')?.textContent).toContain(
      copy.routeErrorMessage
    );
    expect(container.textContent).not.toContain(copy.explorerTitle);
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
        container.textContent?.includes(copy.previewMissingTitle) === true
    );

    expect(container.textContent).toContain(copy.explorerTitle);
    expect(container.textContent).toContain('stg_orders.sql');
    expect(
      container.querySelector('[data-slot="code-preview-error-state"]')?.textContent
    ).toContain(copy.previewMissingMessagePrefix);
    expect(
      container.querySelector('[data-slot="code-preview-error-state"]')?.textContent
    ).toContain('models/staging/stg_orders.sql');
    expect(container.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  });

  it('opens a project-scoped resource without querying the graph-draft snapshot', async () => {
    const getGraphSnapshot = vi.fn(async () => {
      throw new Error('file-backed Code must not query graph draft');
    });
    setupContainer();

    await act(async () => {
      root?.render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceGraphSnapshotQuery: { getGraphSnapshot },
              workspaceFilesQuery: buildWorkspaceFilesQueryPort({
                listFiles: async () => [
                  { path: 'dbt_project.yml', name: 'dbt_project.yml', kind: 'file' },
                  {
                    path: 'models',
                    name: 'models',
                    kind: 'directory',
                    children: [{ path: 'models/orders.sql', name: 'orders.sql', kind: 'file' }],
                  },
                ],
              }),
            }}
          >
            <CodeView
              publishRouteBootstrap={false}
              fileScope={{
                kind: 'dbt-project-files',
                projectRoot: '.',
                initialPath: 'models/orders.sql',
              }}
            />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    await waitFor(
      () =>
        getContainer()
          .querySelector('[data-testid="monaco-code-editor"]')
          ?.getAttribute('data-path') === 'models/orders.sql'
    );
    expect(getGraphSnapshot).not.toHaveBeenCalled();
  });
});
