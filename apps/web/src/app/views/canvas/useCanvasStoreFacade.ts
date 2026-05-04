/** Owned concern: compose Canvas route stores without becoming a replacement aggregate store. */
import { useCallback } from 'react';
import { useAuthorizationStore, type UserPermissions } from '../../stores/authorizationStore';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { CanvasPaletteId } from './canvasPalette';

const EMPTY_PERSISTED_NODE_POSITIONS: Record<string, { x: number; y: number }> = {};

type CanvasStoreFacade = {
  _hasHydrated: boolean;
  focusMode: boolean;
  selectedTenant: string;
  selectedProject: string;
  selectedEnvironment: string;
  selectedNodes: string[];
  setSelectedNodes: (nodes: string[]) => void;
  inspectorNodeId: string | null;
  setInspectorNode: (nodeId: string | null) => void;
  impactOverlayEnabled: boolean;
  toggleImpactOverlay: () => void;
  columnLevelLineageEnabled: boolean;
  toggleColumnLevelLineage: () => void;
  setCurrentPlan: (plan: ReturnType<typeof useExecutionStore.getState>['currentPlan']) => void;
  currentPlan: ReturnType<typeof useExecutionStore.getState>['currentPlan'];
  currentRun: ReturnType<typeof useExecutionStore.getState>['currentRun'];
  userPermissions: UserPermissions;
  setConsolePanelHeight: (height: number) => void;
  consolePanelVisible: boolean;
  toggleConsolePanel: () => void;
  explorerPanelVisible: boolean;
  inspectorPanelVisible: boolean;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  setCanvasGridVisible: (visible: boolean) => void;
  setCanvasGridColor: (color: CanvasPaletteId) => void;
  setCanvasSnapToGrid: (enabled: boolean) => void;
  canvasLayouts: ReturnType<typeof useCanvasInteractionStore.getState>['canvasLayouts'];
  setCanvasViewport: ReturnType<typeof useCanvasInteractionStore.getState>['setCanvasViewport'];
  setCanvasNodePositions: ReturnType<
    typeof useCanvasInteractionStore.getState
  >['setCanvasNodePositions'];
};

export type CanvasStoreView = CanvasStoreFacade & {
  selectedNodeIds: string[];
  workspaceLayoutKey: string;
  persistedViewport: { x: number; y: number; zoom: number } | null;
  persistedNodePositions: Record<string, { x: number; y: number }>;
  hideExplorerPanel: () => void;
  showExplorerPanel: () => void;
  hideInspectorPanel: () => void;
  showInspectorPanel: () => void;
  toggleInspectorPanel: () => void;
};

