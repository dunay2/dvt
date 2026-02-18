import { create } from 'zustand';

import { Run, ExecutionPlan } from '../types/dbt';

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
  inspectorPanelWidth: number;
  consolePanelHeight: number;
  focusMode: boolean;

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
  inspectorPanelWidth: 380,
  consolePanelHeight: 200,
  focusMode: false,

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
