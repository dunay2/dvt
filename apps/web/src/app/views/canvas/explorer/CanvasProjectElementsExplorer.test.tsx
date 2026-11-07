// @vitest-environment jsdom
/** Owned concern: prove project navigation uses scoped authoritative reads without graph writes. */
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import { act } from 'react';
import { fireEvent, screen } from '@testing-library/dom';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../../testing/appServicesTestDoubles';
import { createMockSessionContextPort } from '../../../../testing/runsPortDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../../services/AppServicesContext';
import type { AppServicesOverrides } from '../../../services/composition/appServices';
import type { IWorkspaceFilesQueryPort } from '../../../ports/workspace';
import type { IDbtProjectGraphQueryPort } from '../../../ports/dbtProjectGraph';
import { queryKeys } from '../../../queries/queryKeys';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasProjectElementsExplorer } from './CanvasProjectElementsExplorer';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import { canvasDbtModelDefinitionId } from '../canvasDbtModelReference';

const binding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'file-owner',
  authority: { kind: 'dbt-project-files', projectRoot: '.' },
} as const;
const project = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  authorityBinding: binding,
  freshness: 'fresh',
  adapterType: 'postgres',
  analysisSha256: '1'.repeat(64),
  projectRevision: {
    projectRoot: '.',
    projectName: 'demo',
    contentSetSha256: '2'.repeat(64),
    analyzedAt: '2026-11-02T00:00:00.000Z',
    analyzerVersion: 'dbt-cli-v1',
    dbtVersion: '1.10.0',
  },
  nodes: ['clientes', 'pedidos', 'ventas_por_cliente'].map((name) => ({
    uniqueId: `model.demo.${name}`,
    resourceType: 'model',
    name,
    packageName: 'demo',
    originalFilePath: `models/${name}.sql`,
    columns: [{ name: 'id', dataType: 'text' }],
    tags: [],
    visualEditability: { status: 'code_only', reasons: ['File authority'] },
  })),
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 3 },
  executionTarget: {
    provider: 'temporal',
    adapter: 'postgres',
    targetName: 'default',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    },
    resolutionSource: 'environment-default',
    credentialRef: 'env:DBT_PROFILES_DIR',
  },
});
const listFiles = vi.fn<IWorkspaceFilesQueryPort['listFiles']>();
const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>();
const getProjectGraph = vi.fn<IDbtProjectGraphQueryPort['getProjectGraph']>();
const saveFileContent = vi.fn();
const onSelect = vi.fn();
const onDragStart = vi.fn();
let services: AppServicesOverrides;
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;

function Location(): JSX.Element {
  const location = useLocation();
  return <output aria-label="Location">{location.pathname + location.search}</output>;
}
async function render(
  enabled = true,
  items: readonly CanvasExplorerItem[] = [{ id: 'native', label: 'Model 1' }],
  canCreateInstances = true
): Promise<void> {
  const view = (
    <AppServicesProvider overrides={services}>
      <MemoryRouter initialEntries={['/canvas']}>
        <CanvasProjectElementsExplorer
          enabled={enabled}
          items={items}
          onSelect={onSelect}
          onDragStart={onDragStart}
          canCreateInstances={canCreateInstances}
        />
        <Location />
      </MemoryRouter>
    </AppServicesProvider>
  );
  if (mounted) await mounted.render(view);
  else mounted = await withTestQueryClient(view);
}
beforeEach(() => {
  vi.resetAllMocks();
  useApplicationLanguageStore.setState({ language: 'en' });
  listFiles.mockResolvedValue([
    { name: 'dbt_project.yml', path: 'dbt_project.yml', kind: 'file' },
    ...['clientes', 'pedidos', 'ventas_por_cliente'].map((name) => ({
      name: `${name}.sql`,
      path: `models/${name}.sql`,
      kind: 'file' as const,
    })),
  ]);
  getFileContent.mockResolvedValue({
    path: 'dbt_project.yml',
    name: 'dbt_project.yml',
    language: 'yaml',
    content: 'name: demo',
    contentSha256: '3'.repeat(64),
    lastModified: '2026-11-02T00:00:00.000Z',
    authoringAuthority: { kind: 'resolved', binding },
  });
  getProjectGraph.mockResolvedValue(project);
  services = {
    ...createAppServicesTestOverrides(),
    workspaceFilesQuery: { listFiles, getFileContent },
    workspaceFileContentCommand: { saveFileContent },
    dbtProjectGraphQueryPort: { getProjectGraph },
  };
});
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

