/** Own only CodeView's per-suite test host, port defaults and local Monaco boundary. */
import { createAppServicesTestOverrides } from '../../../../testing/appServicesTestDoubles';
import { act, type RefObject } from 'react';
import { expect, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
} from '../../../ports/workspace';
import { AppServicesProvider } from '../../../services/AppServicesContext';
import CodeView, {
  type CodeViewFileScope,
  type CodeViewHandle,
  type CodeViewProps,
} from '../../CodeView';
import { resolveCodeViewCopy } from '../codeViewCopy';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';

vi.mock('../../../components/monaco/MonacoCodeEditor', () => ({
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

vi.mock('../../../components/monaco/MonacoCodeViewer', () => ({
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

export function createCodeViewTestHarness() {
  const copy = resolveCodeViewCopy('en-US');
  const defaultEditableFileScope: CodeViewFileScope = {
    kind: 'dbt-project-files',
    projectRoot: '.',
    initialPath: 'models/staging/stg_orders.sql',
  };
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

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
      workspaceFileHistoryQuery?: IWorkspaceFileHistoryQueryPort;
      reconcilePersistedFile?: NonNullable<
        Parameters<typeof CodeView>[0]['reconcilePersistedFile']
      >;
      fileScope?: CodeViewFileScope;
      initialPath?: string;
      fileSelectionRequest?: CodeViewProps['fileSelectionRequest'];
      presentation?: CodeViewProps['presentation'];
      queryClient?: QueryClient;
      workspaceGraphSnapshotQuery?: IWorkspaceGraphSnapshotQueryPort;
    }> = {}
  ): Promise<void> {
    await act(async () => {
      root?.render(
        <QueryClientProvider client={options.queryClient ?? createTestQueryClient()}>
          {' '}
          <AppServicesProvider
            overrides={{
              ...createAppServicesTestOverrides(),
              workspaceFilesQuery: options.workspaceFilesQuery ?? buildWorkspaceFilesQueryPort(),
              ...(options.workspaceGraphSnapshotQuery
                ? { workspaceGraphSnapshotQuery: options.workspaceGraphSnapshotQuery }
                : {}),
              ...(workspaceFileContentCommand ? { workspaceFileContentCommand } : {}),
              ...(options.workspaceFileHistoryQuery
                ? { workspaceFileHistoryQuery: options.workspaceFileHistoryQuery }
                : {}),
            }}
          >
            {' '}
            <CodeView
              ref={codeViewRef}
              publishRouteBootstrap={publishRouteBootstrap}
              fileScope={options.fileScope}
              initialPath={options.initialPath}
              fileSelectionRequest={options.fileSelectionRequest}
              presentation={options.presentation}
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

  const cleanup = () => {
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
  };
  return {
    copy,
    defaultEditableFileScope,
    buildWorkspaceFilesQueryPort,
    waitFor,
    createTestQueryClient,
    getContainer,
    setupContainer,
    renderCodeView,
    waitForInitialRender,
    editAndVerifyEditor,
    cleanup,
  };
}
