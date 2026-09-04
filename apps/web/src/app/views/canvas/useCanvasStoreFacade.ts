/** Owned concern: compose Canvas route stores without becoming a replacement aggregate store. */
import { useCallback, useMemo } from 'react';
import { useAuthorizationStore, type UserPermissions } from '../../stores/authorizationStore';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { CanvasPaletteId } from './canvasPalette';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

const EMPTY_PERSISTED_NODE_POSITIONS: Record<string, { x: number; y: number }> = {};
const EMPTY_FROZEN_NODE_IDS: readonly string[] = [];

type CanvasStoreFacade = {
  _hasHydrated: boolean;
  focusMode: boolean;
  selectedTenant: string;
  selectedProject: string;
  selectedEnvironment: string;
  selectedNodes: string[];
  executionSelectionIntent: CanvasExecutionSelectionIntent;
  setSelectedNodes: ReturnType<typeof useCanvasInteractionStore.getState>['setSelectedNodes'];
  setExecutionSelectionIntent: ReturnType<
    typeof useCanvasInteractionStore.getState
  >['setExecutionSelectionIntent'];
  inspectorNodeId: string | null;
  inspectorPreferredTabId: string | null;
  inspectorPreferredTabRequestId: number;
  setInspectorNode: (nodeId: string | null, preferredTabId?: string | null) => void;
  impactOverlayEnabled: boolean;
  toggleImpactOverlay: () => void;
  columnLevelLineageEnabled: boolean;
  toggleColumnLevelLineage: () => void;
  setCurrentPlan: (plan: ReturnType<typeof useExecutionStore.getState>['currentPlan']) => void;
  setCurrentRun: (run: ReturnType<typeof useExecutionStore.getState>['currentRun']) => void;
  currentPlan: ReturnType<typeof useExecutionStore.getState>['currentPlan'];
  currentRun: ReturnType<typeof useExecutionStore.getState>['currentRun'];
  closeContextualWorkbench: ReturnType<
    typeof useCanvasInteractionStore.getState
  >['closeContextualWorkbench'];
  userPermissions: UserPermissions;
  setBottomDrawerHeight: (height: number) => void;
  bottomDrawerVisible: boolean;
  toggleBottomDrawer: () => void;
  inspectorPanelVisible: boolean;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  setGridSize: (size: number) => void;
  setCanvasPalette: (palette: CanvasPaletteId) => void;
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
  toggleFrozenCanvasNode: ReturnType<
    typeof useCanvasInteractionStore.getState
  >['toggleFrozenCanvasNode'];
};

