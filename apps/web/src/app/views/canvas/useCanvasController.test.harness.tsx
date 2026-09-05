import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useCanvasController } from './useCanvasController';
import {
  refreshCanvasHarnessGraphSnapshotWithoutNodeCosts,
  setCanvasHarnessGraphQueryError,
} from './useCanvasController.test.graphQuery';
import {
  configureDefaultCanvasHarnessMocks,
  createDefaultCanvasHarnessState,
} from './useCanvasController.test.fixtures';
import type { CanvasHarnessMocks, CanvasHarnessState } from './useCanvasController.test.types';

const state = vi.hoisted(() => ({})) as CanvasHarnessState;
const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
  getGraphNodeCardStrategies: vi.fn(),
  findCanvasGraphStrategy: vi.fn(),
  findCanvasRuntimeRegistration: vi.fn(),
  resolveCanvasGraphStrategy: vi.fn(),
  useAuthorizationStore: vi.fn(),
  useCanvasInteractionStore: vi.fn(),
  useExecutionStore: vi.fn(),
  useSessionStore: vi.fn(),
  useUiLayoutStore: vi.fn(),
  useCapabilitiesQuery: vi.fn(),
  buildOverlayContext: vi.fn(),
  buildNodeDecorations: vi.fn(),
  mapCanonicalNodeToCanvasNode: vi.fn(),
  mapCanonicalEdgeToCanvasEdge: vi.fn(),
  getAllOverlays: vi.fn(),
  getAllCanvasKinds: vi.fn(),
  getRegisteredPluginIds: vi.fn(),
  getPluginPortMap: vi.fn(),
  getSourceImportContributions: vi.fn(),
  buildCanvasNodeInteractionPresentation: vi.fn(),
  useCanvasExecutionActions: vi.fn(),
  useCanvasGraphHandlers: vi.fn(),
  useCanvasNavigationActions: vi.fn(),
})) as CanvasHarnessMocks;
vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useQueryClient: mocks.useQueryClient,
}));
vi.mock('@xyflow/react', async () => {
  const ReactModule = await import('react');
  return {
    applyNodeChanges: <
      T extends { id: string; position?: { x: number; y: number }; dragging?: boolean },
    >(
      changes: Array<{
        id?: string;
        type?: string;
        position?: { x: number; y: number };
        dragging?: boolean;
      }>,
      nodes: T[]
    ) =>
      changes.reduce((currentNodes, change) => {
        if (change.type === 'remove' && change.id != null) {
          return currentNodes.filter((node) => node.id !== change.id);
        }

        if (change.type === 'position' && change.id != null) {
          return currentNodes.map((node) =>
            node.id === change.id
              ? {
                  ...node,
                  ...(change.position === undefined ? {} : { position: change.position }),
                  ...(change.dragging === undefined ? {} : { dragging: change.dragging }),
                }
              : node
          );
        }

        return currentNodes;
      }, nodes),
    applyEdgeChanges: <T extends { id: string }>(
      changes: Array<{ id?: string; type?: string }>,
      edges: T[]
    ) =>
      changes.reduce((currentEdges, change) => {
        if (change.type === 'remove' && change.id != null) {
          return currentEdges.filter((edge) => edge.id !== change.id);
        }

        return currentEdges;
      }, edges),
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
  getGraphNodeCardStrategies: mocks.getGraphNodeCardStrategies,
  findCanvasGraphStrategy: mocks.findCanvasGraphStrategy,
  findCanvasRuntimeRegistration: mocks.findCanvasRuntimeRegistration,
  resolveCanvasGraphStrategy: mocks.resolveCanvasGraphStrategy,
}));
vi.mock('../../stores/authorizationStore', () => ({
  useAuthorizationStore: mocks.useAuthorizationStore,
}));
vi.mock('../../stores/canvasInteractionStore', () => ({
  useCanvasInteractionStore: mocks.useCanvasInteractionStore,
}));
vi.mock('../../stores/executionStore', () => ({ useExecutionStore: mocks.useExecutionStore }));
vi.mock('../../stores/sessionStore', () => ({ useSessionStore: mocks.useSessionStore }));
vi.mock('../../stores/uiLayoutStore', () => ({ useUiLayoutStore: mocks.useUiLayoutStore }));
vi.mock('../../queries/useCapabilitiesQuery', () => ({
  useCapabilitiesQuery: mocks.useCapabilitiesQuery,
}));
vi.mock('./canvasNodeInteractionPresentation', () => ({
  buildCanvasNodeInteractionPresentation: mocks.buildCanvasNodeInteractionPresentation,
}));
vi.mock('./canvasOverlayContext', () => ({
  buildOverlayContext: mocks.buildOverlayContext,
  buildNodeDecorations: mocks.buildNodeDecorations,
}));
vi.mock('./canvasNodeMapper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./canvasNodeMapper')>();
  return {
    ...actual,
    createCanvasDirectionalEdge: (edge: { id: string; source: string; target: string }) => edge,
    mapCanonicalEdgeToCanvasEdge: mocks.mapCanonicalEdgeToCanvasEdge,
    mapCanonicalNodeToCanvasNode: mocks.mapCanonicalNodeToCanvasNode,
  };
});
vi.mock('../../plugins/registry', () => ({
  getAllOverlays: mocks.getAllOverlays,
  getAllCanvasKinds: mocks.getAllCanvasKinds,
  getRegisteredPluginIds: mocks.getRegisteredPluginIds,
  getPluginPortMap: mocks.getPluginPortMap,
  getSourceImportContributions: mocks.getSourceImportContributions,
}));
vi.mock('./useCanvasExecutionActions', () => ({
  useCanvasExecutionActions: mocks.useCanvasExecutionActions,
}));
vi.mock('./useCanvasGraphHandlers', () => ({
  useCanvasGraphHandlers: mocks.useCanvasGraphHandlers,
}));
vi.mock('./useCanvasNavigationActions', () => ({
  useCanvasNavigationActions: mocks.useCanvasNavigationActions,
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
    setGraphQueryError: () => setCanvasHarnessGraphQueryError(state, mocks),
    removeNodeCostsAndRefreshGraphSnapshot: () =>
      refreshCanvasHarnessGraphSnapshotWithoutNodeCosts(state, mocks),
    toggleCostOverlay: async () =>
      act(async () => {
        latestResult?.handleToggleCostOverlay();
      }),
    renderProbe: async () =>
      act(async () => {
        root?.render(
          <MemoryRouter>
            <AppServicesProvider
              overrides={{
                workspaceFilesQuery: state.services.workspaceFilesQuery,
                workspaceFileContentCommand: state.services.workspaceFileContentCommand,
                workspaceGraphDraftAuthoringPort: state.services.workspaceGraphDraftAuthoringPort,
                plansService: state.services.plansService,
                runsService: state.services.runsService,
                sessionContext: state.services.sessionContext,
                shellFeedback: state.services.shellFeedback,
              }}
            >
              <Probe />
            </AppServicesProvider>
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
