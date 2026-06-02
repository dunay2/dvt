/**
 * Owned concern: define route-composition builder inputs for the Canvas shell contract.
 */
import type { CanvasRouteViewState } from './canvasRouteViewState';
import type { useCanvasController } from './useCanvasController';

type CanvasRouteController = ReturnType<typeof useCanvasController>;

export type CanvasShellRouteComposerArgs = Readonly<{
  controller: CanvasRouteController;
  routeViewState: CanvasRouteViewState;
}>;

export type CanvasShellLayoutBuilderArgs = Readonly<{
  layoutState: Pick<
    CanvasRouteController,
    | 'focusMode'
    | 'explorerPanelVisible'
    | 'inspectorPanelVisible'
    | 'canOpenSourceImport'
    | 'canvasEmptyStateGuideVisible'
  >;
  recoveryCommands: Pick<CanvasRouteController, 'reloadLatestDraft'> &
    Readonly<{
      refetchDraftAfterAuthRefresh: () => void;
    }>;
  authoringCommands: Pick<
    CanvasRouteController,
    | 'handleCreateAuthoringNode'
    | 'handleCreateCanvasDocument'
    | 'handleSelectCanvasDocument'
    | 'handleApplyCanvasDocumentPatch'
    | 'handleDeleteCanvasDocument'
  >;
  preferenceCommands: Pick<CanvasRouteController, 'setCanvasEmptyStateGuideVisible'>;
  routePresentation: Pick<
    CanvasRouteViewState,
    | 'presentationState'
    | 'workspaceScope'
    | 'draftAccessPosture'
    | 'startupBlockState'
    | 'draftTransportError'
    | 'workbenchErrorMessage'
    | 'canvasDocument'
    | 'canvasDocuments'
    | 'activeCanvasId'
    | 'canCreateCanvasDocument'
    | 'draftSaveStatus'
    | 'availableCanvasKinds'
    | 'canvasTabState'
    | 'effectiveUserPermissions'
    | 'readOnlyState'
  >;
}>;

export type CanvasShellPanelsBuilderArgs = Readonly<{
  panelState: Pick<
    CanvasRouteController,
    | 'explorerNodes'
    | 'inspectorNode'
    | 'inspectorGraphNodes'
    | 'inspectorGraphEdges'
    | 'canEditInspectorNode'
    | 'applyInspectorNodeDraft'
    | 'activeRunId'
    | 'registeredPlugins'
    | 'runtimeCapabilities'
    | 'importedNodeFocusIds'
    | 'executionEnvironmentOptions'
  >;
  userPermissions: CanvasRouteViewState['effectiveUserPermissions'];
  routePresentation: Pick<
    CanvasRouteViewState,
    'canvasDocument' | 'canvasDocuments' | 'activeCanvasId' | 'availableCanvasKinds'
  >;
}>;

export type CanvasShellGraphBuilderArgs = Readonly<{
  graphState: Pick<
    CanvasRouteController,
    | 'nodesWithImpact'
    | 'edges'
    | 'nodeTypes'
    | 'gridSize'
    | 'canvasPalette'
    | 'canvasGridVisible'
    | 'canvasGridColor'
    | 'canvasSnapToGrid'
    | 'canvasEmptyStateGuideVisible'
    | 'viewport'
  >;
}>;

export type CanvasShellToolbarBuilderArgs = Readonly<{
  toolbarState: Pick<
    CanvasRouteController,
    | 'canvasAuthoringMode'
    | 'canPlanGraph'
    | 'canStartRun'
    | 'canExportProjectSnapshot'
    | 'canImportProjectSnapshot'
    | 'planStatusSummary'
    | 'exclusiveOverlayMode'
    | 'canUseCostOverlay'
    | 'impactOverlayEnabled'
    | 'columnLevelLineageEnabled'
    | 'transformationValidation'
  >;
  routePresentation: Pick<CanvasRouteViewState, 'presentationState'>;
}>;

export type CanvasShellGraphCommandsBuilderArgs = Readonly<{
  graphCommands: Pick<
    CanvasRouteController,
    | 'onNodesChange'
    | 'handleNodeDrag'
    | 'handleNodeDragStop'
    | 'onEdgesChange'
    | 'onConnect'
    | 'onReconnect'
    | 'handleNodeClick'
    | 'onSelectionChange'
    | 'handleViewportChange'
    | 'handleDrop'
    | 'handleDragOver'
    | 'handleCreateAuthoringNode'
    | 'handleSourceImportComplete'
    | 'handleImportedNodeFocusComplete'
  >;
}>;

export type CanvasShellChromeCommandsBuilderArgs = Readonly<{
  chromeCommands: Pick<
    CanvasRouteController,
    | 'hideExplorerPanel'
    | 'showExplorerPanel'
    | 'hideInspectorPanel'
    | 'showInspectorPanel'
    | 'handleAutoLayout'
    | 'handleToggleCostOverlay'
    | 'toggleImpactOverlay'
    | 'toggleColumnLevelLineage'
    | 'canvasGridVisible'
    | 'canvasSnapToGrid'
    | 'setCanvasGridVisible'
    | 'setCanvasGridColor'
    | 'setCanvasSnapToGrid'
    | 'setCanvasEmptyStateGuideVisible'
    | 'handleExportProjectSnapshot'
    | 'handleImportProjectSnapshotFile'
    | 'reloadLatestDraft'
    | 'handlePlan'
    | 'handleStartRun'
  >;
}>;