export type CanvasStoreView = CanvasStoreFacade & {
  selectedNodeIds: string[];
  workspaceLayoutKey: string;
  persistedViewport: { x: number; y: number; zoom: number } | null;
  persistedNodePositions: Record<string, { x: number; y: number }>;
  frozenNodeIds: ReadonlySet<string>;
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
  const executionSelectionIntent = useCanvasInteractionStore(
    (state) => state.executionSelectionIntent
  );
  const selectedNodes = executionSelectionIntent.nodeIds;
  const setSelectedNodes = useCanvasInteractionStore((state) => state.setSelectedNodes);
  const setExecutionSelectionIntent = useCanvasInteractionStore(
    (state) => state.setExecutionSelectionIntent
  );
  const inspectorNodeId = useCanvasInteractionStore((state) => state.inspectorNodeId);
  const inspectorPreferredTabId = useCanvasInteractionStore(
    (state) => state.inspectorPreferredTabId
  );
  const inspectorPreferredTabRequestId = useCanvasInteractionStore(
    (state) => state.inspectorPreferredTabRequestId
  );
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
  const setCurrentRun = useExecutionStore((state) => state.setCurrentRun);
  const currentPlan = useExecutionStore((state) => state.currentPlan);
  const currentRun = useExecutionStore((state) => state.currentRun);
  const closeContextualWorkbench = useCanvasInteractionStore(
    (state) => state.closeContextualWorkbench
  );
  const userPermissions = useAuthorizationStore((state) => state.userPermissions);
  const setBottomDrawerHeight = useUiLayoutStore((state) => state.setBottomDrawerHeight);
  const bottomDrawerVisible = useUiLayoutStore((state) => state.bottomDrawerVisible);
  const showInspectorPanelStore = useUiLayoutStore((state) => state.showInspectorPanel);
  const hideInspectorPanelStore = useUiLayoutStore((state) => state.hideInspectorPanel);
  const toggleInspectorPanel = useUiLayoutStore((state) => state.toggleInspectorPanel);
  const toggleBottomDrawer = useUiLayoutStore((state) => state.toggleBottomDrawer);
  const inspectorPanelVisible = useUiLayoutStore((state) => state.inspectorPanelVisible);
  const gridSize = useUiLayoutStore((state) => state.gridSize);
  const canvasPalette = useUiLayoutStore((state) => state.canvasPalette);
  const setGridSize = useUiLayoutStore((state) => state.setGridSize);
  const setCanvasPalette = useUiLayoutStore((state) => state.setCanvasPalette);
  const canvasGridVisible = useUiLayoutStore((state) => state.canvasGridVisible);
  const canvasGridColor = useUiLayoutStore((state) => state.canvasGridColor);
  const canvasSnapToGrid = useUiLayoutStore((state) => state.canvasSnapToGrid);
  const setCanvasGridVisible = useUiLayoutStore((state) => state.setCanvasGridVisible);
  const setCanvasGridColor = useUiLayoutStore((state) => state.setCanvasGridColor);
  const setCanvasSnapToGrid = useUiLayoutStore((state) => state.setCanvasSnapToGrid);
  const canvasLayouts = useCanvasInteractionStore((state) => state.canvasLayouts);
  const setCanvasViewport = useCanvasInteractionStore((state) => state.setCanvasViewport);
  const setCanvasNodePositions = useCanvasInteractionStore((state) => state.setCanvasNodePositions);
  const toggleFrozenCanvasNode = useCanvasInteractionStore((state) => state.toggleFrozenCanvasNode);

  const workspaceLayoutKey = `${selectedTenant}::${selectedProject}::${selectedEnvironment}`;
  const workspaceCanvasLayout = canvasLayouts[workspaceLayoutKey];
  const frozenNodeIdsSource = workspaceCanvasLayout?.frozenNodeIds ?? EMPTY_FROZEN_NODE_IDS;
  const frozenNodeIds = useMemo(() => new Set(frozenNodeIdsSource), [frozenNodeIdsSource]);

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
    executionSelectionIntent,
    setSelectedNodes,
    setExecutionSelectionIntent,
    inspectorNodeId,
    inspectorPreferredTabId,
    inspectorPreferredTabRequestId,
    setInspectorNode,
    impactOverlayEnabled,
    toggleImpactOverlay,
    columnLevelLineageEnabled,
    toggleColumnLevelLineage,
    setCurrentPlan,
    setCurrentRun,
    currentPlan,
    currentRun,
    closeContextualWorkbench,
    userPermissions,
    setBottomDrawerHeight,
    bottomDrawerVisible,
    toggleBottomDrawer,
    inspectorPanelVisible,
    gridSize,
    canvasPalette,
    setGridSize,
    setCanvasPalette,
    canvasGridVisible,
    canvasGridColor,
    canvasSnapToGrid,
    setCanvasGridVisible,
    setCanvasGridColor,
    setCanvasSnapToGrid,
    canvasLayouts,
    setCanvasViewport,
    setCanvasNodePositions,
    toggleFrozenCanvasNode,
    selectedNodeIds: selectedNodes,
    workspaceLayoutKey,
    persistedViewport: workspaceCanvasLayout?.viewport ?? null,
    persistedNodePositions: workspaceCanvasLayout?.nodePositions ?? EMPTY_PERSISTED_NODE_POSITIONS,
    frozenNodeIds,
    hideInspectorPanel,
    showInspectorPanel,
    toggleInspectorPanel,
  };
}
