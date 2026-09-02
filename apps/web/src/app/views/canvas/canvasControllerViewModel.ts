/** Owned concern: project Canvas controller state into a shell-ready view model. */
import { type NodeTypes } from '@xyflow/react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import type { CanvasSurfaceStrategy } from '../../plugins/canvasSurfaceStrategyContracts';
import type { CanvasGraphAuthoringMode } from '../../plugins/nodeTypeContracts';
import { getAllCanvasKinds, getRegisteredPluginIds } from '../../plugins/registry';
import type { CanvasRuntimePolicy } from './canvasRuntimePolicy';
import type { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import type { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import type { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import type { useCanvasExecutionActions } from './useCanvasExecutionActions';
import type { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import type { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
import type { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import type { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import type { useCanvasOverlayModel } from './useCanvasOverlayModel';
import type { useCanvasExecutionSelectionRecovery } from './useCanvasExecutionSelectionRecovery';
import {
  listProjectCanvasDocuments,
  resolveActiveProjectCanvasId,
} from './canvasProjectCanvasLifecycle';

const canvasControllerNodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

type CanvasControllerEnvironment = ReturnType<typeof useCanvasControllerEnvironment>;
type CanvasAuthoringRuntime = ReturnType<typeof useCanvasAuthoringRuntime>;
type CanvasLayoutPersistence = ReturnType<typeof useCanvasLayoutPersistence>;
type CanvasMutationHandlers = ReturnType<typeof useCanvasMutationHandlers>;
type CanvasGraphHandlers = ReturnType<typeof useCanvasGraphHandlers>;
type CanvasOverlayModel = ReturnType<typeof useCanvasOverlayModel>;
type CanvasExecutionActions = ReturnType<typeof useCanvasExecutionActions>;
type CanvasControllerReadModel = ReturnType<typeof useCanvasControllerReadModel>;
type CanvasInspectorCommands = ReturnType<typeof useCanvasInspectorCommands>;
type CanvasExecutionSelectionRecovery = ReturnType<typeof useCanvasExecutionSelectionRecovery>;
type CanvasControllerGraphPolicy = {
  canvasAuthoringMode: CanvasGraphAuthoringMode;
  runtimePolicy: CanvasRuntimePolicy;
  surfaceStrategy: CanvasSurfaceStrategy | null;
};

type CanvasControllerViewModelArgs = {
  environment: CanvasControllerEnvironment;
  authoringRuntime: CanvasAuthoringRuntime;
  persistence: CanvasLayoutPersistence;
  mutationHandlers: CanvasMutationHandlers;
  graphHandlers: CanvasGraphHandlers;
  overlayModel: CanvasOverlayModel;
  executionActions: CanvasExecutionActions;
  graphPolicy: CanvasControllerGraphPolicy;
  readModel: CanvasControllerReadModel;
  inspectorCommands: CanvasInspectorCommands;
  executionSelectionRecovery: CanvasExecutionSelectionRecovery;
  handleImpactFocusNodeChange: (nodeId: string | null) => void;
};

function resolveCanvasGraphErrorMessage(authoringRuntime: CanvasAuthoringRuntime): string | null {
  const graphError = authoringRuntime.graphModel.graphAuthorityQuery.error;
  return graphError instanceof Error ? graphError.message : null;
}

function resolveRouteDraftRecord({
  draftReadModel,
  draftSession,
}: Pick<CanvasAuthoringRuntime, 'draftReadModel' | 'draftSession'>) {
  if (draftReadModel?.record != null) {
    return draftReadModel.record;
  }

  if (draftReadModel?.accessMode === 'forbidden' || draftReadModel?.formatError != null) {
    return null;
  }

  return draftSession.baseline.record;
}

function buildCanvasShellViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: { applicationLanguage, capabilities, store },
    graphPolicy: { canvasAuthoringMode, runtimePolicy, surfaceStrategy },
    authoringRuntime: {
      backendPosture,
      graphModel,
      visibleScope,
      draftReadModel,
      draftSession,
      canCreateCanvasDocument,
    },
    overlayModel,
    readModel: { nodesWithImpact, edgesWithImpact, inspectorNode },
  } = args;
  const routeDraftRecord = resolveRouteDraftRecord({ draftReadModel, draftSession });
  const routeDraft = routeDraftRecord?.draft ?? null;

  return {
    workspaceLayoutKey: store.workspaceLayoutKey,
    workspaceScope: args.environment.sessionContext.getWorkspaceScopeSnapshot(),
    isBackendCheckPending: backendPosture.isBackendCheckPending,
    backendReady: backendPosture.backendReady,
    backendBlockMessage: backendPosture.backendBlockMessage,
    isLoadingGraph: graphModel.graphAuthorityQuery.isPending,
    graphErrorMessage: resolveCanvasGraphErrorMessage(args.authoringRuntime),
    focusMode: store.focusMode,
    inspectorPanelVisible: store.inspectorPanelVisible,
    inspectorNode,
    inspectorPreferredTabId: store.inspectorPreferredTabId,
    inspectorPreferredTabRequestId: store.inspectorPreferredTabRequestId,
    inspectorGraphNodes: graphModel.canonicalNodes,
    inspectorGraphEdges: visibleScope.canonicalEdges,
    activeRunId: overlayModel.activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    runtimeCapabilities: capabilities,
    availableCanvasKinds: getAllCanvasKinds(capabilities, applicationLanguage),
    canvasDocument: routeDraft?.canvas ?? null,
    canvasDocuments: listProjectCanvasDocuments(routeDraft),
    activeCanvasId: resolveActiveProjectCanvasId(routeDraft),
    executionEnvironmentOptions: args.environment.workspaceBootstrapConfig.environmentOptions,
    canCreateCanvasDocument: canCreateCanvasDocument && routeDraftRecord == null,
    authorizationPermissions: store.userPermissions,
    userPermissions: {
      ...store.userPermissions,
      canPlan: runtimePolicy.commands.canPlan,
      canRun: runtimePolicy.commands.canRun,
      canEditEdges: runtimePolicy.commands.canMutateGraph,
    },
    canvasAuthoringMode,
    canvasSurfaceStrategy: surfaceStrategy,
    canOpenSourceImport: runtimePolicy.commands.canOpenSourceImport,
    nodesWithImpact,
    edges: edgesWithImpact,
    nodeTypes: canvasControllerNodeTypes,
    gridSize: store.gridSize,
    canvasPalette: store.canvasPalette,
    canvasGridVisible: store.canvasGridVisible,
    canvasGridColor: store.canvasGridColor,
    canvasSnapToGrid: store.canvasSnapToGrid,
    canvasEmptyStateGuideVisible: store.canvasEmptyStateGuideVisible,
    viewport: store.persistedViewport,
    frozenNodeIds: store.frozenNodeIds,
    canEditInspectorNode: runtimePolicy.commands.canEditInspectorNode,
    applyInspectorNodeDraft: args.inspectorCommands.applyInspectorNodeDraft,
    convertInspectorVisualTransformToSql:
      args.inspectorCommands.convertInspectorVisualTransformToSql,
  };
}

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
    handleApplyCanvasDocumentPatch: args.authoringRuntime.handleApplyCanvasDocumentPatch,
    handleDeleteCanvasDocument: args.authoringRuntime.handleDeleteCanvasDocument,
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
    setCanvasEmptyStateGuideVisible: store.setCanvasEmptyStateGuideVisible,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
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
