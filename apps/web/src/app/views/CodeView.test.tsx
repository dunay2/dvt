/** Prove CodeView presentation without duplicating its host or editor boundary. */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getByRole, queryByRole, within } from '@testing-library/dom';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../ports/workspace';
import { WorkspaceFileLoadError } from '../services/workspace/workspaceErrors';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { createCodeViewTestHarness } from './code/tests/CodeView.test-support';

describe('CodeView presentation', () => {
  const harness = createCodeViewTestHarness();
  const {
    copy,
    defaultDbtFileScope,
    buildWorkspaceFilesQueryPort,
    waitFor,
    createTestQueryClient,
    getContainer,
    setupContainer,
    renderCodeView,
    waitForInitialRender,
  } = harness;
  afterEach(harness.cleanup);

  it('reacts to the configured application language inside a contextual workbench', async () => {
    setupContainer();
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    await renderCodeView(undefined, false, undefined, { fileScope: defaultDbtFileScope });
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

  it('shows loaded file properties without a second tree and collapses them without replacing the viewer', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      fileScope: defaultDbtFileScope,
      presentation: 'project-workspace',
    });
    await waitFor(() => getContainer().querySelector('[data-testid="monaco-code-viewer"]') != null);
    const viewer = getContainer().querySelector('[data-testid="monaco-code-viewer"]');
    const properties = getByRole(getContainer(), 'region', { name: 'File properties' });
    expect(within(properties).getByText('Name')).not.toBeNull();
    expect(within(properties).getByText('stg_orders.sql')).not.toBeNull();
    expect(within(properties).getByText('Path')).not.toBeNull();
    expect(within(properties).getByText('models/staging/stg_orders.sql')).not.toBeNull();
    expect(within(properties).getByText('Language')).not.toBeNull();
    expect(within(properties).getByText('sql')).not.toBeNull();
    expect(within(properties).getByText('Loaded version modified')).not.toBeNull();
    expect(properties.querySelector('time')?.getAttribute('datetime')).toBe('2026-04-06T00:00:00Z');
    expect(properties.textContent).not.toContain('a'.repeat(64));
    expect(getContainer().querySelector('[data-slot="route-workbench-left-panel"]')).toBeNull();
    const toggle = getByRole(getContainer(), 'button', { name: 'File properties' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(queryByRole(getContainer(), 'region', { name: 'File properties' })).toBeNull();
    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')).toBe(viewer);
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(getByRole(getContainer(), 'region', { name: 'File properties' }).textContent).toContain(
      'models/staging/stg_orders.sql'
    );
    expect(getContainer().querySelector('[data-testid="monaco-code-viewer"]')).toBe(viewer);
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it.each(['loaded', 'preview-error'] as const)(
    'keeps metadata bound to a successful read through a %s file selection',
    async (outcome) => {
      const firstPath = 'models/staging/stg_orders.sql';
      const nextPath = 'models/staging/stg_customers.sql';
      const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
      const selectionRead = buildDeferredFileSelectionRead(firstPath, outcome);
      const { getFileContent } = selectionRead;
      const options = {
        presentation: 'project-workspace' as const,
        fileScope: defaultDbtFileScope,
        queryClient: createTestQueryClient(),
        workspaceFilesQuery: buildWorkspaceFilesQueryPort({ getFileContent }),
      };
      setupContainer();
      try {
        await renderCodeView({ saveFileContent }, false, undefined, options);
        await waitFor(
          () => getContainer().querySelector('[data-testid="monaco-code-viewer"]') != null
        );
        expect(
          getByRole(getContainer(), 'region', { name: 'File properties' }).textContent
        ).toContain(firstPath);
        await renderCodeView({ saveFileContent }, false, undefined, {
          ...options,
          fileSelectionRequest: { path: nextPath },
        });
        await waitFor(() => selectionRead.isPending());
        const loading = getByRole(getContainer(), 'region', { name: 'File properties' });
        expect(loading.textContent).toContain(copy.previewLoadingMessage);
        expect(loading.textContent).not.toContain('stg_orders.sql');
        expect(loading.textContent).not.toContain('stg_customers.sql');
        expect(loading.querySelector('time')).toBeNull();
        await act(async () => selectionRead.settle());
        await expectSettledFileMetadata(outcome, nextPath);
        expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
        expect(saveFileContent).not.toHaveBeenCalled();
      } finally {
        await act(async () => selectionRead.settle());
      }
    }
  );

  it('renders selected-file history and hands revision review to Diff', async () => {
    setupContainer();
    await renderCodeView(undefined, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort(),
      workspaceFileHistoryQuery: {
        getFileVersionContent: async (path, commitSha) => ({ path, commitSha, content: '' }),
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
    });

    await waitForInitialRender();
    await waitFor(() => getContainer()?.textContent?.includes('File history') === true);

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

  it.each([
    {
      title: 'renders a governed route empty state when no workspace files are available',
      state: 'empty',
      heading: copy.routeEmptyTitle,
      message: copy.routeEmptyMessage,
      listFiles: async () => [],
    },
    {
      title: 'renders a governed route error state when the workspace tree cannot be loaded',
      state: 'error',
      heading: copy.routeErrorTitle,
      message: copy.routeErrorMessage,
      listFiles: async () => {
        throw new Error('request failed');
      },
    },
  ])('$title', async ({ state, heading, message, listFiles }) => {
    setupContainer();
    await renderCodeView(undefined, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({ listFiles }),
    });
    await waitFor(
      () =>
        getContainer()?.querySelector('[data-slot="code-route-' + state + '-state"]') != null &&
        getContainer().textContent?.includes(heading) === true
    );
    expect(
      getContainer().querySelector('[data-slot="code-route-' + state + '-state"]')?.textContent
    ).toContain(message);
    expect(getContainer().textContent).not.toContain(copy.explorerTitle);
  });

  it('keeps the explorer visible when the selected file preview resolves to file-not-found', async () => {
    setupContainer();

    await renderCodeView(undefined, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        getFileContent: async (path) => {
          throw new WorkspaceFileLoadError('not_found', path);
        },
      }),
    });

    await waitFor(
      () =>
        getContainer()?.querySelector('[data-slot="code-preview-error-state"]') != null &&
        getContainer().textContent?.includes(copy.previewMissingTitle) === true
    );

    expect(getContainer().textContent).toContain(copy.explorerTitle);
    expect(getContainer().textContent).toContain('stg_orders.sql');
    expect(
      getContainer().querySelector('[data-slot="code-preview-error-state"]')?.textContent
    ).toContain(copy.previewMissingMessagePrefix);
    expect(
      getContainer().querySelector('[data-slot="code-preview-error-state"]')?.textContent
    ).toContain('models/staging/stg_orders.sql');
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  });

  type DeferredFileSelectionRead = {
    getFileContent: IWorkspaceFilesQueryPort['getFileContent'];
    isPending: () => boolean;
    settle: () => void;
  };

  function buildDeferredFileSelectionRead(
    firstPath: string,
    outcome: 'loaded' | 'preview-error'
  ): DeferredFileSelectionRead {
    let settleRead: (() => void) | undefined;
    const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>((path) => {
      const file = {
        path,
        name: path.split('/').at(-1)!,
        language: 'sql',
        content: `select '${path}' as accepted_path`,
        contentSha256: (path === firstPath ? 'a' : 'b').repeat(64),
        lastModified: path === firstPath ? '2026-04-06T00:00:00Z' : '2026-08-12T00:00:00Z',
      };
      if (path === firstPath) return Promise.resolve(file);
      return new Promise((resolve, reject) => {
        settleRead = () =>
          outcome === 'preview-error'
            ? reject(new Error('Selected file cannot be read.'))
            : resolve(file);
      });
    });
    return { getFileContent, isPending: () => settleRead != null, settle: () => settleRead?.() };
  }

  async function expectSettledFileMetadata(
    outcome: 'loaded' | 'preview-error',
    nextPath: string
  ): Promise<void> {
    if (outcome === 'loaded') {
      await waitFor(
        () =>
          getContainer()
            .querySelector('[data-testid="monaco-code-viewer"]')
            ?.getAttribute('data-path') === nextPath
      );
      const accepted = getByRole(getContainer(), 'region', { name: 'File properties' });
      expect(accepted.textContent).toContain(nextPath);
      expect(accepted.textContent).not.toContain('stg_orders.sql');
      expect(accepted.querySelector('time')?.getAttribute('datetime')).toBe('2026-08-12T00:00:00Z');
    } else {
      await waitFor(
        () =>
          getByRole(getContainer(), 'region', {
            name: 'File properties',
          }).textContent?.includes(copy.previewErrorTitle) === true
      );
      const failed = getByRole(getContainer(), 'region', { name: 'File properties' });
      expect(failed.textContent).not.toContain('stg_orders.sql');
      expect(failed.textContent).not.toContain('stg_customers.sql');
      expect(failed.querySelector('time')).toBeNull();
    }
  }
});
