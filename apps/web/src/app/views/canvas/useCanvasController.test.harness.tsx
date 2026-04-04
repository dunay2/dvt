import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { useCanvasController } from './useCanvasController';
import {
  configureDefaultCanvasHarnessMocks,
  createDefaultCanvasHarnessState,
  type CanvasHarnessMocks,
  type CanvasHarnessState,
} from './useCanvasController.test.fixtures';

const state = vi.hoisted(() => ({
  graphData: { nodes: [], edges: [] },
  canonicalNodes: [],
  canonicalEdges: [],
  overlayDecorations: new Map(),
  currentPlan: null,
  store: { setCanvasViewport: vi.fn(), setCanvasNodePositions: vi.fn() },
  graphHandlersResult: { handleDrop: vi.fn(), confirmEdgeCreation: vi.fn() },
  executionActionsResult: { handlePlan: vi.fn(), handleStartRun: vi.fn() },
})) as CanvasHarnessState;
const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  resolveCanvasGraphStrategy: vi.fn(),
  useWorkspaceService: vi.fn(),
  usePlansService: vi.fn(),
  useRunsService: vi.fn(),
  useAppStore: vi.fn(),
  useCapabilitiesQuery: vi.fn(),
  buildOverlayContext: vi.fn(),
  buildNodeDecorations: vi.fn(),
  mapCanonicalNodeToCanvasNode: vi.fn(),
  mapCanonicalEdgeToCanvasEdge: vi.fn(),
  getAllOverlays: vi.fn(),
  getRegisteredPluginIds: vi.fn(),
  buildNodesWithImpact: vi.fn(),
  useCanvasExecutionActions: vi.fn(),
  useCanvasGraphHandlers: vi.fn(),
})) as CanvasHarnessMocks;
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
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
vi.mock('../../components/canvas/DbtNodeComponent', () => ({ default: () => null }));
vi.mock('../../plugins/graphStrategyRegistry', () => ({
  resolveCanvasGraphStrategy: mocks.resolveCanvasGraphStrategy,
}));
vi.mock('../../services/AppServicesContext', () => ({
  useWorkspaceService: mocks.useWorkspaceService,
  usePlansService: mocks.usePlansService,
  useRunsService: mocks.useRunsService,
}));
vi.mock('../../stores/appStore', () => ({ useAppStore: mocks.useAppStore }));
vi.mock('../../queries/useCapabilitiesQuery', () => ({
  useCapabilitiesQuery: mocks.useCapabilitiesQuery,
}));
vi.mock('./canvasImpactOverlay', () => ({ buildNodesWithImpact: mocks.buildNodesWithImpact }));
vi.mock('./canvasOverlayContext', () => ({
  buildOverlayContext: mocks.buildOverlayContext,
  buildNodeDecorations: mocks.buildNodeDecorations,
}));
vi.mock('./canvasNodeMapper', () => ({
  mapCanonicalEdgeToCanvasEdge: mocks.mapCanonicalEdgeToCanvasEdge,
  mapCanonicalNodeToCanvasNode: mocks.mapCanonicalNodeToCanvasNode,
}));
vi.mock('../../plugins/registry', () => ({
  getAllOverlays: mocks.getAllOverlays,
  getRegisteredPluginIds: mocks.getRegisteredPluginIds,
}));
vi.mock('./useCanvasExecutionActions', () => ({
  useCanvasExecutionActions: mocks.useCanvasExecutionActions,
}));
vi.mock('./useCanvasGraphHandlers', () => ({
  useCanvasGraphHandlers: mocks.useCanvasGraphHandlers,
}));

export function setupCanvasControllerHarness() {
  let latestResult: ReturnType<typeof useCanvasController> | null = null;
  let container: HTMLDivElement | null = document.createElement('div'),
    root: Root | null = createRoot(container);
  document.body.appendChild(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(state, createDefaultCanvasHarnessState());
  configureDefaultCanvasHarnessMocks(state, mocks);

  function Probe(): null {
    latestResult = useCanvasController();
    return null;
  }

  return {
    state,
    mocks,
    getLatestResult: () => latestResult,
    setGraphQueryError: () => {
      mocks.useQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
      });
    },
    removeNodeCostsAndRefreshGraphSnapshot: () => {
      state.canonicalNodes = state.canonicalNodes.map((node) => {
        const { lastCost, ...rest } = node;
        return rest;
      });
      mocks.useQuery.mockReturnValue({
        data: {
          nodes: [...state.graphData.nodes],
          edges: [...state.graphData.edges],
        },
        isPending: false,
        isError: false,
      });
    },
    toggleCostOverlay: async () =>
      act(async () => {
        latestResult?.handleToggleCostOverlay();
      }),
    renderProbe: async () =>
      act(async () => {
        root?.render(
          <MemoryRouter>
            <Probe />
          </MemoryRouter>
        );
      }),
    cleanup: () => {
      act(() => root?.unmount());
      container?.remove();
      root = null;
      container = null;
      vi.clearAllMocks();
    },
  };
}
