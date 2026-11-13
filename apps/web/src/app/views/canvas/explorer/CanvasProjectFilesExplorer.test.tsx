// @vitest-environment jsdom
/** Owned concern: prove the Canvas adapter reuses the real scoped query and passive file tree. */
import { act } from 'react';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../../testing/appServicesTestDoubles';
import { createMockSessionContextPort } from '../../../../testing/runsPortDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../../services/AppServicesContext';
import type { AppServicesOverrides } from '../../../services/composition/appServices';
import type { IWorkspaceFilesQueryPort, WorkspaceFileEntry } from '../../../ports/workspace';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveCodeFileCreationCopy, resolveCodeViewCopy } from '../../code/codeViewCopy';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import { CanvasProjectFilesExplorer } from './CanvasProjectFilesExplorer';

const listFiles = vi.fn<() => Promise<WorkspaceFileEntry[]>>();
const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>();
const saveFileContent = vi.fn();
const onOpenFile = vi.fn<(path: string) => void>();
let services: AppServicesOverrides;
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;

function fileEntry(path: string): WorkspaceFileEntry {
  return { path, name: path.slice(path.lastIndexOf('/') + 1), kind: 'file' };
}

function directoryEntry(path: string, children: WorkspaceFileEntry[]): WorkspaceFileEntry {
  return { path, name: path.slice(path.lastIndexOf('/') + 1), kind: 'directory', children };
}

beforeEach(() => {
  vi.resetAllMocks();
  useApplicationLanguageStore.setState({ language: 'en' });
  listFiles.mockResolvedValue([
    directoryEntry('models', [fileEntry('models/orders.sql')]),
    fileEntry('dbt_project.yml'),
  ]);
  services = {
    ...createAppServicesTestOverrides(),
    workspaceFilesQuery: { listFiles, getFileContent },
    workspaceFileContentCommand: { saveFileContent },
  };
});
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
  useApplicationLanguageStore.setState({ language: 'en' });
});

async function renderExplorer(
  projectRoot?: string,
  onImportDbtProject?: () => void
): Promise<void> {
  const view = (
    <AppServicesProvider overrides={services}>
      <CanvasProjectFilesExplorer
        projectRoot={projectRoot}
        onOpenFile={onOpenFile}
        onImportDbtProject={onImportDbtProject}
      />
    </AppServicesProvider>
  );
  if (mounted) await mounted.render(view);
  else mounted = await withTestQueryClient(view);
}

it('preserves query order and directory disclosure and requests only an explicit file path', async () => {
  await renderExplorer();
  await waitForReactQuery(() => screen.queryByRole('button', { name: 'orders.sql' }) != null);
  expect(
    screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('data-workspace-path'))
      .map((button) => button.textContent)
  ).toEqual(['models', 'orders.sql', 'dbt_project.yml']);
  expect(listFiles).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Import dbt project' })).toBeNull();
  act(() => fireEvent.click(screen.getByRole('button', { name: 'models' })));
  expect(screen.queryByRole('button', { name: 'orders.sql' })).toBeNull();
  expect(onOpenFile).not.toHaveBeenCalled();
  act(() => fireEvent.click(screen.getByRole('button', { name: 'models' })));
  act(() => fireEvent.click(screen.getByRole('button', { name: 'orders.sql' })));
  expect(onOpenFile).toHaveBeenCalledExactlyOnceWith('models/orders.sql');
  expect(getFileContent).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('projects the actual DBT root without changing the shared query or admitting a similarly named root', async () => {
  listFiles.mockResolvedValue([
    directoryEntry('projects', [
      directoryEntry('projects/warehouse', [fileEntry('projects/warehouse/orders.sql')]),
      directoryEntry('projects/warehouse-other', [
        fileEntry('projects/warehouse-other/private.sql'),
      ]),
    ]),
    fileEntry('outside.yml'),
  ]);
  await renderExplorer();
  await waitForReactQuery(() => screen.queryByRole('button', { name: 'outside.yml' }) != null);
  await renderExplorer('projects/warehouse');
  expect(screen.queryByRole('button', { name: 'outside.yml' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'private.sql' })).toBeNull();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'orders.sql' }));
  });
  expect(onOpenFile).toHaveBeenCalledExactlyOnceWith('projects/warehouse/orders.sql');
  expect(listFiles).toHaveBeenCalledOnce();
});

