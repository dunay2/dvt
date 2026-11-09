// @vitest-environment jsdom
/** Owned concern: inspect a real file Model through current scoped queries without creating a graph object. */
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { createMockSessionContextPort } from '../../../testing/runsPortDoubles';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { CanvasInspectorTarget } from '../../stores/canvasInspectorTarget';
import type { IWorkspaceFilesQueryPort } from '../../ports/workspace';
import type { IDbtProjectGraphQueryPort } from '../../ports/dbtProjectGraph';
import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';
import { CanvasNodeWorkbenchOverlay } from './CanvasNodeWorkbenchOverlay';
import type { CanvasNodeWorkbenchPanelProps } from './CanvasNodeWorkbenchPanel';

const state = vi.hoisted(() => ({ props: null as CanvasNodeWorkbenchPanelProps | null }));
vi.mock('./CanvasNodeWorkbenchPanel', () => ({
  CanvasNodeWorkbenchPanel: (props: CanvasNodeWorkbenchPanelProps) => {
    state.props = props;
    return <div data-testid="actual-file-properties">{props.node.name}</div>;
  },
}));
const scope = createMockSessionContextPort().getWorkspaceScopeSnapshot();
const binding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'files',
  authority: { kind: 'dbt-project-files', projectRoot: 'project' },
} as const;
const target: CanvasInspectorTarget = {
  kind: 'dbt-file-model',
  binding,
  uniqueId: 'model.demo.orders',
  workspaceScope: scope,
};
const projection = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  authorityBinding: binding,
  freshness: 'fresh',
  analysisSha256: '1'.repeat(64),
  adapterType: 'postgres',
  projectRevision: {
    projectRoot: 'project',
    projectName: 'demo',
    contentSetSha256: '2'.repeat(64),
    analyzedAt: '2026-11-09T00:00:00.000Z',
    analyzerVersion: 'dbt-cli-v1',
    dbtVersion: '1.10.0',
  },
  nodes: [
    {
      uniqueId: target.uniqueId,
      resourceType: 'model',
      name: 'Orders',
      packageName: 'demo',
      originalFilePath: 'models/orders.sql',
      columns: [{ name: 'id', dataType: 'text' }],
      tags: [],
      visualEditability: { status: 'code_only', reasons: ['File authority'] },
    },
  ],
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 1 },
});
const listFiles = vi.fn<IWorkspaceFilesQueryPort['listFiles']>();
const getFileContent = vi.fn<IWorkspaceFilesQueryPort['getFileContent']>();
const getProjectGraph = vi.fn<IDbtProjectGraphQueryPort['getProjectGraph']>();
const save = vi.fn();
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
async function render(
  inspectorTarget: CanvasInspectorTarget = target,
  currentProjectRoot = 'project',
  currentScope = scope
): Promise<void> {
  const view = (
    <AppServicesProvider
      overrides={{
        ...createAppServicesTestOverrides(),
        workspaceFilesQuery: { listFiles, getFileContent },
        dbtProjectGraphQueryPort: { getProjectGraph },
        workspaceFileContentCommand: { saveFileContent: save },
      }}
    >
      <CanvasNodeWorkbenchOverlay
        currentProjectRoot={currentProjectRoot}
        layout={{
          focusMode: false,
          inspectorPanelVisible: true,
          surfaceStrategy: dvtCanvasSurfaceStrategy,
        }}
        panels={{
          activeRunId: null,
          activeCanvasId: 'native',
          inspectorTarget,
          inspectorNode: null,
          inspectorAuthoring: {
            canEditNode: true,
            workspaceScope: currentScope,
            onApplyNodeDraft: vi.fn(),
          },
          inspectorGraphNodes: [],
          inspectorGraphEdges: [],
          inspectorPreferredTabId: 'general',
          inspectorPreferredTabRequestId: 1,
          inspectorWorkbenchContributions: [],
          registeredPlugins: new Set(['dvt']),
        }}
        onHide={vi.fn()}
        onOpenModelEditor={vi.fn()}
      />
    </AppServicesProvider>
  );
  if (mounted) await mounted.render(view);
  else mounted = await withTestQueryClient(view);
}
beforeEach(() => {
  vi.resetAllMocks();
  state.props = null;
  listFiles.mockResolvedValue([
    { kind: 'file', name: 'dbt_project.yml', path: 'project/dbt_project.yml' },
  ]);
  getFileContent.mockResolvedValue({
    name: 'dbt_project.yml',
    path: 'project/dbt_project.yml',
    language: 'yaml',
    content: 'name: demo',
    contentSha256: '3'.repeat(64),
    lastModified: '2026-11-09T00:00:00.000Z',
    authoringAuthority: { kind: 'resolved', binding },
  });
  getProjectGraph.mockResolvedValue(projection);
});
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

