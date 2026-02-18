import { create } from 'zustand';

import { ConnectionStatus, Environment, ExecutionPlan, DbtRun } from '../types';

// App state
interface AppState {
  // Global context
  tenant: string;
  project: string;
  environment: Environment;
  gitBranch: string;
  gitSha: string;
  connectionStatus: ConnectionStatus;

  // UI state
  leftNavCollapsed: boolean;
  rightPanelCollapsed: boolean;
  bottomDrawerCollapsed: boolean;
  bottomDrawerHeight: number;
  rightPanelWidth: number;
  focusMode: boolean;

  // Actions
  setTenant: (tenant: string) => void;
  setProject: (project: string) => void;
  setEnvironment: (env: Environment) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  toggleLeftNav: () => void;
  toggleRightPanel: () => void;
  toggleBottomDrawer: () => void;
  setBottomDrawerHeight: (height: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleFocusMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  tenant: 'acme-corp',
  project: 'analytics',
  environment: 'dev',
  gitBranch: 'feature/sales-dashboard',
  gitSha: 'a1b2c3d4',
  connectionStatus: 'ok',
  leftNavCollapsed: false,
  rightPanelCollapsed: false,
  bottomDrawerCollapsed: true,
  bottomDrawerHeight: 250,
  rightPanelWidth: 400,
  focusMode: false,

  setTenant: (tenant) => set({ tenant }),
  setProject: (project) => set({ project }),
  setEnvironment: (environment) => set({ environment }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  toggleLeftNav: () => set((state) => ({ leftNavCollapsed: !state.leftNavCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  toggleBottomDrawer: () =>
    set((state) => ({ bottomDrawerCollapsed: !state.bottomDrawerCollapsed })),
  setBottomDrawerHeight: (bottomDrawerHeight) => set({ bottomDrawerHeight }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth }),
  toggleFocusMode: () =>
    set((state) => ({
      focusMode: !state.focusMode,
      leftNavCollapsed: !state.focusMode ? true : state.leftNavCollapsed,
      rightPanelCollapsed: !state.focusMode ? true : state.rightPanelCollapsed,
    })),
}));

// Canvas state
interface CanvasState {
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  impactOverlayActive: boolean;
  columnLevelLineageActive: boolean;

  setSelectedNodeIds: (ids: string[]) => void;
  addSelectedNodeId: (id: string) => void;
  removeSelectedNodeId: (id: string) => void;
  setHoveredNodeId: (id: string | null) => void;
  toggleImpactOverlay: () => void;
  toggleColumnLevelLineage: () => void;
  clearSelection: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  selectedNodeIds: [],
  hoveredNodeId: null,
  impactOverlayActive: false,
  columnLevelLineageActive: false,

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  addSelectedNodeId: (id) =>
    set((state) => ({
      selectedNodeIds: [...state.selectedNodeIds, id],
    })),
  removeSelectedNodeId: (id) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((nodeId) => nodeId !== id),
    })),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  toggleImpactOverlay: () => set((state) => ({ impactOverlayActive: !state.impactOverlayActive })),
  toggleColumnLevelLineage: () =>
    set((state) => ({ columnLevelLineageActive: !state.columnLevelLineageActive })),
  clearSelection: () => set({ selectedNodeIds: [] }),
}));

// Tabs state
interface Tab {
  id: string;
  type: 'canvas' | 'run' | 'diff' | 'lineage';
  title: string;
  data?: any;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string;

  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [{ id: 'canvas-main', type: 'canvas', title: 'Main Graph' }],
  activeTabId: 'canvas-main',

  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),
  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      const newActiveTabId =
        state.activeTabId === id
          ? newTabs.length > 0
            ? (newTabs[0]?.id ?? '')
            : ''
          : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActiveTabId };
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
}));

// Modal state
interface ModalState {
  planPreviewOpen: boolean;
  confirmEdgeOpen: boolean;
  confirmRunOpen: boolean;
  permissionDeniedOpen: boolean;
  rePlanRequiredOpen: boolean;
  networkDegradedOpen: boolean;

  edgeData: {
    sourceId: string;
    targetId: string;
    semantic: string;
  } | null;

  currentPlan: ExecutionPlan | null;
  currentRun: DbtRun | null;

  openPlanPreview: (plan: ExecutionPlan) => void;
  closePlanPreview: () => void;
  openConfirmEdge: (sourceId: string, targetId: string, semantic: string) => void;
  closeConfirmEdge: () => void;
  openConfirmRun: (plan: ExecutionPlan) => void;
  closeConfirmRun: () => void;
  openPermissionDenied: () => void;
  closePermissionDenied: () => void;
  openRePlanRequired: () => void;
  closeRePlanRequired: () => void;
  openNetworkDegraded: () => void;
  closeNetworkDegraded: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  planPreviewOpen: false,
  confirmEdgeOpen: false,
  confirmRunOpen: false,
  permissionDeniedOpen: false,
  rePlanRequiredOpen: false,
  networkDegradedOpen: false,
  edgeData: null,
  currentPlan: null,
  currentRun: null,

  openPlanPreview: (plan) => set({ planPreviewOpen: true, currentPlan: plan }),
  closePlanPreview: () => set({ planPreviewOpen: false, currentPlan: null }),
  openConfirmEdge: (sourceId, targetId, semantic) =>
    set({
      confirmEdgeOpen: true,
      edgeData: { sourceId, targetId, semantic },
    }),
  closeConfirmEdge: () => set({ confirmEdgeOpen: false, edgeData: null }),
  openConfirmRun: (plan) => set({ confirmRunOpen: true, currentPlan: plan }),
  closeConfirmRun: () => set({ confirmRunOpen: false, currentPlan: null }),
  openPermissionDenied: () => set({ permissionDeniedOpen: true }),
  closePermissionDenied: () => set({ permissionDeniedOpen: false }),
  openRePlanRequired: () => set({ rePlanRequiredOpen: true }),
  closeRePlanRequired: () => set({ rePlanRequiredOpen: false }),
  openNetworkDegraded: () => set({ networkDegradedOpen: true }),
  closeNetworkDegraded: () => set({ networkDegradedOpen: false }),
}));
