/** Prove CodeView presentation without duplicating its host or editor boundary. */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getByRole, queryByRole, within } from '@testing-library/dom';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../ports/workspace';
import {
  WorkspaceFileLoadError,
  WorkspaceFileRevisionConflictError,
} from '../services/workspace/workspaceErrors';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { createCodeViewTestHarness } from './code/tests/CodeView.test-support';

describe('CodeView presentation', () => {
  const harness = createCodeViewTestHarness();
  const {
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
  } = harness;
  afterEach(harness.cleanup);

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

  it('shows loaded file properties without a second tree and collapses them without replacing the editor', async () => {
    const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
    setupContainer();
    await renderCodeView({ saveFileContent }, false, undefined, {
      fileScope: defaultEditableFileScope,
      presentation: 'project-workspace',
    });
    await waitFor(() => getContainer().querySelector('[data-testid="monaco-code-editor"]') != null);
    const editor = getContainer().querySelector('[data-testid="monaco-code-editor"]');
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
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(getByRole(getContainer(), 'region', { name: 'File properties' }).textContent).toContain(
      'models/staging/stg_orders.sql'
    );
    expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
    expect(saveFileContent).not.toHaveBeenCalled();
  });

  it.each(['saved', 'conflict', 'preview-error'] as const)(
    'keeps properties on the accepted file through a %s transition',
    async (outcome) => {
      const firstPath = 'models/staging/stg_orders.sql';
      const nextPath = 'models/staging/stg_customers.sql';
      let settleSave: (() => void) | undefined;
      let settleRead: (() => void) | undefined;
      const saveFileContent = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(
        () =>
          new Promise((resolve, reject) => {
            settleSave = () =>
              outcome === 'conflict'
                ? reject(new WorkspaceFileRevisionConflictError(firstPath))
                : resolve({
                    kind: 'saved',
                    disposition: 'updated',
                    path: firstPath,
                    contentSha256: 'b'.repeat(64),
                    lastModified: '2026-10-29T00:00:00Z',
                  });
          })
      );
      const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>((path) => {
        const file = {
          path,
          name: path.split('/').at(-1)!,
          language: 'sql',
          content: 'select 1',
          contentSha256: 'a'.repeat(64),
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
      const options = {
        presentation: 'project-workspace' as const,
        fileScope: defaultEditableFileScope,
        queryClient: createTestQueryClient(),
        workspaceFilesQuery: buildWorkspaceFilesQueryPort({ getFileContent }),
      };
      setupContainer();
      try {
        await renderCodeView({ saveFileContent }, false, undefined, options);
        await waitFor(
          () => getContainer().querySelector('[data-testid="monaco-code-editor"]') != null
        );
        const editor = getContainer().querySelector<HTMLTextAreaElement>(
          '[data-testid="monaco-code-editor"]'
        );
        expect(
          getByRole(getContainer(), 'region', { name: 'File properties' }).textContent
        ).toContain(firstPath);
        await editAndVerifyEditor(editor);
        await renderCodeView({ saveFileContent }, false, undefined, {
          ...options,
          fileSelectionRequest: { path: nextPath },
        });
        expect(saveFileContent).toHaveBeenCalledExactlyOnceWith({
          path: firstPath,
          content: 'select 1 as edited_value',
          expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
        });
        expect(getContainer().querySelector('[data-testid="monaco-code-editor"]')).toBe(editor);
        expect(editor?.getAttribute('data-path')).toBe(firstPath);
        const pending = getByRole(getContainer(), 'region', { name: 'File properties' });
        expect(pending.textContent).toContain(firstPath);
        expect(pending.textContent).not.toContain(nextPath);
        expect(pending.querySelector('time')?.getAttribute('datetime')).toBe(
          '2026-04-06T00:00:00Z'
        );
        expect(getFileContent.mock.calls.some(([path]) => path === nextPath)).toBe(false);
        await act(async () => settleSave?.());
        if (outcome === 'conflict') {
          await waitFor(
            () =>
              getContainer()
                .querySelector('[data-slot="code-working-tree-status"]')
                ?.getAttribute('data-phase') === 'conflict'
          );
          expect(editor?.value).toBe('select 1 as edited_value');
          expect(
            getByRole(getContainer(), 'region', { name: 'File properties' }).textContent
          ).toContain(firstPath);
          expect(getFileContent.mock.calls.some(([path]) => path === nextPath)).toBe(false);
        } else {
          await waitFor(() => settleRead != null);
          const loading = getByRole(getContainer(), 'region', { name: 'File properties' });
          expect(loading.textContent).toContain(copy.previewLoadingMessage);
          expect(loading.textContent).not.toContain('stg_orders.sql');
          expect(loading.querySelector('time')).toBeNull();
          await act(async () => settleRead?.());
          if (outcome === 'saved') {
            await waitFor(
              () =>
                getContainer()
                  .querySelector('[data-testid="monaco-code-editor"]')
                  ?.getAttribute('data-path') === nextPath
            );
            const accepted = getByRole(getContainer(), 'region', { name: 'File properties' });
            expect(accepted.textContent).toContain(nextPath);
            expect(accepted.textContent).not.toContain('stg_orders.sql');
            expect(accepted.querySelector('time')?.getAttribute('datetime')).toBe(
              '2026-08-12T00:00:00Z'
            );
          } else {
            await waitFor(
              () =>
                getByRole(getContainer(), 'region', {
                  name: 'File properties',
                }).textContent?.includes(copy.previewErrorTitle) === true
            );
            const failed = getByRole(getContainer(), 'region', { name: 'File properties' });
            expect(failed.textContent).not.toContain('stg_orders.sql');
            expect(failed.querySelector('time')).toBeNull();
          }
        }
        expect(saveFileContent).toHaveBeenCalledOnce();
      } finally {
        await act(async () => {
          settleSave?.();
          settleRead?.();
        });
      }
    }
  );

  it('renders selected-file history and hands revision review to Diff', async () => {
    setupContainer();
    await renderCodeView(undefined, true, undefined, {
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

  it('renders a governed route empty state when no workspace files are available', async () => {
    setupContainer();

    await renderCodeView(undefined, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({ listFiles: async () => [] }),
    });

    await waitFor(
      () =>
        getContainer()?.querySelector('[data-slot="code-route-empty-state"]') != null &&
        getContainer().textContent?.includes(copy.routeEmptyTitle) === true
    );

    expect(
      getContainer().querySelector('[data-slot="code-route-empty-state"]')?.textContent
    ).toContain(copy.routeEmptyMessage);
    expect(getContainer().textContent).not.toContain(copy.explorerTitle);
  });

  it('renders a governed route error state when the workspace tree cannot be loaded', async () => {
    setupContainer();

    await renderCodeView(undefined, true, undefined, {
      workspaceFilesQuery: buildWorkspaceFilesQueryPort({
        listFiles: async () => {
          throw new Error('request failed');
        },
      }),
    });

    await waitFor(
      () =>
        getContainer()?.querySelector('[data-slot="code-route-error-state"]') != null &&
        getContainer().textContent?.includes(copy.routeErrorTitle) === true
    );

    expect(
      getContainer().querySelector('[data-slot="code-route-error-state"]')?.textContent
    ).toContain(copy.routeErrorMessage);
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
});
