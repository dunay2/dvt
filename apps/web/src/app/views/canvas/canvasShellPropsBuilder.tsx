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
      explorerPanelVisible: controller.explorerPanelVisible,
      inspectorPanelVisible: controller.inspectorPanelVisible,
      canOpenSourceImport: controller.canOpenSourceImport,
    },
    recoveryCommands: {
      reloadLatestDraft: controller.reloadLatestDraft,
    },
    authoringCommands: {
      handleCreateAuthoringNode: controller.handleCreateAuthoringNode,
      handleCreateCanvasDocument: controller.handleCreateCanvasDocument,
    },
    routePresentation: {
      presentationState: routeViewState.presentationState,
      startupBlockState: routeViewState.startupBlockState,
      draftTransportError: routeViewState.draftTransportError,
      workbenchErrorMessage: routeViewState.workbenchErrorMessage,
      canvasDocument: routeViewState.canvasDocument,
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
      explorerNodes: controller.explorerNodes,
      inspectorNode: controller.inspectorNode,
      canEditInspectorNode:
        controller.canEditInspectorNode && routeViewState.effectiveUserPermissions.canEditEdges,
      applyInspectorNodeDraft: controller.applyInspectorNodeDraft,
      activeRunId: controller.activeRunId,
      registeredPlugins: controller.registeredPlugins,
      importedNodeFocusIds: controller.importedNodeFocusIds,
    },
    userPermissions: routeViewState.effectiveUserPermissions,
    routePresentation: {
      canvasDocument: routeViewState.canvasDocument,
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
      canStartRun: controller.canStartRun,
      planStatusSummary: controller.planStatusSummary,
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
      hideExplorerPanel: controller.hideExplorerPanel,
      showExplorerPanel: controller.showExplorerPanel,
      hideInspectorPanel: controller.hideInspectorPanel,
      showInspectorPanel: controller.showInspectorPanel,
      handleAutoLayout: controller.handleAutoLayout,
      handleToggleCostOverlay: controller.handleToggleCostOverlay,
      toggleImpactOverlay: controller.toggleImpactOverlay,
      toggleColumnLevelLineage: controller.toggleColumnLevelLineage,
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
  };
}
