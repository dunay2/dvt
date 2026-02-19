import { create } from 'zustand';

import { DbtNode, Run, ExecutionPlan } from '../types/dbt';

interface ConnectionStatus {
  rest: 'ok' | 'degraded' | 'offline';
  liveEvents: 'connected' | 'polling' | 'disconnected';
}

interface AppState {
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
  highlightedNodes: string[];
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;

  // Active tabs
  activeTabs: Array<{
    id: string;
    type: 'canvas' | 'run' | 'diff' | 'lineage';
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
  setHighlightedNodes: (nodes: string[]) => void;
  toggleImpactOverlay: () => void;
  toggleColumnLevelLineage: () => void;
  addTab: (tab: { id: string; type: string; label: string; data?: any }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setCurrentPlan: (plan: ExecutionPlan | null) => void;
  setCurrentRun: (run: Run | null) => void;
  setInspectorNode: (nodeId: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  selectedTenant: 'acme-corp',
  selectedProject: 'dbt-analytics',
  selectedEnvironment: 'dev',
  gitBranch: 'main',
  gitSha: 'a3f2b91',

  leftNavCollapsed: false,
  explorerPanelWidth: 280,
  explorerPanelVisible: true,
  inspectorPanelWidth: 380,
  inspectorPanelVisible: true,
  consolePanelHeight: 200,
  consolePanelVisible: false,
  focusMode: false,
  gridSize: 20,

  selectedNodes: [],
  highlightedNodes: [],
  impactOverlayEnabled: false,
  columnLevelLineageEnabled: false,

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
  setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),
  setSelectedProject: (project) => set({ selectedProject: project }),
  setSelectedEnvironment: (env) => set({ selectedEnvironment: env }),
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
      consolePanelHeight: !state.consolePanelVisible ? 200 : 0,
    })),
  setGridSize: (size: number) => set({ gridSize: size }),
  setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
  setHighlightedNodes: (nodes) => set({ highlightedNodes: nodes }),
  toggleImpactOverlay: () =>
    set((state) => ({ impactOverlayEnabled: !state.impactOverlayEnabled })),
  toggleColumnLevelLineage: () =>
    set((state) => ({ columnLevelLineageEnabled: !state.columnLevelLineageEnabled })),

  addTab: (tab) =>
    set((state) => ({
      activeTabs: [...state.activeTabs, tab],
      activeTabId: tab.id,
    })),

  closeTab: (tabId) =>
    set((state) => {
      const newTabs = state.activeTabs.filter((t) => t.id !== tabId);
      const newActiveId =
        state.activeTabId === tabId && newTabs.length > 0
          ? newTabs[newTabs.length - 1].id
          : state.activeTabId;
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
}));