it('admits native and file-model definitions without navigation or file writes', async () => {
  await render();
  await waitForReactQuery(
    () => screen.queryByRole('button', { name: /ventas_por_cliente/ }) != null
  );
  for (const name of ['clientes', 'pedidos', 'ventas_por_cliente'])
    expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Model 1' }));
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('native');
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /pedidos/ }));
  });
  expect(screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ }).disabled).toBe(false);
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelect.mock.calls[1]?.[1]?.metadata?.dbtModelReference).toMatchObject({
    canvasId: binding.canvasId,
    uniqueId: 'model.demo.pedidos',
  });
  expect(screen.getByLabelText('Location').textContent).toBe('/canvas');
  expect(getProjectGraph).toHaveBeenCalledExactlyOnceWith(binding);
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('shows the workspace path when the project root repeats a model directory', async () => {
  const nestedBinding = { ...binding, authority: { ...binding.authority, projectRoot: 'models' } };
  listFiles.mockResolvedValue([
    { name: 'dbt_project.yml', path: 'models/dbt_project.yml', kind: 'file' },
  ]);
  getFileContent.mockResolvedValue({
    path: 'models/dbt_project.yml',
    name: 'dbt_project.yml',
    language: 'yaml',
    content: 'name: demo',
    contentSha256: '3'.repeat(64),
    lastModified: '2026-11-02T00:00:00.000Z',
    authoringAuthority: { kind: 'resolved', binding: nestedBinding },
  });
  getProjectGraph.mockResolvedValue({
    ...project,
    authorityBinding: nestedBinding,
    projectRevision: { ...project.projectRevision, projectRoot: 'models' },
  });
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /clientes/ }) != null);
  expect(screen.getByRole('button', { name: /clientes/ }).title).toBe(
    'clientes · models/models/clientes.sql'
  );
});

