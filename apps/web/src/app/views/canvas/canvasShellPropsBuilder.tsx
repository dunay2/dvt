/**
 * Owned concern: build the route-owned CanvasShell contract from controller and route posture.
 */
import { buildCanvasShellChromeCommands } from './canvasShellChromeCommandsBuilder';
import { buildCanvasShellGraphCommands } from './canvasShellGraphCommandsBuilder';
import { buildCanvasShellGraph } from './canvasShellGraphBuilder';
import { buildCanvasShellLayout } from './canvasShellLayoutBuilder';
import { buildCanvasShellPanels } from './canvasShellPanelsBuilder';
import { buildCanvasShellToolbar } from './canvasShellToolbarBuilder';
import type {
  CanvasShellChromeCommandsBuilderArgs,
  CanvasShellGraphBuilderArgs,
  CanvasShellGraphCommandsBuilderArgs,
  CanvasShellLayoutBuilderArgs,
  CanvasShellPanelsBuilderArgs,
  CanvasShellRouteComposerArgs,
  CanvasShellToolbarBuilderArgs,
} from './canvasShellBuilder.types';
import type { CanvasShellProps } from './canvasShell.types';

function buildCanvasShellLayoutArgs({
  controller,
  routeViewState,
}: CanvasShellRouteComposerArgs): CanvasShellLayoutBuilderArgs {
  return {
    layoutState: {
      focusMode: controller.focusMode,
      inspectorPanelVisible: controller.inspectorPanelVisible,
      canOpenSourceImport: controller.canOpenSourceImport,
      canvasEmptyStateGuideVisible: controller.canvasEmptyStateGuideVisible,
      canvasSurfaceStrategy: controller.canvasSurfaceStrategy,
    },
    recoveryCommands: {
      reloadLatestDraft: controller.reloadLatestDraft,
      // The API client owns token refresh; Canvas only re-enters the protected draft port.
      refetchDraftAfterAuthRefresh: () => {
        controller.reloadLatestDraft();
      },
    },
    authoringCommands: {
      handleCreateAuthoringNode: controller.handleCreateAuthoringNode,
      handleCreateCanvasDocument: controller.handleCreateCanvasDocument,
      handleSelectCanvasDocument: controller.handleSelectCanvasDocument,
      handleApplyCanvasDocumentPatch: controller.handleApplyCanvasDocumentPatch,
      handleDeleteCanvasDocument: controller.handleDeleteCanvasDocument,
    },
    preferenceCommands: {
      setCanvasEmptyStateGuideVisible: controller.setCanvasEmptyStateGuideVisible,
    },
    routePresentation: {
      presentationState: routeViewState.presentationState,
      workspaceScope: routeViewState.workspaceScope,
      draftAccessPosture: routeViewState.draftAccessPosture,
      startupBlockState: routeViewState.startupBlockState,
      draftTransportError: routeViewState.draftTransportError,
      workbenchErrorMessage: routeViewState.workbenchErrorMessage,
      canvasDocument: routeViewState.canvasDocument,
      canvasDocuments: routeViewState.canvasDocuments,
      activeCanvasId: routeViewState.activeCanvasId,
      canCreateCanvasDocument: routeViewState.canCreateCanvasDocument,
      draftSaveStatus: routeViewState.draftSaveStatus,
      availableCanvasKinds: routeViewState.availableCanvasKinds,
      canvasTabState: routeViewState.canvasTabState,
      effectiveUserPermissions: routeViewState.effectiveUserPermissions,
      readOnlyState: routeViewState.readOnlyState,
    },
  };
}

function buildCanvasShellPanelsArgs({
  controller,
  routeViewState,
}: CanvasShellRouteComposerArgs): CanvasShellPanelsBuilderArgs {
  return {
    panelState: {
      inspectorNode: controller.inspectorNode,
      inspectorPreferredTabId: controller.inspectorPreferredTabId,
      inspectorNodeSelectedForExecution: controller.inspectorNodeSelectedForExecution,
      inspectorGraphNodes: controller.inspectorGraphNodes,
      inspectorGraphEdges: controller.inspectorGraphEdges,
      canEditInspectorNode:
        controller.canEditInspectorNode && routeViewState.effectiveUserPermissions.canEditEdges,
      applyInspectorNodeDraft: controller.applyInspectorNodeDraft,
      handleDuplicateNode: controller.handleDuplicateNode,
      handleToggleNodeSelection: controller.handleToggleNodeSelection,
      handleRemoveNode: controller.handleRemoveNode,
      activeRunId: controller.activeRunId,
      registeredPlugins: controller.registeredPlugins,
      runtimeCapabilities: controller.runtimeCapabilities,
      importedNodeFocusIds: controller.importedNodeFocusIds,
      executionEnvironmentOptions: controller.executionEnvironmentOptions,
    },
    userPermissions: routeViewState.effectiveUserPermissions,
    routePresentation: {
      canvasDocument: routeViewState.canvasDocument,
      canvasDocuments: routeViewState.canvasDocuments,
      activeCanvasId: routeViewState.activeCanvasId,
      availableCanvasKinds: routeViewState.availableCanvasKinds,
    },
  };
}

