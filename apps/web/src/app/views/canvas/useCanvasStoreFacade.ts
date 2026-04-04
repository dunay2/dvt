import { useAppStore } from '../../stores/appStore';
import { useCallback } from 'react';

type AppStoreState = ReturnType<typeof useAppStore.getState>;

type CanvasStoreFacade = Pick<
  AppStoreState,
  | '_hasHydrated'
  | 'focusMode'
  | 'selectedTenant'
  | 'selectedProject'
  | 'selectedEnvironment'
  | 'selectedNodes'
  | 'setSelectedNodes'
  | 'inspectorNodeId'
  | 'setInspectorNode'
  | 'impactOverlayEnabled'
  | 'toggleImpactOverlay'
  | 'columnLevelLineageEnabled'
  | 'toggleColumnLevelLineage'
  | 'setCurrentPlan'
  | 'currentPlan'
  | 'currentRun'
  | 'userPermissions'
  | 'setConsolePanelHeight'
  | 'consolePanelVisible'
  | 'toggleConsolePanel'
  | 'explorerPanelVisible'
  | 'inspectorPanelVisible'
  | 'gridSize'
  | 'canvasLayouts'
  | 'setCanvasViewport'
  | 'setCanvasNodePositions'
>;

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
  const _hasHydrated = useAppStore((state) => state._hasHydrated);
  const focusMode = useAppStore((state) => state.focusMode);
  const selectedTenant = useAppStore((state) => state.selectedTenant);
  const selectedProject = useAppStore((state) => state.selectedProject);
  const selectedEnvironment = useAppStore((state) => state.selectedEnvironment);
  const selectedNodes = useAppStore((state) => state.selectedNodes);
  const setSelectedNodes = useAppStore((state) => state.setSelectedNodes);
  const inspectorNodeId = useAppStore((state) => state.inspectorNodeId);
  const setInspectorNode = useAppStore((state) => state.setInspectorNode);
  const impactOverlayEnabled = useAppStore((state) => state.impactOverlayEnabled);
  const toggleImpactOverlay = useAppStore((state) => state.toggleImpactOverlay);
  const columnLevelLineageEnabled = useAppStore((state) => state.columnLevelLineageEnabled);
  const toggleColumnLevelLineage = useAppStore((state) => state.toggleColumnLevelLineage);
  const setCurrentPlan = useAppStore((state) => state.setCurrentPlan);
  const currentPlan = useAppStore((state) => state.currentPlan);
  const currentRun = useAppStore((state) => state.currentRun);
  const userPermissions = useAppStore((state) => state.userPermissions);
  const setConsolePanelHeight = useAppStore((state) => state.setConsolePanelHeight);
  const consolePanelVisible = useAppStore((state) => state.consolePanelVisible);
  const toggleExplorerPanel = useAppStore((state) => state.toggleExplorerPanel);
  const toggleInspectorPanel = useAppStore((state) => state.toggleInspectorPanel);
  const toggleConsolePanel = useAppStore((state) => state.toggleConsolePanel);
  const explorerPanelVisible = useAppStore((state) => state.explorerPanelVisible);
  const inspectorPanelVisible = useAppStore((state) => state.inspectorPanelVisible);
  const gridSize = useAppStore((state) => state.gridSize);
  const canvasLayouts = useAppStore((state) => state.canvasLayouts);
  const setCanvasViewport = useAppStore((state) => state.setCanvasViewport);
  const setCanvasNodePositions = useAppStore((state) => state.setCanvasNodePositions);

  const workspaceLayoutKey = `${selectedTenant}::${selectedProject}::${selectedEnvironment}`;
  const workspaceCanvasLayout = canvasLayouts[workspaceLayoutKey];

  const hideExplorerPanel = useCallback(() => {
    if (explorerPanelVisible) {
      toggleExplorerPanel();
    }
  }, [explorerPanelVisible, toggleExplorerPanel]);

  const showExplorerPanel = useCallback(() => {
    if (!explorerPanelVisible) {
      toggleExplorerPanel();
    }
  }, [explorerPanelVisible, toggleExplorerPanel]);

  const hideInspectorPanel = useCallback(() => {
    if (inspectorPanelVisible) {
      toggleInspectorPanel();
    }
  }, [inspectorPanelVisible, toggleInspectorPanel]);

  const showInspectorPanel = useCallback(() => {
    if (!inspectorPanelVisible) {
      toggleInspectorPanel();
    }
  }, [inspectorPanelVisible, toggleInspectorPanel]);

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
    canvasLayouts,
    setCanvasViewport,
    setCanvasNodePositions,
    selectedNodeIds: selectedNodes,
    workspaceLayoutKey,
    persistedViewport: workspaceCanvasLayout?.viewport ?? null,
    persistedNodePositions: workspaceCanvasLayout?.nodePositions ?? {},
    hideExplorerPanel,
    showExplorerPanel,
    hideInspectorPanel,
    showInspectorPanel,
    toggleInspectorPanel,
  };
}
