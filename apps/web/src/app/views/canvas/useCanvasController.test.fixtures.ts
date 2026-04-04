import { vi } from 'vitest';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';

type OverlayDecoration = { borderColor?: string; dimmed?: boolean } | null;

type MockFn = ReturnType<typeof vi.fn>;

export type CanvasHarnessState = {
  graphData: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  overlayDecorations: Map<string, OverlayDecoration>;
  currentPlan: ExecutionPlan | null;
  store: {
    setCanvasViewport: MockFn;
    setCanvasNodePositions: MockFn;
  } & Record<string, unknown>;
  graphHandlersResult: {
    handleDrop: MockFn;
    confirmEdgeCreation: MockFn;
  } & Record<string, unknown>;
  executionActionsResult: {
    handlePlan: MockFn;
    handleStartRun: MockFn;
  } & Record<string, unknown>;
};

export type CanvasHarnessMocks = {
  useQuery: MockFn;
  resolveCanvasGraphStrategy: MockFn;
  useWorkspaceService: MockFn;
  usePlansService: MockFn;
  useRunsService: MockFn;
  useCanvasInteractionStore: MockFn;
  useExecutionStore: MockFn;
  useSessionStore: MockFn;
  useUiLayoutStore: MockFn;
  useCapabilitiesQuery: MockFn;
  buildOverlayContext: MockFn;
  buildNodeDecorations: MockFn;
  mapCanonicalNodeToCanvasNode: MockFn;
  mapCanonicalEdgeToCanvasEdge: MockFn;
  getAllOverlays: MockFn;
  getRegisteredPluginIds: MockFn;
  buildNodesWithImpact: MockFn;
  useCanvasExecutionActions: MockFn;
  useCanvasGraphHandlers: MockFn;
};

export function createDefaultCanvasHarnessState(): CanvasHarnessState {
  const currentPlan: ExecutionPlan = {
    planId: 'plan_1',
    planVersion: '1',
    generatedAt: '2026-03-28T00:00:00Z',
    adapter: 'dbt',
    target: 'dev',
    steps: [],
    capabilities: [],
  };
  const canonicalNodes: CanonicalNode[] = [
    {
      id: 'node_1',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      lastCost: 10,
      lastDuration: 120,
    },
    {
      id: 'node_2',
      name: 'customers',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      lastCost: 15,
      lastDuration: 180,
    },
  ];
  const canonicalEdges: CanonicalEdge[] = [
    { id: 'edge_1', sourceId: 'node_1', targetId: 'node_2', relation: 'lineage' },
  ];

  return {
    currentPlan,
    graphData: { nodes: [{ id: 'node_1' }, { id: 'node_2' }], edges: [{ id: 'edge_1' }] },
    canonicalNodes,
    canonicalEdges,
    overlayDecorations: new Map([
      ['node_1', { borderColor: '#ef4444' }],
      ['node_2', null],
    ]),
    store: {
      _hasHydrated: true,
      focusMode: false,
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      selectedTenant: 'tenant-a',
      selectedProject: 'project-a',
      selectedEnvironment: 'dev',
      selectedNodes: ['node_1'],
      setSelectedNodes: vi.fn(),
      inspectorNodeId: 'node_1',
      setInspectorNode: vi.fn(),
      impactOverlayEnabled: true,
      toggleImpactOverlay: vi.fn(),
      columnLevelLineageEnabled: false,
      toggleColumnLevelLineage: vi.fn(),
      setCurrentPlan: vi.fn(),
      currentPlan,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
      setConsolePanelHeight: vi.fn(),
      consolePanelVisible: false,
      showExplorerPanel: vi.fn(),
      hideExplorerPanel: vi.fn(),
      toggleExplorerPanel: vi.fn(),
      showInspectorPanel: vi.fn(),
      hideInspectorPanel: vi.fn(),
      toggleInspectorPanel: vi.fn(),
      toggleConsolePanel: vi.fn(),
      explorerPanelVisible: true,
      inspectorPanelVisible: true,
      gridSize: 24,
      canvasLayouts: {},
      setCanvasViewport: vi.fn(),
      setCanvasNodePositions: vi.fn(),
      currentRun: null,
    },
    graphHandlersResult: {
      confirmEdgeModal: { open: false, edge: null },
      setConfirmEdgeModal: vi.fn(),
      onConnect: vi.fn(),
      confirmEdgeCreation: vi.fn(),
      handleInspectNode: vi.fn(),
      handleNodeClick: vi.fn(),
      onSelectionChange: vi.fn(),
      handleAutoLayout: vi.fn(),
      handleDrop: vi.fn(),
      handleDragOver: vi.fn(),
      handleToggleNodeSelection: vi.fn(),
      handleRemoveNode: vi.fn(),
    },
    executionActionsResult: {
      planModalOpen: false,
      setPlanModalOpen: vi.fn(),
      handlePlan: vi.fn(),
      handleStartRun: vi.fn(),
    },
  };
}

export function configureDefaultCanvasHarnessMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  mocks.useQuery.mockReturnValue({ data: state.graphData, isPending: false, isError: false });
  mocks.useWorkspaceService.mockReturnValue({ getGraphSnapshot: vi.fn() });
  mocks.usePlansService.mockReturnValue({ previewPlan: vi.fn() });
  mocks.useRunsService.mockReturnValue({ listRuns: vi.fn() });
  const selectFromStore = (selector?: (value: typeof state.store) => unknown) =>
    typeof selector === 'function' ? selector(state.store) : state.store;
  mocks.useCanvasInteractionStore.mockImplementation(selectFromStore);
  mocks.useExecutionStore.mockImplementation(selectFromStore);
  mocks.useSessionStore.mockImplementation(selectFromStore);
  mocks.useUiLayoutStore.mockImplementation(selectFromStore);
  mocks.useCapabilitiesQuery.mockReturnValue({ data: undefined });
  mocks.resolveCanvasGraphStrategy.mockReturnValue({
    mapNodeToCanonical: vi.fn(
      (node: { id: string }) => state.canonicalNodes.find((n) => n.id === node.id) ?? null
    ),
    mapEdgeToCanonical: vi.fn(
      (edge: { id: string }) => state.canonicalEdges.find((e) => e.id === edge.id) ?? null
    ),
    parseDropPayload: vi.fn(() => null),
  });
  mocks.buildOverlayContext.mockReturnValue({ overlay: 'ctx' });
  mocks.buildNodeDecorations.mockImplementation(() => state.overlayDecorations);
  mocks.mapCanonicalNodeToCanvasNode.mockImplementation(
    (node: CanonicalNode, index: number, showColumns: boolean) => ({
      id: node.id,
      type: 'dbtNode',
      position: { x: index * 100, y: 0 },
      data: { name: node.name, pluginKind: node.kind, showColumns, overlayDecoration: null },
    })
  );
  mocks.mapCanonicalEdgeToCanvasEdge.mockImplementation((edge: CanonicalEdge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
  }));
  mocks.getAllOverlays.mockReturnValue([{ id: 'impact' }]);
  mocks.getRegisteredPluginIds.mockReturnValue(new Set(['dbt', 'monitoring', 'cost']));
  mocks.buildNodesWithImpact.mockImplementation(({ nodes }: { nodes: unknown[] }) => nodes);
  mocks.useCanvasGraphHandlers.mockImplementation(() => state.graphHandlersResult);
  mocks.useCanvasExecutionActions.mockImplementation(() => state.executionActionsResult);
}
