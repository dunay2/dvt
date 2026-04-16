import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { makeMockRunRef, makeRunContext } from '../../testing/contractTestUtils';
import { useCanvasController } from './useCanvasController';
import {
  configureDefaultCanvasHarnessMocks,
  createDefaultCanvasHarnessState,
  type CanvasHarnessMocks,
  type CanvasHarnessState,
} from './useCanvasController.test.fixtures';

const state = vi.hoisted(() => ({
  graphData: { nodes: [], edges: [] },
  graphDraftRecord: null,
  canonicalNodes: [],
  canonicalEdges: [],
  overlayDecorations: new Map(),
  currentPlan: null,
  services: {
    workspaceService: {
      getGraphSnapshot: vi.fn(async () => ({ nodes: [], edges: [] })),
      getGraphDraft: vi.fn(async () => null),
      saveGraphDraft: vi.fn(async () => ({
        outcome: 'saved' as const,
        record: {
          revision: 'rev-1',
          savedAt: '2026-04-08T00:00:00Z',
          draft: {
            nodeIds: [],
            nodePositions: {},
            edges: [],
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
        name: path,
        language: 'sql',
        content: '',
        lastModified: '2026-04-08T00:00:00Z',
      })),
      saveFileContent: vi.fn(async (path: string, content: string) => ({
        path,
        name: path,
        language: 'sql',
        content,
        lastModified: '2026-04-08T00:00:00Z',
      })),
    },
    plansService: {
      previewPlan: vi.fn(async () => ({
        planId: 'plan_1',
        planVersion: '1',
        generatedAt: '2026-04-08T00:00:00Z',
        adapter: 'dbt',
        target: 'dev',
        steps: [],
        capabilities: [],
      })),
      importPlan: vi.fn(async () => ({
        planId: 'plan_1',
        planVersion: '1',
        generatedAt: '2026-04-08T00:00:00Z',
        adapter: 'dbt',
        target: 'dev',
        steps: [],
        capabilities: [],
      })),
    },
    runsService: {
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
    },
    sessionContext: {
      getWorkspaceScope: () => ({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'mock' as const,
      }),
      getWorkspaceScopeSnapshot: () => ({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'mock' as const,
      }),
      subscribeWorkspaceScope: () => () => undefined,
      buildRunContext: (runId: string) =>
        makeRunContext(runId, {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
          targetAdapter: 'mock',
        }),
    },
    shellFeedback: {
      success: vi.fn(),
      error: vi.fn(),
    },
  },
  store: { setCanvasViewport: vi.fn(), setCanvasNodePositions: vi.fn() },
  queryClient: {
    invalidateQueries: vi.fn(async () => undefined),
    setQueryData: vi.fn(),
  },
  graphHandlersResult: { handleDrop: vi.fn(), confirmEdgeCreation: vi.fn() },
  executionActionsResult: {
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    handlePlan: vi.fn(),
    handleStartRun: vi.fn(),
  },
  navigationActionsResult: {
    handleRunStarted: vi.fn(),
  },
})) as CanvasHarnessState;
const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
  resolveCanvasGraphStrategy: vi.fn(),
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
  getRegisteredPluginIds: vi.fn(),
  buildNodesWithImpact: vi.fn(),
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
vi.mock('../../stores/canvasInteractionStore', () => ({
  useCanvasInteractionStore: mocks.useCanvasInteractionStore,
}));
vi.mock('../../stores/executionStore', () => ({ useExecutionStore: mocks.useExecutionStore }));
vi.mock('../../stores/sessionStore', () => ({ useSessionStore: mocks.useSessionStore }));
vi.mock('../../stores/uiLayoutStore', () => ({ useUiLayoutStore: mocks.useUiLayoutStore }));
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
    setGraphQueryError: () => {
      mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
        const queryKey = queryConfig?.queryKey ?? [];
        if (queryKey[1] === 'graph-draft') {
          return {
            data: state.graphDraftRecord,
            isPending: false,
            isError: false,
          };
        }

        return {
          data: undefined,
          isPending: false,
          isError: true,
        };
      });
    },
    removeNodeCostsAndRefreshGraphSnapshot: () => {
      state.canonicalNodes = state.canonicalNodes.map((node) => {
        const { lastCost, ...rest } = node;
        return rest;
      });
      mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
        const queryKey = queryConfig?.queryKey ?? [];
        if (queryKey[1] === 'graph-draft') {
          return {
            data: state.graphDraftRecord,
            isPending: false,
            isError: false,
          };
        }

        return {
          data: {
            nodes: [...state.graphData.nodes],
            edges: [...state.graphData.edges],
          },
          isPending: false,
          isError: false,
        };
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
            <AppServicesProvider
              overrides={{
                mode: 'mock',
                workspaceService: state.services.workspaceService,
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