it('uses the authoritative model identity rather than inferring existence from file-tree entries', async () => {
  listFiles.mockResolvedValue([{ name: 'dbt_project.yml', path: 'dbt_project.yml', kind: 'file' }]);
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  const row = screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ });
  expect(row.disabled).toBe(false);
  act(() => {
    fireEvent.click(row);
  });
  expect(onSelect).toHaveBeenCalledOnce();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('keeps file-model admission unavailable in a read-only workspace', async () => {
  await render(true, [], false);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  const model = screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ });
  expect(model.disabled).toBe(true);
  expect(model.draggable).toBe(false);
  act(() => {
    fireEvent.click(model);
  });
  expect(onSelect).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('reports a missing published output without creating a partial instance', async () => {
  getProjectGraph.mockResolvedValue({
    ...project,
    nodes: project.nodes.map((node) => ({ ...node, columns: [] })),
  });
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /pedidos/ }));
  });
  expect(screen.getByRole('alert').textContent).toMatch(/output|schema/i);
  expect(onSelect).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('retains native drag and transfers a typed external model definition through the same admission adapter', async () => {
  await render(true, [{ id: 'source', label: 'Orders', category: 'Sources', draggable: true }]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  const source = screen.getByRole<HTMLButtonElement>('button', { name: 'Orders' });
  expect(source.draggable).toBe(true);
  act(() => {
    fireEvent.dragStart(source, { dataTransfer: {} });
  });
  expect(onDragStart.mock.calls[0]?.[0]).toBe('source');
  const model = screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ });
  expect(model.draggable).toBe(true);
  const setData = vi.fn();
  act(() => {
    fireEvent.dragStart(model, { dataTransfer: { setData } });
  });
  expect(JSON.parse(setData.mock.calls[0]![1]).metadata.dbtModelReference.uniqueId).toBe(
    'model.demo.pedidos'
  );
  expect(screen.getByRole('heading', { name: 'Models' })).toBeTruthy();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('deduplicates by identity while preserving a distinct native element with the same name', async () => {
  await render(true, [
    { id: 'native', label: 'clientes' },
    {
      id: canvasDbtModelDefinitionId(binding.canvasId, 'model.demo.clientes'),
      label: 'clientes',
      selected: true,
    },
  ]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  expect(
    mounted!.container.querySelectorAll(
      `[data-element-id="${canvasDbtModelDefinitionId(binding.canvasId, 'model.demo.clientes')}"]`
    )
  ).toHaveLength(1);
  expect(mounted!.container.querySelectorAll('[data-element-id="native"]')).toHaveLength(1);
  act(() => {
    fireEvent.click(
      mounted!.container.querySelector<HTMLButtonElement>(
        `[data-element-id="${canvasDbtModelDefinitionId(binding.canvasId, 'model.demo.clientes')}"]`
      )!
    );
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(
    canvasDbtModelDefinitionId(binding.canvasId, 'model.demo.clientes')
  );
});

it('does no discovery while closed and reuses graph analysis across close and reopen', async () => {
  await render(false);
  // Exercise the browser cache lifetime; the shared harness otherwise collects inactive queries immediately.
  mounted!.queryClient.setQueryDefaults(queryKeys.workspace.dbtProjectGraphRoot(), {
    gcTime: 5 * 60 * 1000,
  });
  expect(listFiles).not.toHaveBeenCalled();
  expect(getFileContent).not.toHaveBeenCalled();
  expect(getProjectGraph).not.toHaveBeenCalled();
  await render(true);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  const graphQuery = mounted!.queryClient
    .getQueryCache()
    .findAll({
      queryKey: queryKeys.workspace.dbtProjectGraphRoot(),
    })
    .find((query) => query.state.data === project);
  expect(graphQuery).toBeDefined();
  vi.useFakeTimers();
  try {
    await render(false);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(mounted!.queryClient.getQueryData(graphQuery!.queryKey)).toBe(project);
    await render(true);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByRole('button', { name: /pedidos/ })).toBeTruthy();
    expect(getProjectGraph).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

it.each(['unresolved', 'ambiguous', 'stale', 'wrong-owner', 'denied'] as const)(
  'keeps native rows without admitting external models when %s',
  async (state) => {
    if (state === 'unresolved')
      getFileContent.mockResolvedValue({
        ...(await getFileContent('dbt_project.yml')),
        authoringAuthority: { kind: 'unresolved', reason: 'missing_authority', canvasId: null },
      });
    if (state === 'ambiguous')
      listFiles.mockResolvedValue([
        { name: 'dbt_project.yml', path: 'a/dbt_project.yml', kind: 'file' },
        { name: 'dbt_project.yml', path: 'b/dbt_project.yml', kind: 'file' },
      ]);
    if (state === 'stale')
      getProjectGraph.mockResolvedValue({ ...project, freshness: 'stale-last-valid' });
    if (state === 'wrong-owner')
      getProjectGraph.mockResolvedValue({
        ...project,
        authorityBinding: { ...binding, canvasId: 'other' },
      });
    if (state === 'denied') listFiles.mockRejectedValue(new Error('PRIVATE_BACKEND_PATH'));
    await render();
    await waitForReactQuery(() => screen.queryByRole('alert') != null);
    expect(screen.getByRole('button', { name: 'Model 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /pedidos/ })).toBeNull();
    expect(mounted!.container.textContent).not.toContain('PRIVATE_BACKEND_PATH');
    expect(saveFileContent).not.toHaveBeenCalled();
    if (state === 'ambiguous' || state === 'unresolved')
      expect(getProjectGraph).not.toHaveBeenCalled();
  }
);

it.each(['tenantId', 'projectId', 'environmentId'] as const)(
  'does not retain another %s model list',
  async (field) => {
    const session = createMockSessionContextPort();
    let scope = session.getWorkspaceScopeSnapshot();
    const listeners = new Set<() => void>();
    services = {
      ...services,
      sessionContext: {
        ...session,
        getWorkspaceScope: () => scope,
        getWorkspaceScopeSnapshot: () => scope,
        subscribeWorkspaceScope: (listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      },
    };
    await render();
    await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
    listFiles.mockResolvedValue([]);
    act(() => {
      scope = { ...scope, [field]: 'other' };
      for (const listener of listeners) listener();
    });
    expect(screen.queryByRole('button', { name: /pedidos/ })).toBeNull();
    await waitForReactQuery(() => listFiles.mock.calls.length === 2);
    expect(getProjectGraph).toHaveBeenCalledTimes(1);
  }
);
