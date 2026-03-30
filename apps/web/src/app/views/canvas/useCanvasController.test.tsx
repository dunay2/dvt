// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';
import { useCanvasController } from './useCanvasController';

type OverlayDecoration = { borderColor?: string; dimmed?: boolean } | null;

type MockStore = {
  focusMode: boolean;
  selectedTenant: string;
  selectedProject: string;
  selectedEnvironment: string;
  selectedNodes: string[];
  setSelectedNodes: ReturnType<typeof vi.fn>;
  inspectorNodeId: string | null;
  setInspectorNode: ReturnType<typeof vi.fn>;
  impactOverlayEnabled: boolean;
  toggleImpactOverlay: ReturnType<typeof vi.fn>;
  columnLevelLineageEnabled: boolean;
  toggleColumnLevelLineage: ReturnType<typeof vi.fn>;
  setCurrentPlan: ReturnType<typeof vi.fn>;
  currentPlan: ExecutionPlan | null;
  userPermissions: {
    canPlan: boolean;
    canRun: boolean;
    canEditEdges: boolean;
    canManagePlugins: boolean;
    canManageRBAC: boolean;
  };
  setConsolePanelHeight: ReturnType<typeof vi.fn>;
  consolePanelVisible: boolean;
  toggleExplorerPanel: ReturnType<typeof vi.fn>;
  toggleInspectorPanel: ReturnType<typeof vi.fn>;
  toggleConsolePanel: ReturnType<typeof vi.fn>;
  explorerPanelVisible: boolean;
  inspectorPanelVisible: boolean;
  gridSize: number;
  canvasLayouts: Record<
    string,
    {
      viewport: { x: number; y: number; zoom: number } | null;
      nodePositions: Record<string, { x: number; y: number }>;
    }
  >;
  setCanvasViewport: ReturnType<typeof vi.fn>;
  setCanvasNodePositions: ReturnType<typeof vi.fn>;
};

type MockGraphHandlersResult = {
  confirmEdgeModal: { open: boolean; edge: null };
  setConfirmEdgeModal: ReturnType<typeof vi.fn>;
  onConnect: ReturnType<typeof vi.fn>;
  confirmEdgeCreation: ReturnType<typeof vi.fn>;
  handleInspectNode: ReturnType<typeof vi.fn>;
  handleNodeClick: ReturnType<typeof vi.fn>;
  onSelectionChange: ReturnType<typeof vi.fn>;
  handleAutoLayout: ReturnType<typeof vi.fn>;
  handleDrop: ReturnType<typeof vi.fn>;
  handleDragOver: ReturnType<typeof vi.fn>;
  handleToggleNodeSelection: ReturnType<typeof vi.fn>;
  handleRemoveNode: ReturnType<typeof vi.fn>;
};

type MockExecutionActionsResult = {
  planModalOpen: boolean;
  setPlanModalOpen: ReturnType<typeof vi.fn>;
  handlePlan: ReturnType<typeof vi.fn>;
  handleStartRun: ReturnType<typeof vi.fn>;
};

type HoistedState = {
  graphData: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  overlayDecorations: Map<string, OverlayDecoration>;
  currentPlan: ExecutionPlan | null;
  store: MockStore;
  graphHandlersResult: MockGraphHandlersResult;
  executionActionsResult: MockExecutionActionsResult;
};

const state = vi.hoisted(
  (): HoistedState => ({
    graphData: { nodes: [], edges: [] },
    canonicalNodes: [],
    canonicalEdges: [],
    overlayDecorations: new Map<string, OverlayDecoration>(),
    currentPlan: null,
    store: null as unknown as MockStore,
    graphHandlersResult: null as unknown as MockGraphHandlersResult,
    executionActionsResult: null as unknown as MockExecutionActionsResult,
  })
);

function buildStore(): MockStore {
  return {
    focusMode: false,
    selectedTenant: 'tenant-a',
    selectedProject: 'project-a',
    selectedEnvironment: 'dev',
    selectedNodes: ['node_1'],
    setSelectedNodes: vi.fn(),
    inspectorNodeId: 'node_1' as string | null,
    setInspectorNode: vi.fn(),
    impactOverlayEnabled: true,
    toggleImpactOverlay: vi.fn(),
    columnLevelLineageEnabled: false,
    toggleColumnLevelLineage: vi.fn(),
    setCurrentPlan: vi.fn(),
    currentPlan: state.currentPlan,
    userPermissions: {
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canManagePlugins: false,
      canManageRBAC: false,
    },
    setConsolePanelHeight: vi.fn(),
    consolePanelVisible: false,
    toggleExplorerPanel: vi.fn(),
    toggleInspectorPanel: vi.fn(),
    toggleConsolePanel: vi.fn(),
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
    gridSize: 24,
    canvasLayouts: {},
    setCanvasViewport: vi.fn(),
    setCanvasNodePositions: vi.fn(),
  };
}

