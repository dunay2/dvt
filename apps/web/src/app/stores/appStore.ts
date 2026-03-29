import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { DbtNode, Run, ExecutionPlan } from '../types/dbt';
import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { useSessionStore } from './sessionStore';

interface ConnectionStatus {
  rest: 'ok' | 'degraded' | 'offline';
  liveEvents: 'connected' | 'polling' | 'disconnected';
}

type CanvasPosition = {
  x: number;
  y: number;
};

type CanvasViewportState = CanvasPosition & {
  zoom: number;
};

type WorkspaceCanvasLayout = {
  viewport: CanvasViewportState | null;
  nodePositions: Record<string, CanvasPosition>;
};

interface AppState {
  _hasHydrated: boolean;

  // Global selectors
  selectedTenant: string;
  selectedProject: string;
  selectedEnvironment: string;
  gitBranch: string;
  gitSha: string;

  // UI State
  leftNavCollapsed: boolean;
  explorerPanelWidth: number;
  explorerPanelVisible: boolean;
  inspectorPanelWidth: number;
  inspectorPanelVisible: boolean;
  consolePanelHeight: number;
  consolePanelVisible: boolean;
  focusMode: boolean;
  gridSize: number; // Grid spacing for canvas

  // Canvas State
  selectedNodes: string[];
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canvasLayouts: Record<string, WorkspaceCanvasLayout>;

  // Active tabs
  activeTabs: Array<{
    id: string;
    type: TabType;
    label: string;
    data?: any;
  }>;
  activeTabId: string | null;

  // Connection status
  connectionStatus: ConnectionStatus;

  // Current execution plan & run
  currentPlan: ExecutionPlan | null;
  currentRun: Run | null;

  // Inspector node
  inspectorNodeId: string | null;

  // User permissions (mock RBAC)
  userPermissions: {
    canPlan: boolean;
    canRun: boolean;
    canEditEdges: boolean;
    canManagePlugins: boolean;
    canManageRBAC: boolean;
  };

  // Actions
  setSelectedTenant: (tenant: string) => void;
  setSelectedProject: (project: string) => void;
  setSelectedEnvironment: (env: string) => void;
  toggleLeftNav: () => void;
  setExplorerPanelWidth: (width: number) => void;
  setInspectorPanelWidth: (width: number) => void;
  setConsolePanelHeight: (height: number) => void;
  toggleFocusMode: () => void;
  toggleExplorerPanel: () => void;
  toggleInspectorPanel: () => void;
  toggleConsolePanel: () => void;
  setGridSize: (size: number) => void;
  setSelectedNodes: (nodes: string[]) => void;
  toggleImpactOverlay: () => void;
  toggleColumnLevelLineage: () => void;
  setCanvasViewport: (workspaceKey: string, viewport: CanvasViewportState | null) => void;
  setCanvasNodePositions: (workspaceKey: string, positions: Record<string, CanvasPosition>) => void;
  addTab: (tab: { id: string; type: TabType; label: string; data?: any }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setCurrentPlan: (plan: ExecutionPlan | null) => void;
  setCurrentRun: (run: Run | null) => void;
  setInspectorNode: (nodeId: string | null) => void;
}

type TabType = 'canvas' | 'run' | 'diff' | 'lineage';

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();
const sessionContext = useSessionStore.getState();

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      _hasHydrated: false,

      // Initial state
      selectedTenant: sessionContext.tenantId,
      selectedProject: sessionContext.projectId,
      selectedEnvironment: sessionContext.environmentId,
      gitBranch: workspaceBootstrap.gitBranch,
      gitSha: workspaceBootstrap.gitSha,

      leftNavCollapsed: false,
      explorerPanelWidth: 280,
      explorerPanelVisible: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      consolePanelHeight: 0,
      consolePanelVisible: false,
      focusMode: false,
      gridSize: 20,

      selectedNodes: [],
      impactOverlayEnabled: false,
      columnLevelLineageEnabled: false,
      canvasLayouts: {},

      activeTabs: [{ id: 'main-canvas', type: 'canvas', label: 'Main Graph' }],
      activeTabId: 'main-canvas',

