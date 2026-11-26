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
import { CanvasExplorerDocumentsContext } from './CanvasExplorerDocuments';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import { canvasDbtModelDefinitionId } from '../canvasDbtModelReference';
import * as modelReferences from '../canvasDbtModelReference';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';
import type { DragEvent } from 'react';
import { ApiError } from '../../../services/api/createApiClient';

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
          onInspectNode={onSelect}
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
  vi.restoreAllMocks();
});

it('keeps the worksheet name and keyboard focus while the model catalog resolves', async () => {
  const doc = { id: 'sales', kind: 'transformation' as const, title: 'Sales' };
  const workspace = { activeId: doc.id, documents: [doc], onAddCanvas: vi.fn() };
  let publishFiles!: (files: Awaited<ReturnType<IWorkspaceFilesQueryPort['listFiles']>>) => void;
  listFiles.mockReturnValueOnce(
    new Promise((resolve) => {
      publishFiles = resolve;
    })
  );
  mounted = await withTestQueryClient(
    <AppServicesProvider overrides={services}>
      <MemoryRouter>
        <CanvasExplorerDocumentsContext.Provider value={workspace}>
          <CanvasProjectElementsExplorer enabled items={[]} onInspectNode={onSelect} />
        </CanvasExplorerDocumentsContext.Provider>
      </MemoryRouter>
    </AppServicesProvider>
  );
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Add canvas' }));
  });
  const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Canvas name' });
  act(() => {
    fireEvent.change(field, { target: { value: 'Forecast' } });
    publishFiles([{ name: 'dbt_project.yml', path: 'dbt_project.yml', kind: 'file' }]);
  });
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  expect(screen.getByRole('textbox', { name: 'Canvas name' })).toBe(field);
  expect(document.activeElement).toBe(field);
  expect(field.value).toBe('Forecast');
});

it('keeps the same search, query and row disclosure when the initial binding arrives', async () => {
  let publish!: (files: Awaited<ReturnType<IWorkspaceFilesQueryPort['listFiles']>>) => void;
  const files = await listFiles();
  listFiles.mockReturnValueOnce(
    new Promise((resolve) => {
      publish = resolve;
    })
  );
  await render(true, [
    { id: 'native', label: 'Model 1', details: [{ label: 'identifier', value: 'native' }] },
  ]);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Details: Model 1' }));
  });
  const search = screen.getByRole<HTMLInputElement>('searchbox');
  act(() => {
    fireEvent.change(search, { target: { value: 'Model' } });
    search.focus();
    publish(files);
  });
  await waitForReactQuery(
    () =>
      getProjectGraph.mock.calls.length > 0 &&
      mounted!.container
        .querySelector('[data-slot="canvas-explorer-models"]')
        ?.getAttribute('aria-busy') === 'false'
  );
  expect(screen.getByRole('searchbox')).toBe(search);
  expect(search.value).toBe('Model');
  expect(document.activeElement).toBe(search);
  expect(
    screen.getByRole('button', { name: 'Details: Model 1' }).getAttribute('aria-expanded')
  ).toBe('true');
});

function projectRefreshFailure(statusCode: number | null): ApiError {
  return new ApiError({
    message: 'PRIVATE_BACKEND_PATH',
    endpoint: '/proof',
    statusCode,
    category: statusCode == null ? 'network' : statusCode >= 500 ? 'server' : 'client',
  });
}

async function refreshProjectCatalogue(): Promise<void> {
  await act(async () => {
    await mounted!.queryClient.refetchQueries({
      queryKey: queryKeys.workspace.dbtProjectGraphRoot(),
    });
  });
}

it.each([503, null])(
  'retains same-identity rows for transient refresh %s without admitting placement',
  async (statusCode) => {
    await render();
    await waitForReactQuery(
      () => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null
    );
    const row = screen.getByRole<HTMLButtonElement>('button', { name: /^pedidos(?:\s|$)/ });
    getProjectGraph.mockRejectedValueOnce(projectRefreshFailure(statusCode));
    await refreshProjectCatalogue();
    await waitForReactQuery(() => screen.queryByRole('alert') != null);
    expect(screen.getByRole('button', { name: /^pedidos(?:\s|$)/ })).toBe(row);
    expect(row.draggable).toBe(false);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(mounted!.container.textContent).not.toContain('PRIVATE_BACKEND_PATH');
    expect(
      mounted!.container.querySelector('[data-slot="canvas-explorer-model-count"]')
    ).toBeNull();
    const setData = vi.fn();
    act(() => {
      fireEvent.dragStart(row, { dataTransfer: { setData } });
    });
    expect(setData).not.toHaveBeenCalled();
    await refreshProjectCatalogue();
    await waitForReactQuery(() => screen.queryByRole('alert') == null);
    expect(screen.getByRole('button', { name: /^pedidos(?:\s|$)/ })).toBe(row);
    expect(row.draggable).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(getProjectGraph).toHaveBeenCalledTimes(3);
    expect(saveFileContent).not.toHaveBeenCalled();
  }
);