it.each(['loading', 'empty', 'error'] as const)(
  'presents localized %s, safe file actions and an independent project import',
  async (state) => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const copy = resolveCodeViewCopy('es');
    const onImport = vi.fn();
    if (state === 'loading') listFiles.mockImplementation(() => new Promise(() => {}));
    else if (state === 'empty') listFiles.mockResolvedValue([]);
    else listFiles.mockRejectedValue(new Error('PRIVATE_SERVER_PATH'));
    await renderExplorer(undefined, onImport);
    await waitForReactQuery(() =>
      state === 'loading'
        ? screen.queryByText(copy.routeLoadingMessage) != null
        : state === 'empty'
          ? screen.queryByText(copy.routeEmptyMessage) != null
          : screen.queryByRole('alert') != null
    );
    if (state === 'error')
      expect(screen.getByRole('alert').textContent).toContain(copy.routeErrorMessage);
    expect(mounted!.container.textContent).not.toContain('PRIVATE_SERVER_PATH');
    expect(screen.queryByRole('button', { name: 'orders.sql' })).toBeNull();
    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', {
          name: resolveCanvasViewCopy('es').workspaceImportDbtProjectLabel,
        })
      )
    );
    expect(onImport).toHaveBeenCalledOnce();
    expect(onOpenFile).not.toHaveBeenCalled();
    expect(getFileContent).not.toHaveBeenCalled();
    expect(saveFileContent).not.toHaveBeenCalled();
    const fileActions = resolveCodeFileCreationCopy('es');
    for (const name of [fileActions.newFile, fileActions.importFile])
      expect(screen.getByRole('button', { name })).toHaveProperty('disabled', state !== 'empty');
  }
);

it('treats an empty bound root as empty instead of exposing outside files', async () => {
  await renderExplorer('missing/project');
  const copy = resolveCodeViewCopy('en');
  await waitForReactQuery(() => screen.queryByText(copy.routeEmptyMessage) != null);
  expect(screen.queryByRole('button', { name: 'orders.sql' })).toBeNull();
  expect(screen.getByRole('button', { name: 'New file' })).toHaveProperty('disabled', false);
});

it.each(['tenantId', 'projectId', 'environmentId'] as const)(
  'isolates cached trees when %s changes',
  async (field) => {
    const session = createMockSessionContextPort();
    let scope: ReturnType<typeof session.getWorkspaceScopeSnapshot> =
      session.getWorkspaceScopeSnapshot();
    let notify = (): void => {};
    services = {
      ...services,
      sessionContext: {
        ...session,
        getWorkspaceScope: () => scope,
        getWorkspaceScopeSnapshot: () => scope,
        subscribeWorkspaceScope: (listener) => {
          notify = listener;
          return () => {
            notify = (): void => {};
          };
        },
      },
    };
    listFiles.mockImplementation(async () => [
      { path: scope[field] + '.sql', name: scope[field] + '.sql', kind: 'file' },
    ]);
    const before = scope[field] + '.sql';
    await renderExplorer();
    await waitForReactQuery(() => screen.queryByRole('button', { name: before }) != null);
    act(() => {
      scope = { ...scope, [field]: 'other' };
      notify();
    });
    expect(screen.queryByRole('button', { name: before })).toBeNull();
    await waitForReactQuery(() => screen.queryByRole('button', { name: 'other.sql' }) != null);
    expect(listFiles).toHaveBeenCalledTimes(2);
    expect(getFileContent).not.toHaveBeenCalled();
    expect(saveFileContent).not.toHaveBeenCalled();
  }
);
