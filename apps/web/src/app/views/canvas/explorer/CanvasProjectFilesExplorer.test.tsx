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
import { resolveCodeViewCopy } from '../../code/codeViewCopy';
import { CanvasProjectFilesExplorer } from './CanvasProjectFilesExplorer';
import { CanvasExplorer } from './CanvasExplorer';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';

const listFiles = vi.fn<() => Promise<WorkspaceFileEntry[]>>();
const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>();
const saveFileContent = vi.fn();
const onOpenFile = vi.fn<(path: string) => void>();
let services: AppServicesOverrides;
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  useApplicationLanguageStore.setState({ language: 'en' });
  useUiLayoutStore.setState({ canvasExplorerVisible: true });
  listFiles.mockResolvedValue([
    {
      path: 'models',
      name: 'models',
      kind: 'directory',
      children: [{ path: 'models/orders.sql', name: 'orders.sql', kind: 'file' }],
    },
    { path: 'dbt_project.yml', name: 'dbt_project.yml', kind: 'file' },
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

async function renderExplorer(projectRoot?: string): Promise<void> {
  const view = (
    <AppServicesProvider overrides={services}>
      <CanvasProjectFilesExplorer projectRoot={projectRoot} onOpenFile={onOpenFile} />
    </AppServicesProvider>
  );
  if (mounted) await mounted.render(view);
  else mounted = await withTestQueryClient(view);
}

it('defers the file query until Git is opened and retains its tree after switching panels', async () => {
  mounted = await withTestQueryClient(
    <AppServicesProvider overrides={services}>
      <CanvasExplorer
        sources={<p>Catalogue</p>}
        elements={<p>Elements</p>}
        projectFiles={<CanvasProjectFilesExplorer onOpenFile={onOpenFile} />}
      >
        <input aria-label="Graph state" />
      </CanvasExplorer>
    </AppServicesProvider>
  );
  const graph = screen.getByLabelText('Graph state');
  expect(listFiles).not.toHaveBeenCalled();
  const git = screen.getByRole('button', { name: 'Git' });
  act(() => {
    fireEvent.click(git);
  });
  await waitForReactQuery(() => screen.queryByRole('button', { name: 'orders.sql' }) != null);
  const directory = screen.getByRole('button', { name: 'models' });
  act(() => {
    fireEvent.click(directory);
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Sources' }));
  });
  act(() => {
    fireEvent.click(git);
  });
  expect(screen.getByRole('button', { name: 'models' })).toBe(directory);
  expect(screen.queryByRole('button', { name: 'orders.sql' })).toBeNull();
  expect(screen.getByLabelText('Graph state')).toBe(graph);
  expect(listFiles).toHaveBeenCalledOnce();
  expect(onOpenFile).not.toHaveBeenCalled();
  expect(getFileContent).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('preserves query order and directory disclosure and requests only an explicit file path', async () => {
  await renderExplorer();
  await waitForReactQuery(() => screen.queryByRole('button', { name: 'orders.sql' }) != null);
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
    'models',
    'orders.sql',
    'dbt_project.yml',
  ]);
  expect(listFiles).toHaveBeenCalledOnce();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'models' }));
  });
  expect(screen.queryByRole('button', { name: 'orders.sql' })).toBeNull();
  expect(onOpenFile).not.toHaveBeenCalled();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'models' }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'orders.sql' }));
  });
  expect(onOpenFile).toHaveBeenCalledExactlyOnceWith('models/orders.sql');
  expect(getFileContent).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('projects the actual DBT root without changing the shared query or admitting a similarly named root', async () => {
  listFiles.mockResolvedValue([
    {
      path: 'projects',
      name: 'projects',
      kind: 'directory',
      children: [
        {
          path: 'projects/warehouse',
          name: 'warehouse',
          kind: 'directory',
          children: [{ path: 'projects/warehouse/orders.sql', name: 'orders.sql', kind: 'file' }],
        },
        {
          path: 'projects/warehouse-other',
          name: 'warehouse-other',
          kind: 'directory',
          children: [
            { path: 'projects/warehouse-other/private.sql', name: 'private.sql', kind: 'file' },
          ],
        },
      ],
    },
    { path: 'outside.yml', name: 'outside.yml', kind: 'file' },
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
  'presents localized %s without fallback files or commands',
  async (state) => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const copy = resolveCodeViewCopy('es');
    if (state === 'loading') listFiles.mockImplementation(() => new Promise(() => {}));
    else if (state === 'empty') listFiles.mockResolvedValue([]);
    else listFiles.mockRejectedValue(new Error('PRIVATE_SERVER_PATH'));
    await renderExplorer();
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
    expect(onOpenFile).not.toHaveBeenCalled();
    expect(getFileContent).not.toHaveBeenCalled();
    expect(saveFileContent).not.toHaveBeenCalled();
  }
);

it('treats an empty bound root as empty instead of exposing outside files', async () => {
  await renderExplorer('missing/project');
  const copy = resolveCodeViewCopy('en');
  await waitForReactQuery(() => screen.queryByText(copy.routeEmptyMessage) != null);
  expect(screen.queryByRole('button')).toBeNull();
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
