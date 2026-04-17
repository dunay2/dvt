import { vi } from 'vitest';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { makeMockRunRef, makeRunContext } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';

type OverlayDecoration = { borderColor?: string; dimmed?: boolean } | null;

type MockFn = ReturnType<typeof vi.fn>;

export type CanvasHarnessState = {
  graphData: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
  graphDraftRecord: WorkspaceGraphDraftRecord | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  overlayDecorations: Map<string, OverlayDecoration>;
  currentPlan: PlanViewModel | null;
  services: {
    workspaceService: IWorkspacePort;
    plansService: IPlansPort;
    runsService: IRunsPort;
    sessionContext: SessionContextPort;
    shellFeedback: ShellFeedbackPort;
  };
  store: {
    setCanvasViewport: MockFn;
    setCanvasNodePositions: MockFn;
  } & Record<string, unknown>;
  queryClient: {
    cancelQueries: MockFn;
    fetchQuery: MockFn;
    invalidateQueries: MockFn;
    setQueryData: MockFn;
  };
  graphHandlersResult: {
    handleDrop: MockFn;
    confirmEdgeCreation: MockFn;
  } & Record<string, unknown>;
  executionActionsResult: {
    canStartRun: boolean;
    planStatusSummary: string;
    handlePlan: MockFn;
    handleStartRun: MockFn;
  } & Record<string, unknown>;
  navigationActionsResult: {
    handleRunStarted: MockFn;
  } & Record<string, unknown>;
};

export type CanvasHarnessMocks = {
  useQuery: MockFn;
  useQueryClient: MockFn;
  resolveCanvasGraphStrategy: MockFn;
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
  useCanvasNavigationActions: MockFn;
};

export function createDefaultCanvasHarnessState(): CanvasHarnessState {
  const currentPlan: PlanViewModel = {
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
  const workspaceService: IWorkspacePort = {
    getGraphSnapshot: vi.fn(async () => ({ nodes: [], edges: [] })),
    getGraphDraft: vi.fn(async () => null),
    saveGraphDraft: vi.fn(async () => ({
      outcome: 'saved' as const,
      record: {
        revision: 'rev-1',
        savedAt: '2026-04-08T00:00:00Z',
        draft: {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 100, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
      },
    })),
    getDiffChanges: vi.fn(async () => []),
    getPlugins: vi.fn(async () => []),
    getRoles: vi.fn(async () => []),
    getAuditLog: vi.fn(async () => []),
    listWarehouseConnections: vi.fn(async () => []),
    listWarehouseTables: vi.fn(async () => []),
    importSources: vi.fn(async () => ({
      success: true as const,
      sourcesCreated: 0,
      tablesImported: 0,
      yamlFiles: [],
      grouping: 'schema' as const,
      options: {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    })),
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (path: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: '',
      lastModified: '2026-04-08T00:00:00Z',
    })),
    saveFileContent: vi.fn(async (path: string, content: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content,
      lastModified: '2026-04-08T00:00:00Z',
    })),
  };
  const sessionContext: SessionContextPort = {
    getWorkspaceScope: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'mock',
    }),
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'mock',
    }),
    subscribeWorkspaceScope: () => () => undefined,
    buildRunContext: (runId: string) =>
      makeRunContext(runId, {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'mock',
      }),
  };
  const shellFeedback: ShellFeedbackPort = {
    success: vi.fn(),
    error: vi.fn(),
  };
  const plansService: IPlansPort = {
    previewPlan: vi.fn(async () => currentPlan),
    importPlan: vi.fn(async () => currentPlan),
  };
  const runsService: IRunsPort = {
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () =>
      makeMockRunRef({
        tenantId: 'tenant-a',
        workflowId: 'workflow_ui_1',
        runId: 'run_ui_1',
      })
    ),
    listRunEvents: vi.fn(async () => ({ events: [] })),
  };

  return {
    currentPlan,
    graphData: { nodes: [{ id: 'node_1' }, { id: 'node_2' }], edges: [{ id: 'edge_1' }] },
    graphDraftRecord: null,
    canonicalNodes,
    canonicalEdges,
    overlayDecorations: new Map([
      ['node_1', { borderColor: '#ef4444' }],
      ['node_2', null],
    ]),
    services: {
      workspaceService,
      plansService,
      runsService,
      sessionContext,
      shellFeedback,
    },
    queryClient: {
      cancelQueries: vi.fn(async () => undefined),
      fetchQuery: vi.fn(),
      invalidateQueries: vi.fn(async () => undefined),
      setQueryData: vi.fn(),
    },
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
      canStartRun: false,
      planStatusSummary: 'Preview required before running.',
      handlePlan: vi.fn(),
      handleStartRun: vi.fn(),
    },
    navigationActionsResult: {
      handleRunStarted: vi.fn(),
    },
  };
}

export function configureDefaultCanvasHarnessMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  const storeState = state.store as typeof state.store & {
    selectedNodes: string[];
    setSelectedNodes: MockFn;
    inspectorNodeId: string | null;
    setInspectorNode: MockFn;
    currentPlan: PlanViewModel | null;
    setCurrentPlan: MockFn;
  };

  storeState.setSelectedNodes.mockImplementation((nodeIds: string[]) => {
    storeState.selectedNodes = nodeIds;
  });
  storeState.setInspectorNode.mockImplementation((nodeId: string | null) => {
    storeState.inspectorNodeId = nodeId;
  });
  storeState.setCurrentPlan.mockImplementation((plan: PlanViewModel | null) => {
    storeState.currentPlan = plan;
    state.currentPlan = plan;
  });
  (
    state.services.workspaceService.getGraphSnapshot as MockFn
  ).mockImplementation(async () => ({
    nodes: [...state.graphData.nodes],
    edges: [...state.graphData.edges],
  }));
  (state.services.workspaceService.getGraphDraft as MockFn).mockImplementation(
    async () => state.graphDraftRecord
  );
  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
    const queryKey = queryConfig?.queryKey ?? [];
    if (queryKey[1] === 'graph-draft') {
      return { data: state.graphDraftRecord, isPending: false, isError: false };
    }

    return { data: state.graphData, isPending: false, isError: false };
  });
  mocks.useQueryClient.mockReturnValue(state.queryClient);
  state.queryClient.setQueryData.mockImplementation(
    (
      queryKey: readonly unknown[],
      value:
        | WorkspaceGraphDraftRecord
        | null
        | { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }
    ) => {
      if (queryKey[1] === 'graph-draft') {
        state.graphDraftRecord = value as WorkspaceGraphDraftRecord | null;
      }

      if (queryKey[1] === 'graph') {
        state.graphData = value as { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
      }
    }
  );
  state.queryClient.fetchQuery.mockImplementation(
    async ({
      queryKey,
      queryFn,
    }: {
      queryKey?: readonly unknown[];
      queryFn?: () => Promise<unknown>;
    }) => {
      const resolvedValue = queryFn ? await queryFn() : undefined;

      if (queryKey?.[1] === 'graph-draft') {
        state.graphDraftRecord = resolvedValue as WorkspaceGraphDraftRecord | null;
      }

      if (queryKey?.[1] === 'graph') {
        state.graphData = resolvedValue as {
          nodes: Array<{ id: string }>;
          edges: Array<{ id: string }>;
        };
      }

      return resolvedValue;
    }
  );
  state.store.setCanvasNodePositions.mockImplementation(
    (workspaceLayoutKey: string, positions: Record<string, { x: number; y: number }>) => {
      const canvasLayouts = state.store.canvasLayouts as Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
      state.store.canvasLayouts = {
        ...canvasLayouts,
        [workspaceLayoutKey]: {
          ...canvasLayouts[workspaceLayoutKey],
          nodePositions: positions,
        },
      };
    }
  );
  state.store.setCanvasViewport.mockImplementation(
    (workspaceLayoutKey: string, viewport: { x: number; y: number; zoom: number }) => {
      const canvasLayouts = state.store.canvasLayouts as Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
      state.store.canvasLayouts = {
        ...canvasLayouts,
        [workspaceLayoutKey]: {
          ...canvasLayouts[workspaceLayoutKey],
          viewport,
        },
      };
    }
  );
  const selectFromStore = (selector?: (value: typeof state.store) => unknown) =>
    typeof selector === 'function' ? selector(state.store) : state.store;
  mocks.useCanvasInteractionStore.mockImplementation(selectFromStore);
  mocks.useExecutionStore.mockImplementation(selectFromStore);
  mocks.useSessionStore.mockImplementation(selectFromStore);
  mocks.useUiLayoutStore.mockImplementation(selectFromStore);
  mocks.useCapabilitiesQuery.mockReturnValue({ data: undefined });
  mocks.resolveCanvasGraphStrategy.mockReturnValue({
    id: 'transformation',
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
    (
      node: CanonicalNode,
      index: number,
      showColumns: boolean,
      _status: unknown,
      persistedPosition?: { x: number; y: number }
    ) => ({
      id: node.id,
      type: 'dbtNode',
      position: persistedPosition ?? { x: index * 100, y: 0 },
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
  mocks.useCanvasNavigationActions.mockImplementation(() => state.navigationActionsResult);
}