it.each([401, 403, 404, 422, 'unknown'] as const)(
  'does not display a cached publication after refresh rejection %s',
  async (statusCode) => {
    await render();
    await waitForReactQuery(
      () => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null
    );
    getProjectGraph.mockRejectedValueOnce(
      statusCode === 'unknown'
        ? new Error('PRIVATE_BACKEND_PATH')
        : projectRefreshFailure(statusCode)
    );
    await refreshProjectCatalogue();
    await waitForReactQuery(() => screen.queryByRole('alert') != null);
    expect(screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Model 1' })).toBeTruthy();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(saveFileContent).not.toHaveBeenCalled();
  }
);

it('inspects native and actual file definitions without instance admission, navigation or file writes', async () => {
  const createDefinition = vi.spyOn(modelReferences, 'createCanvasDbtModelDefinition');
  await render();
  await waitForReactQuery(
    () => screen.queryByRole('button', { name: /^ventas_por_cliente(?:\s|$)/ }) != null
  );
  for (const name of ['clientes', 'pedidos', 'ventas_por_cliente'])
    expect(screen.getByRole('button', { name: new RegExp(`^${name}(?:\\s|$)`) })).toBeTruthy();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Model 1' }));
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({ kind: 'canonical-node', nodeId: 'native' });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^pedidos(?:\s|$)/ }));
  });
  expect(screen.getByRole<HTMLButtonElement>('button', { name: /^pedidos(?:\s|$)/ }).disabled).toBe(
    false
  );
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelect.mock.calls[1]).toEqual([
    {
      kind: 'dbt-file-model',
      binding,
      uniqueId: 'model.demo.pedidos',
    },
  ]);
  expect(screen.getByLabelText('Location').textContent).toBe('/canvas');
  expect(getProjectGraph).toHaveBeenCalledExactlyOnceWith(binding);
  expect(saveFileContent).not.toHaveBeenCalled();
  expect(createDefinition).not.toHaveBeenCalled();
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
  await waitForReactQuery(
    () => screen.queryByRole('button', { name: /^clientes(?:\s|$)/ }) != null
  );
  expect(screen.getByRole('button', { name: /^clientes(?:\s|$)/ }).title).toBe(
    'clientes · models/models/clientes.sql'
  );
});