      connectionStatus: {
        rest: 'ok',
        liveEvents: 'connected',
      },

      currentPlan: null,
      currentRun: null,
      inspectorNodeId: null,

      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: true,
        canManageRBAC: true,
      },

      // Actions
      setSelectedTenant: (tenant) => {
        useSessionStore.getState().setTenantId(tenant);
        set({ selectedTenant: tenant });
      },
      setSelectedProject: (project) => {
        useSessionStore.getState().setProjectId(project);
        set({ selectedProject: project });
      },
      setSelectedEnvironment: (env) => {
        useSessionStore.getState().setEnvironmentId(env);
        set({ selectedEnvironment: env });
      },
      toggleLeftNav: () => set((state) => ({ leftNavCollapsed: !state.leftNavCollapsed })),
      setExplorerPanelWidth: (width) => set({ explorerPanelWidth: width }),
      setInspectorPanelWidth: (width) => set({ inspectorPanelWidth: width }),
      setConsolePanelHeight: (height) => set({ consolePanelHeight: height }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      toggleExplorerPanel: () =>
        set((state) => ({ explorerPanelVisible: !state.explorerPanelVisible })),
      toggleInspectorPanel: () =>
        set((state) => ({ inspectorPanelVisible: !state.inspectorPanelVisible })),
      toggleConsolePanel: () =>
        set((state) => ({
          consolePanelVisible: !state.consolePanelVisible,
          consolePanelHeight: !state.consolePanelVisible ? 160 : 0,
        })),
      setGridSize: (size: number) => set({ gridSize: size }),
      setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
      toggleImpactOverlay: () =>
        set((state) => ({ impactOverlayEnabled: !state.impactOverlayEnabled })),
      toggleColumnLevelLineage: () =>
        set((state) => ({ columnLevelLineageEnabled: !state.columnLevelLineageEnabled })),
      setCanvasViewport: (workspaceKey, viewport) =>
        set((state) => ({
          canvasLayouts: {
            ...state.canvasLayouts,
            [workspaceKey]: {
              viewport,
              nodePositions: state.canvasLayouts[workspaceKey]?.nodePositions ?? {},
            },
          },
        })),
      setCanvasNodePositions: (workspaceKey, positions) =>
        set((state) => ({
          canvasLayouts: {
            ...state.canvasLayouts,
            [workspaceKey]: {
              viewport: state.canvasLayouts[workspaceKey]?.viewport ?? null,
              nodePositions: positions,
            },
          },
        })),

      addTab: (tab) =>
        set((state) => ({
          activeTabs: [...state.activeTabs, tab],
          activeTabId: tab.id,
        })),

      closeTab: (tabId) =>
        set((state) => {
          const newTabs = state.activeTabs.filter((t) => t.id !== tabId);
          const nextActiveTab = newTabs.at(-1);
          const newActiveId =
            state.activeTabId === tabId && nextActiveTab ? nextActiveTab.id : state.activeTabId;
          return { activeTabs: newTabs, activeTabId: newActiveId };
        }),

      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      setConnectionStatus: (status) =>
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, ...status },
        })),
      setCurrentPlan: (plan) => set({ currentPlan: plan }),
      setCurrentRun: (run) => set({ currentRun: run }),
      setInspectorNode: (nodeId) => set({ inspectorNodeId: nodeId }),
    }),
    {
      name: 'dvt-web-shell-layout',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ _hasHydrated: true });
      },
      partialize: (state) => ({
        leftNavCollapsed: state.leftNavCollapsed,
        explorerPanelWidth: state.explorerPanelWidth,
        explorerPanelVisible: state.explorerPanelVisible,
        inspectorPanelWidth: state.inspectorPanelWidth,
        inspectorPanelVisible: state.inspectorPanelVisible,
        consolePanelHeight: state.consolePanelHeight,
        consolePanelVisible: state.consolePanelVisible,
        focusMode: state.focusMode,
        gridSize: state.gridSize,
        impactOverlayEnabled: state.impactOverlayEnabled,
        columnLevelLineageEnabled: state.columnLevelLineageEnabled,
        canvasLayouts: state.canvasLayouts,
      }),
    }
  )
);
