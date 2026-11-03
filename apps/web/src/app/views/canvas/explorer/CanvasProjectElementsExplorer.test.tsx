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
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasProjectElementsExplorer } from './CanvasProjectElementsExplorer';
import type { CanvasExplorerItem } from './canvasExplorerItems';

const binding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'file-owner',
  authority: { kind: 'dbt-project-files', projectRoot: '.' },
} as const;
const project = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  authorityBinding: binding,
  freshness: 'fresh',
  analysisSha256: '1'.repeat(64),
  projectRevision: {
    projectRoot: '.',
    projectName: 'demo',
    contentSetSha256: '2'.repeat(64),
    analyzedAt: '2026-11-02T00:00:00.000Z',
    analyzerVersion: 'dbt-cli-v1',
  },
  nodes: ['clientes', 'pedidos', 'ventas_por_cliente'].map((name) => ({
    uniqueId: `model.demo.${name}`,
    resourceType: 'model',
    name,
    packageName: 'demo',
    originalFilePath: `models/${name}.sql`,
    columns: [],
    tags: [],
    visualEditability: { status: 'code_only', reasons: ['File authority'] },
  })),
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 3 },
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
  items: readonly CanvasExplorerItem[] = [{ id: 'native', label: 'Model 1' }]
): Promise<void> {
  const view = (
    <AppServicesProvider overrides={services}>
      <MemoryRouter initialEntries={['/canvas']}>
        <CanvasProjectElementsExplorer
          enabled={enabled}
          items={items}
          onSelect={onSelect}
          onDragStart={onDragStart}
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

it('keeps native creation active and external models explicitly unavailable without navigation or writes', async () => {
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
  expect(screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ }).disabled).toBe(true);
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('native');
  expect(screen.getAllByText(/instance creation is not available/)).toHaveLength(3);
  expect(screen.getByLabelText('Location').textContent).toBe('/canvas');
  expect(getProjectGraph).toHaveBeenCalledExactlyOnceWith(binding);
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('does not open a model whose declared file is unavailable', async () => {
  listFiles.mockResolvedValue([{ name: 'dbt_project.yml', path: 'dbt_project.yml', kind: 'file' }]);
  await render();
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  const row = screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ });
  expect(row.disabled).toBe(true);
  act(() => {
    fireEvent.click(row);
  });
  expect(onSelect).not.toHaveBeenCalled();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('retains native catalogue drag without advertising external model instance admission', async () => {
  await render(true, [{ id: 'source', label: 'Orders', category: 'Sources', draggable: true }]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  const source = screen.getByRole<HTMLButtonElement>('button', { name: 'Orders' });
  expect(source.draggable).toBe(true);
  act(() => {
    fireEvent.dragStart(source, { dataTransfer: {} });
  });
  expect(onDragStart.mock.calls[0]?.[0]).toBe('source');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: /pedidos/ }).draggable).toBe(false);
  expect(screen.getByRole('heading', { name: 'Models' })).toBeTruthy();
  expect(saveFileContent).not.toHaveBeenCalled();
});

it('deduplicates by identity while preserving a distinct native element with the same name', async () => {
  await render(true, [
    { id: 'native', label: 'clientes' },
    { id: 'model.demo.clientes', label: 'clientes', selected: true },
  ]);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  expect(
    mounted!.container.querySelectorAll('[data-element-id="model.demo.clientes"]')
  ).toHaveLength(1);
  expect(mounted!.container.querySelectorAll('[data-element-id="native"]')).toHaveLength(1);
  act(() => {
    fireEvent.click(
      mounted!.container.querySelector<HTMLButtonElement>(
        '[data-element-id="model.demo.clientes"]'
      )!
    );
  });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('model.demo.clientes');
});

it('does no discovery while closed and reuses graph analysis across close and reopen', async () => {
  await render(false);
  expect(listFiles).not.toHaveBeenCalled();
  expect(getFileContent).not.toHaveBeenCalled();
  expect(getProjectGraph).not.toHaveBeenCalled();
  await render(true);
  await waitForReactQuery(() => screen.queryByRole('button', { name: /pedidos/ }) != null);
  await render(false);
  await render(true);
  expect(getProjectGraph).toHaveBeenCalledTimes(1);
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