it('opens the existing Properties panel for an unbound actual file Model with file Code authority', async () => {
  // Inspectability does not require a provider connection or executable definition.
  await render();
  await waitForReactQuery(() => state.props?.node.id === target.uniqueId);
  expect(state.props?.node).toMatchObject({
    id: target.uniqueId,
    path: 'models/orders.sql',
    metadata: { authority: 'dbt-project-files' },
  });
  expect(state.props?.authoring?.canEditNode).toBe(false);
  expect(state.props?.codeProjection).toBeUndefined();
  expect(state.props?.onOpenSemanticEditor).toBeUndefined();
  expect(state.props?.contributions).toHaveLength(1);
  const content = state.props?.contributions?.[0]?.content as { props: Record<string, unknown> };
  expect(content.props).toMatchObject({
    path: 'project/models/orders.sql',
    authority: 'dbt-project-files',
    access: 'read-only',
  });
  expect(getProjectGraph).toHaveBeenCalledExactlyOnceWith(binding);
  expect(save).not.toHaveBeenCalled();
});

it.each(['canvas', 'root', 'scope', 'missing'] as const)(
  'rejects a %s target against independent current authority',
  async (mismatch) => {
    const request =
      mismatch === 'canvas'
        ? { ...target, binding: { ...binding, canvasId: 'foreign' } }
        : mismatch === 'root'
          ? {
              ...target,
              binding: { ...binding, authority: { ...binding.authority, projectRoot: 'foreign' } },
            }
          : mismatch === 'scope'
            ? { ...target, workspaceScope: { ...scope, projectId: 'foreign' } }
            : { ...target, uniqueId: 'model.demo.deleted' };
    await render(request);
    await waitForReactQuery(() => mismatch === 'scope' || getProjectGraph.mock.calls.length === 1);
    await act(async () => {});
    expect(state.props).toBeNull();
    expect(
      getProjectGraph.mock.calls.every(([actual]) => actual.authority.projectRoot === 'project')
    ).toBe(true);
    expect(save).not.toHaveBeenCalled();
  }
);

it('cannot query the captured root when the independently current project root changes', async () => {
  await render(target, 'other-project');
  await waitForReactQuery(() => listFiles.mock.calls.length === 1);
  expect(getFileContent).not.toHaveBeenCalled();
  expect(getProjectGraph).not.toHaveBeenCalled();
  expect(state.props).toBeNull();
});

it.each(['configuration', 'graph'] as const)(
  'keeps denied %s authority closed without fallback or writes',
  async (denied) => {
    if (denied === 'configuration') getFileContent.mockRejectedValue(new Error('Forbidden'));
    else getProjectGraph.mockRejectedValue(new Error('Forbidden'));
    await render();
    await waitForReactQuery(() => mounted?.container.querySelector('[role="alert"]') != null);
    expect(state.props).toBeNull();
    if (denied === 'configuration') expect(getProjectGraph).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  }
);

it('does not publish a late file projection after the selected workspace changes', async () => {
  let resolve!: (value: typeof projection) => void;
  getProjectGraph.mockImplementation(
    () =>
      new Promise((accept) => {
        resolve = accept;
      })
  );
  await render();
  await waitForReactQuery(() => getProjectGraph.mock.calls.length === 1);
  await render(target, 'project', { ...scope, projectId: 'next-project' });
  await act(async () => {
    resolve(projection);
  });
  expect(state.props).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