function buildGraphHandlersResult(): MockGraphHandlersResult {
  return {
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
  };
}

function buildExecutionActionsResult(): MockExecutionActionsResult {
  return {
    planModalOpen: false,
    setPlanModalOpen: vi.fn(),
    handlePlan: vi.fn(),
    handleStartRun: vi.fn(),
  };
}

const mockUseQuery = vi.hoisted(() => vi.fn());
const mockResolveCanvasGraphStrategy = vi.hoisted(() => vi.fn());
const mockCreateWorkspaceService = vi.hoisted(() => vi.fn());
const mockCreatePlansService = vi.hoisted(() => vi.fn());
const mockUseAppStore = vi.hoisted(() => vi.fn());
const mockUseCapabilitiesQuery = vi.hoisted(() => vi.fn());
const mockBuildOverlayContext = vi.hoisted(() => vi.fn());
const mockBuildNodeDecorations = vi.hoisted(() => vi.fn());
const mockMapCanonicalNodeToCanvasNode = vi.hoisted(() => vi.fn());
const mockMapCanonicalEdgeToCanvasEdge = vi.hoisted(() => vi.fn());
const mockGetAllOverlays = vi.hoisted(() => vi.fn());
const mockGetRegisteredPluginIds = vi.hoisted(() => vi.fn());
const mockBuildNodesWithImpact = vi.hoisted(() => vi.fn());
const mockUseCanvasExecutionActions = vi.hoisted(() => vi.fn());
const mockUseCanvasGraphHandlers = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

vi.mock('@xyflow/react', async () => {
  const ReactModule = await import('react');

  return {
    useNodesState: <T,>(initial: T[]) => {
      const [nodes, setNodes] = ReactModule.useState(initial);
      return [nodes, setNodes, vi.fn()] as const;
    },
    useEdgesState: <T,>(initial: T[]) => {
      const [edges, setEdges] = ReactModule.useState(initial);
      return [edges, setEdges, vi.fn()] as const;
    },
  };
});

vi.mock('../../components/canvas/DbtNodeComponent', () => ({
  default: () => null,
}));

vi.mock('../../plugins/graphStrategyRegistry', () => ({
  resolveCanvasGraphStrategy: mockResolveCanvasGraphStrategy,
}));

vi.mock('../../services/config/dataSource', () => ({
  resolveDataSource: () => 'mock',
}));

vi.mock('../../services/plans/plansService', () => ({
  createPlansService: mockCreatePlansService,
}));

vi.mock('../../services/workspace/workspaceService', () => ({
  createWorkspaceService: mockCreateWorkspaceService,
}));

vi.mock('../../stores/appStore', () => ({
  useAppStore: mockUseAppStore,
}));

vi.mock('../../queries/useCapabilitiesQuery', () => ({
  useCapabilitiesQuery: mockUseCapabilitiesQuery,
}));

vi.mock('./canvasImpactOverlay', () => ({
  buildNodesWithImpact: mockBuildNodesWithImpact,
}));

vi.mock('./canvasOverlayContext', () => ({
  buildOverlayContext: mockBuildOverlayContext,
  buildNodeDecorations: mockBuildNodeDecorations,
}));

vi.mock('./canvasNodeMapper', () => ({
  mapCanonicalEdgeToCanvasEdge: mockMapCanonicalEdgeToCanvasEdge,
  mapCanonicalNodeToCanvasNode: mockMapCanonicalNodeToCanvasNode,
}));

vi.mock('../../plugins/registry', () => ({
  getAllOverlays: mockGetAllOverlays,
  getRegisteredPluginIds: mockGetRegisteredPluginIds,
}));

vi.mock('./useCanvasExecutionActions', () => ({
  useCanvasExecutionActions: mockUseCanvasExecutionActions,
}));

vi.mock('./useCanvasGraphHandlers', () => ({
  useCanvasGraphHandlers: mockUseCanvasGraphHandlers,
}));