function buildCanvasShellGraphArgs({
  controller,
}: CanvasShellRouteComposerArgs): CanvasShellGraphBuilderArgs {
  return {
    graphState: {
      nodesWithImpact: controller.nodesWithImpact,
      edges: controller.edges,
      nodeTypes: controller.nodeTypes,
      gridSize: controller.gridSize,
      canvasPalette: controller.canvasPalette,
      canvasGridVisible: controller.canvasGridVisible,
      canvasGridColor: controller.canvasGridColor,
      canvasSnapToGrid: controller.canvasSnapToGrid,
      canvasEmptyStateGuideVisible: controller.canvasEmptyStateGuideVisible,
      viewport: controller.viewport,
    },
  };
}

function buildCanvasShellToolbarArgs({
  controller,
  routeViewState,
}: CanvasShellRouteComposerArgs): CanvasShellToolbarBuilderArgs {
  return {
    toolbarState: {
      canvasAuthoringMode: controller.canvasAuthoringMode,
      canPlanGraph: controller.canPlanGraph,
      canStartRun: controller.canStartRun,
      canExportProjectSnapshot: controller.canExportProjectSnapshot,
      canImportProjectSnapshot: controller.canImportProjectSnapshot,
      planStatusSummary: controller.planStatusSummary,
      planRunReadiness: controller.planRunReadiness,
      exclusiveOverlayMode: controller.exclusiveOverlayMode,
      canUseCostOverlay: controller.canUseCostOverlay,
      impactOverlayEnabled: controller.impactOverlayEnabled,
      columnLevelLineageEnabled: controller.columnLevelLineageEnabled,
      transformationValidation: controller.transformationValidation,
    },
    routePresentation: {
      presentationState: routeViewState.presentationState,
    },
  };
}

function buildCanvasShellGraphCommandsArgs({
  controller,
}: CanvasShellRouteComposerArgs): CanvasShellGraphCommandsBuilderArgs {
  return {
    graphCommands: {
      onNodesChange: controller.onNodesChange,
      handleNodeDrag: controller.handleNodeDrag,
      handleNodeDragStop: controller.handleNodeDragStop,
      onEdgesChange: controller.onEdgesChange,
      onConnect: controller.onConnect,
      onReconnect: controller.onReconnect,
      handleNodeClick: controller.handleNodeClick,
      onSelectionChange: controller.onSelectionChange,
      handleViewportChange: controller.handleViewportChange,
      handleDrop: controller.handleDrop,
      handleDragOver: controller.handleDragOver,
      handleCreateAuthoringNode: controller.handleCreateAuthoringNode,
      handleSourceImportComplete: controller.handleSourceImportComplete,
      handleImportedNodeFocusComplete: controller.handleImportedNodeFocusComplete,
    },
  };
}

function buildCanvasShellChromeCommandsArgs({
  controller,
}: CanvasShellRouteComposerArgs): CanvasShellChromeCommandsBuilderArgs {
  return {
    chromeCommands: {
      hideInspectorPanel: controller.hideInspectorPanel,
      showInspectorPanel: controller.showInspectorPanel,
      handleAutoLayout: controller.handleAutoLayout,
      handleToggleCostOverlay: controller.handleToggleCostOverlay,
      toggleImpactOverlay: controller.toggleImpactOverlay,
      toggleColumnLevelLineage: controller.toggleColumnLevelLineage,
      canvasGridVisible: controller.canvasGridVisible,
      canvasSnapToGrid: controller.canvasSnapToGrid,
      setCanvasGridVisible: controller.setCanvasGridVisible,
      setCanvasGridColor: controller.setCanvasGridColor,
      setCanvasSnapToGrid: controller.setCanvasSnapToGrid,
      setCanvasEmptyStateGuideVisible: controller.setCanvasEmptyStateGuideVisible,
      handleExportProjectSnapshot: controller.handleExportProjectSnapshot,
      handleImportProjectSnapshotFile: controller.handleImportProjectSnapshotFile,
      reloadLatestDraft: controller.reloadLatestDraft,
      handlePlan: controller.handlePlan,
      handleStartRun: controller.handleStartRun,
    },
  };
}

export function buildCanvasShellProps(args: CanvasShellRouteComposerArgs): CanvasShellProps {
  return {
    layout: buildCanvasShellLayout(buildCanvasShellLayoutArgs(args)),
    panels: buildCanvasShellPanels(buildCanvasShellPanelsArgs(args)),
    graph: buildCanvasShellGraph(buildCanvasShellGraphArgs(args)),
    toolbar: buildCanvasShellToolbar(buildCanvasShellToolbarArgs(args)),
    graphCommands: buildCanvasShellGraphCommands(buildCanvasShellGraphCommandsArgs(args)),
    chromeCommands: buildCanvasShellChromeCommands(buildCanvasShellChromeCommandsArgs(args)),
    canvasCommands: {
      onSelectCanvas: (canvasId) => {
        void args.controller.handleSelectCanvasDocument(canvasId);
      },
      onApplyCanvasPatch: (patch) => {
        void args.controller.handleApplyCanvasDocumentPatch(patch);
      },
      onDeleteActiveCanvas: () => {
        void args.controller.handleDeleteCanvasDocument();
      },
    },
  };
}