export function useCanvasStoreFacade(): CanvasStoreView {
  const _hasHydrated = useCanvasInteractionStore((state) => state._hasHydrated);
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const selectedTenant = useSessionStore((state) => state.tenantId);
  const selectedProject = useSessionStore((state) => state.projectId);
  const selectedEnvironment = useSessionStore((state) => state.environmentId);
  const selectedNodes = useCanvasInteractionStore((state) => state.selectedNodes);
  const setSelectedNodes = useCanvasInteractionStore((state) => state.setSelectedNodes);
  const inspectorNodeId = useCanvasInteractionStore((state) => state.inspectorNodeId);
  const setInspectorNode = useCanvasInteractionStore((state) => state.setInspectorNode);
  const impactOverlayEnabled = useCanvasInteractionStore((state) => state.impactOverlayEnabled);
  const toggleImpactOverlay = useCanvasInteractionStore((state) => state.toggleImpactOverlay);
  const columnLevelLineageEnabled = useCanvasInteractionStore(
    (state) => state.columnLevelLineageEnabled
  );
  const toggleColumnLevelLineage = useCanvasInteractionStore(
    (state) => state.toggleColumnLevelLineage
  );
  const setCurrentPlan = useExecutionStore((state) => state.setCurrentPlan);
  const currentPlan = useExecutionStore((state) => state.currentPlan);
  const currentRun = useExecutionStore((state) => state.currentRun);
  const userPermissions = useAuthorizationStore((state) => state.userPermissions);
  const setConsolePanelHeight = useUiLayoutStore((state) => state.setConsolePanelHeight);
  const consolePanelVisible = useUiLayoutStore((state) => state.consolePanelVisible);
  const showExplorerPanelStore = useUiLayoutStore((state) => state.showExplorerPanel);
  const hideExplorerPanelStore = useUiLayoutStore((state) => state.hideExplorerPanel);
  const showInspectorPanelStore = useUiLayoutStore((state) => state.showInspectorPanel);
  const hideInspectorPanelStore = useUiLayoutStore((state) => state.hideInspectorPanel);
  const toggleInspectorPanel = useUiLayoutStore((state) => state.toggleInspectorPanel);
  const toggleConsolePanel = useUiLayoutStore((state) => state.toggleConsolePanel);
  const explorerPanelVisible = useUiLayoutStore((state) => state.explorerPanelVisible);
  const inspectorPanelVisible = useUiLayoutStore((state) => state.inspectorPanelVisible);
  const gridSize = useUiLayoutStore((state) => state.gridSize);
  const canvasPalette = useUiLayoutStore((state) => state.canvasPalette);
  const canvasGridVisible = useUiLayoutStore((state) => state.canvasGridVisible);
  const canvasGridColor = useUiLayoutStore((state) => state.canvasGridColor);
  const canvasSnapToGrid = useUiLayoutStore((state) => state.canvasSnapToGrid);
  const setCanvasGridVisible = useUiLayoutStore((state) => state.setCanvasGridVisible);
  const setCanvasGridColor = useUiLayoutStore((state) => state.setCanvasGridColor);
  const setCanvasSnapToGrid = useUiLayoutStore((state) => state.setCanvasSnapToGrid);
  const canvasLayouts = useCanvasInteractionStore((state) => state.canvasLayouts);
  const setCanvasViewport = useCanvasInteractionStore((state) => state.setCanvasViewport);
  const setCanvasNodePositions = useCanvasInteractionStore((state) => state.setCanvasNodePositions);

  const workspaceLayoutKey = `${selectedTenant}::${selectedProject}::${selectedEnvironment}`;
  const workspaceCanvasLayout = canvasLayouts[workspaceLayoutKey];

  const hideExplorerPanel = useCallback(() => {
    if (explorerPanelVisible) {
      hideExplorerPanelStore();
    }
  }, [explorerPanelVisible, hideExplorerPanelStore]);

  const showExplorerPanel = useCallback(() => {
    if (!explorerPanelVisible) {
      showExplorerPanelStore();
    }
  }, [explorerPanelVisible, showExplorerPanelStore]);

  const hideInspectorPanel = useCallback(() => {
    if (inspectorPanelVisible) {
      hideInspectorPanelStore();
    }
  }, [hideInspectorPanelStore, inspectorPanelVisible]);

  const showInspectorPanel = useCallback(() => {
    if (!inspectorPanelVisible) {
      showInspectorPanelStore();
    }
  }, [inspectorPanelVisible, showInspectorPanelStore]);

  return {
    _hasHydrated,
    focusMode,
    selectedTenant,
    selectedProject,
    selectedEnvironment,
    selectedNodes,
    setSelectedNodes,
    inspectorNodeId,
    setInspectorNode,
    impactOverlayEnabled,
    toggleImpactOverlay,
    columnLevelLineageEnabled,
    toggleColumnLevelLineage,
    setCurrentPlan,
    currentPlan,
    currentRun,
    userPermissions,
    setConsolePanelHeight,
    consolePanelVisible,
    toggleConsolePanel,
    explorerPanelVisible,
    inspectorPanelVisible,
    gridSize,
    canvasPalette,
    canvasGridVisible,
    canvasGridColor,
    canvasSnapToGrid,
    setCanvasGridVisible,
    setCanvasGridColor,
    setCanvasSnapToGrid,
    canvasLayouts,
    setCanvasViewport,
    setCanvasNodePositions,
    selectedNodeIds: selectedNodes,
    workspaceLayoutKey,
    persistedViewport: workspaceCanvasLayout?.viewport ?? null,
    persistedNodePositions: workspaceCanvasLayout?.nodePositions ?? EMPTY_PERSISTED_NODE_POSITIONS,
    hideExplorerPanel,
    showExplorerPanel,
    hideInspectorPanel,
    showInspectorPanel,
    toggleInspectorPanel,
  };
}