it('uses the authoritative model identity rather than inferring existence from file-tree entries', async () => {
  listFiles.mockResolvedValue([{ name: 'dbt_project.yml', path: 'dbt_project.yml', kind: 'file' }]);
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  const row = screen.getByRole<HTMLButtonElement>('button', { name: /^pedidos(?:\s|$)/ });
  expect(row.disabled).toBe(false);
  act(() => {
    fireEvent.click(row);
  });
  expect(onSelect).toHaveBeenCalledOnce();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('keeps readonly file Models inspectable while instance admission stays unavailable', async () => {
  await render(true, [], false);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  const model = screen.getByRole<HTMLButtonElement>('button', { name: /^pedidos(?:\s|$)/ });
  expect(model.disabled).toBe(false);
  expect(model.draggable).toBe(false);
  act(() => {
    fireEvent.click(model);
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({
    kind: 'dbt-file-model',
    binding,
    uniqueId: 'model.demo.pedidos',
  });
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('lists an unbound logical file Model without offering unsafe placement', async () => {
  // A connection is needed for this instance adapter, not for the Model to exist in the catalogue.
  getProjectGraph.mockResolvedValue({ ...project, executionTarget: undefined });
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  const model = screen.getByRole<HTMLButtonElement>('button', { name: /^pedidos(?:\s|$)/ });
  expect(model.disabled).toBe(false);
  expect(model.draggable).toBe(false);
  expect(screen.queryByRole('alert')).toBeNull();
  act(() => {
    fireEvent.click(model);
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({
    kind: 'dbt-file-model',
    binding,
    uniqueId: 'model.demo.pedidos',
  });
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('inspects a Model without published outputs but rejects its drag before creating a partial instance', async () => {
  getProjectGraph.mockResolvedValue({
    ...project,
    nodes: project.nodes.map((node) => ({ ...node, columns: [] })),
  });
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^pedidos(?:\s|$)/ }));
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({
    kind: 'dbt-file-model',
    binding,
    uniqueId: 'model.demo.pedidos',
  });
  expect(screen.queryByRole('alert')).toBeNull();
  const setData = vi.fn();
  act(() => {
    fireEvent.dragStart(screen.getByRole('button', { name: /^pedidos(?:\s|$)/ }), {
      dataTransfer: { setData },
    });
  });
  expect(screen.getByRole('alert').textContent).toMatch(/output|schema/i);
  expect(setData).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('retains native drag and transfers a typed external model definition through the same admission adapter', async () => {
  await render(true, [{ id: 'source', label: 'Orders', isSource: true, draggable: true }]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  const source = screen.getByRole<HTMLButtonElement>('button', { name: 'Orders' });
  expect(source.draggable).toBe(true);
  act(() => {
    fireEvent.dragStart(source, { dataTransfer: {} });
  });
  expect(onDragStart.mock.calls[0]?.[0]).toBe('source');
  const model = screen.getByRole<HTMLButtonElement>('button', { name: /^pedidos(?:\s|$)/ });
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
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
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
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({
    kind: 'canonical-node',
    nodeId: canvasDbtModelDefinitionId(binding.canvasId, 'model.demo.clientes'),
  });
});

it('deduplicates an explicit direct file identity without changing its registered drag payload', async () => {
  // A discovered publication must not allocate new relation/field IDs for an existing definition.
  const id = canvasDbtModelDefinitionId(binding.canvasId, 'model.demo.clientes');
  onDragStart.mockImplementation((_id: string, event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE, 'registered-definition');
  });
  await render(true, [
    {
      id,
      label: 'clientes',
      draggable: true,
      definitionIdentity: { canvasId: binding.canvasId, uniqueId: 'model.demo.clientes' },
    },
  ]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  expect(mounted!.container.querySelectorAll(`[data-element-id="${id}"]`)).toHaveLength(1);
  const setData = vi.fn();
  act(() => {
    fireEvent.dragStart(screen.getByRole('button', { name: /^clientes(?:\s|$)/ }), {
      dataTransfer: { setData },
    });
  });
  expect(onDragStart).toHaveBeenCalledOnce();
  expect(onDragStart.mock.calls[0]?.[0]).toBe(id);
  expect(setData).toHaveBeenCalledExactlyOnceWith(
    CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
    'registered-definition'
  );
  expect(onSelect).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('merges raw file definitions using the Canvas identity rather than a display name or ID prefix', async () => {
  // Direct file projections use raw uniqueIds while native file references use a different UI id.
  await render(true, [
    {
      id: 'model.demo.clientes',
      label: 'Registered clients',
      definitionIdentity: { canvasId: binding.canvasId, uniqueId: 'model.demo.clientes' },
    },
    {
      id: 'other-canvas-client',
      label: 'Other clients',
      definitionIdentity: { canvasId: 'other-canvas', uniqueId: 'model.demo.clientes' },
    },
  ]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
  expect(screen.getByRole('button', { name: 'Registered clients' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Other clients' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^clientes(?:\s|$)/ })).toBeNull();
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
  await waitForReactQuery(() => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null);
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
    expect(screen.getByRole('button', { name: /^pedidos(?:\s|$)/ })).toBeTruthy();
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
    expect(screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ })).toBeNull();
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
    await waitForReactQuery(
      () => screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ }) != null
    );
    listFiles.mockResolvedValue([]);
    act(() => {
      scope = { ...scope, [field]: 'other' };
      for (const listener of listeners) listener();
    });
    expect(screen.queryByRole('button', { name: /^pedidos(?:\s|$)/ })).toBeNull();
    await waitForReactQuery(() => listFiles.mock.calls.length === 2);
    expect(getProjectGraph).toHaveBeenCalledTimes(1);
  }
);
