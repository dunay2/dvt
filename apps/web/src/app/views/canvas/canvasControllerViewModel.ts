/** Owned concern: bind Canvas commands and lifecycle state to the shell context DTO. */
import { buildCanvasShellViewModel, type CanvasShellViewModelArgs } from './canvasShellViewModel';
import type { useCanvasExecutionActions } from './useCanvasExecutionActions';
import type { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import type { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import type { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import type { useCanvasExecutionSelectionRecovery } from './useCanvasExecutionSelectionRecovery';

type CanvasControllerViewModelArgs = CanvasShellViewModelArgs &
  Readonly<{
    persistence: ReturnType<typeof useCanvasLayoutPersistence>;
    mutationHandlers: ReturnType<typeof useCanvasMutationHandlers>;
    graphHandlers: ReturnType<typeof useCanvasGraphHandlers>;
    executionActions: ReturnType<typeof useCanvasExecutionActions>;
    executionSelectionRecovery: ReturnType<typeof useCanvasExecutionSelectionRecovery>;
    handleImpactFocusNodeChange: (nodeId: string | null) => void;
  }>;
function buildCanvasInteractionViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: { store },
    persistence,
    mutationHandlers,
    graphHandlers,
    overlayModel,
    authoringRuntime: { handleCreateCanvasDocument },
    readModel,
  } = args;

  return {
    onNodesChange: mutationHandlers.handleNodesChange,
    onEdgesChange: readModel.handleEdgesChange,
    onConnect: graphHandlers.onConnect,
    onReconnect: graphHandlers.onReconnect,
    onSetEdgeExecutionGate: graphHandlers.setExecutionGate,
    handleViewportChange: persistence.handleViewportChange,
    handleNodeDrag: persistence.handleNodeDrag,
    handleNodeDragStop: persistence.handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
    handleToggleFrozenNode: (nodeId: string) =>
      store.toggleFrozenCanvasNode(store.workspaceLayoutKey, nodeId),
    handleCreateAuthoringNode: graphHandlers.handleCreateAuthoringNode,
    handleDuplicateNode: graphHandlers.handleDuplicateNode,
    handleToggleNodeSelection: graphHandlers.handleToggleNodeSelection,
    handleRemoveNode: graphHandlers.handleRemoveNode,
    handleCreateCanvasDocument,
    handleSelectCanvasDocument: args.authoringRuntime.handleSelectCanvasDocument,
    handleExportProjectSnapshot: args.authoringRuntime.handleExportProjectSnapshot,
    handleImportProjectSnapshotFile: args.authoringRuntime.handleImportProjectSnapshotFile,
    handleSourceImportComplete: mutationHandlers.handleSourceImportComplete,
    importedNodeFocusIds: mutationHandlers.importedNodeFocusIds,
    handleImportedNodeFocusComplete: mutationHandlers.handleImportedNodeFocusComplete,
    handleImpactFocusNodeChange: args.handleImpactFocusNodeChange,
    hideInspectorPanel: store.hideInspectorPanel,
    showInspectorPanel: store.showInspectorPanel,
    handleAutoLayout: graphHandlers.handleAutoLayout,
    handleToggleCostOverlay: overlayModel.handleToggleCostOverlay,
    toggleImpactOverlay: store.toggleImpactOverlay,
    toggleColumnLevelLineage: store.toggleColumnLevelLineage,
    setGridSize: store.setGridSize,
    setCanvasPalette: store.setCanvasPalette,
    setCanvasGridVisible: store.setCanvasGridVisible,
    setCanvasGridColor: store.setCanvasGridColor,
    setCanvasSnapToGrid: store.setCanvasSnapToGrid,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
  };
}

function buildCanvasExecutionViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: { store },
    executionActions,
    graphPolicy: { runtimePolicy },
    readModel: { transformationValidation },
  } = args;

  return {
    handlePreviewExecutionPlan: executionActions.handlePreviewExecutionPlan,
    handleStartRun: executionActions.handleStartRun,
    canPlanGraph: executionActions.canPlanGraph,
    canStartRun: executionActions.canStartRun && runtimePolicy.commands.canRun,
    planStatusSummary: executionActions.planStatusSummary,
    planRunReadiness: executionActions.planRunReadiness,
    latestPreviewOutcome: executionActions.latestPreviewOutcome,
    isCurrentPlanStale: executionActions.isCurrentPlanStale,
    transformationValidation,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    currentPlan: store.currentPlan,
    executionSelectionRecovery: args.executionSelectionRecovery.model,
    executionSelectionRecoveryCommands: args.executionSelectionRecovery.commands,
  };
}

function buildCanvasDraftViewModel(args: CanvasControllerViewModelArgs) {
  const {
    authoringRuntime: {
      draftSession,
      draftAuthTransportPosture,
      draftAccessPosture,
      draftSaveStatus,
      draftAccessMode,
      draftCapabilityReason,
      draftFormatError,
      draftFormatMeta,
      reloadLatestDraft,
      isMissingRemoteDraft,
      isStaleDraftConflict,
      hasDraftProjectionGap,
      draftRecoveryReason,
      draftStatusState,
      canExportProjectSnapshot,
      canImportProjectSnapshot,
    },
  } = args;

  return {
    draftSaveStatus,
    flushDraftForExecution: args.authoringRuntime.flushDraftForExecution,
    draftAuthTransportPosture,
    draftAccessPosture,
    draftAccessMode,
    draftCapabilityReason,
    draftFormatError,
    draftFormatMeta,
    draftRecoveryReason,
    draftStatusState,
    canExportProjectSnapshot,
    canImportProjectSnapshot,
    draftConflictRevision:
      draftSession.syncState === 'conflict' ? draftSession.draftRevision : null,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasDraftProjectionGap,
    reloadLatestDraft,
  };
}

export function buildCanvasControllerViewModel(args: CanvasControllerViewModelArgs) {
  return {
    ...buildCanvasShellViewModel(args),
    ...buildCanvasInteractionViewModel(args),
    ...buildCanvasExecutionViewModel(args),
    ...buildCanvasDraftViewModel(args),
  };
}