function buildCanonicalNode(id: string, name: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

function buildCanonicalEdge(id: string, sourceId: string, targetId: string): CanonicalEdge {
  return {
    id,
    sourceId,
    targetId,
    relation: 'lineage',
  };
}

describe('useCanvasController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: ReturnType<typeof useCanvasController> | null;

  function Probe(): null {
    latestResult = useCanvasController();
    return null;
  }

  async function renderProbe(): Promise<void> {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Probe />
        </MemoryRouter>
      );
    });
  }

  beforeEach(() => {
    latestResult = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    state.currentPlan = {
      planId: 'plan_1',
      planVersion: '1',
      generatedAt: '2026-03-28T00:00:00Z',
      adapter: 'dbt',
      target: 'dev',
      steps: [],
      capabilities: [],
    };

    state.graphData = {
      nodes: [{ id: 'node_1' }, { id: 'node_2' }],
      edges: [{ id: 'edge_1' }],
    };
    state.canonicalNodes = [
      buildCanonicalNode('node_1', 'orders'),
      buildCanonicalNode('node_2', 'customers'),
    ];
    state.canonicalEdges = [buildCanonicalEdge('edge_1', 'node_1', 'node_2')];
    state.overlayDecorations = new Map([
      ['node_1', { borderColor: '#ef4444' }],
      ['node_2', null],
    ]);
    state.store = buildStore();
    state.graphHandlersResult = buildGraphHandlersResult();
    state.executionActionsResult = buildExecutionActionsResult();

    mockUseQuery.mockReturnValue({ data: state.graphData });
    mockCreateWorkspaceService.mockReturnValue({ getGraphSnapshot: vi.fn() });
    mockCreatePlansService.mockReturnValue({ previewPlan: vi.fn() });
    mockUseAppStore.mockImplementation(() => state.store);
    mockUseCapabilitiesQuery.mockReturnValue({ data: undefined });
    mockResolveCanvasGraphStrategy.mockReturnValue({
      mapNodeToCanonical: vi.fn(
        (node: { id: string }) =>
          state.canonicalNodes.find((candidate: CanonicalNode) => candidate.id === node.id) ?? null
      ),
      mapEdgeToCanonical: vi.fn(
        (edge: { id: string }) =>
          state.canonicalEdges.find((candidate: CanonicalEdge) => candidate.id === edge.id) ?? null
      ),
      parseDropPayload: vi.fn(() => null),
    });
    mockBuildOverlayContext.mockReturnValue({ overlay: 'ctx' });
    mockBuildNodeDecorations.mockImplementation(() => state.overlayDecorations);
    mockMapCanonicalNodeToCanvasNode.mockImplementation(
      (node: CanonicalNode, index: number, showColumns: boolean) => ({
        id: node.id,
        type: 'dbtNode',
        position: { x: index * 100, y: 0 },
        data: {
          name: node.name,
          pluginKind: node.kind,
          showColumns,
          overlayDecoration: null,
        },
      })
    );
    mockMapCanonicalEdgeToCanvasEdge.mockImplementation((edge: CanonicalEdge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
    }));
    mockGetAllOverlays.mockReturnValue([{ id: 'impact' }]);
    mockGetRegisteredPluginIds.mockReturnValue(new Set(['dbt', 'monitoring', 'cost']));
    mockBuildNodesWithImpact.mockImplementation(({ nodes }: { nodes: unknown[] }) => nodes);
    mockUseCanvasGraphHandlers.mockImplementation(() => state.graphHandlersResult);
    mockUseCanvasExecutionActions.mockImplementation(() => state.executionActionsResult);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('maps workspace graph into canonical explorer state and injects overlay decorations', async () => {
    await renderProbe();

    expect(latestResult?.explorerNodes).toEqual(state.canonicalNodes);
    expect(latestResult?.edges).toEqual([
      {
        id: 'edge_1',
        source: 'node_1',
        target: 'node_2',
      },
    ]);
    expect(latestResult?.nodesWithImpact).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'node_1',
          data: expect.objectContaining({
            overlayDecoration: { borderColor: '#ef4444' },
          }),
        }),
      ])
    );
    expect(latestResult?.impactOverlayEnabled).toBe(true);
    expect(mockBuildNodeDecorations).toHaveBeenCalledWith(
      state.canonicalNodes,
      [{ id: 'impact' }],
      null,
      { overlay: 'ctx' }
    );
  });

  it('derives inspector node and forwards graph and execution hook results', async () => {
    await renderProbe();

    expect(latestResult?.inspectorNode).toEqual(state.canonicalNodes[0]);
    expect(latestResult?.currentPlan).toEqual(state.currentPlan);
    expect(latestResult?.registeredPlugins).toEqual(new Set(['dbt', 'monitoring', 'cost']));
    expect(latestResult?.handlePlan).toBe(state.executionActionsResult.handlePlan);
    expect(latestResult?.handleStartRun).toBe(state.executionActionsResult.handleStartRun);
    expect(latestResult?.handleDrop).toBe(state.graphHandlersResult.handleDrop);
    expect(latestResult?.confirmEdgeCreation).toBe(state.graphHandlersResult.confirmEdgeCreation);

    expect(mockUseCanvasExecutionActions).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedNodeIds: ['node_1'],
        workspaceNodeIds: ['node_1', 'node_2'],
        canPlan: true,
        canRun: true,
      })
    );
    expect(mockUseCanvasGraphHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedNodeIds: ['node_1'],
        inspectorNodeId: 'node_1',
        canonicalNodesById: expect.any(Map),
      })
    );
  });
});
