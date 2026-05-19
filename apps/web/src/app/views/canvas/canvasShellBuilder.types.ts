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
    'focusMode' | 'explorerPanelVisible' | 'inspectorPanelVisible' | 'canOpenSourceImport'
  >;
  recoveryCommands: Pick<CanvasRouteController, 'reloadLatestDraft'> &
    Readonly<{
      refetchDraftAfterAuthRefresh: () => void;
    }>;
  authoringCommands: Pick<
    CanvasRouteController,
    'handleCreateAuthoringNode' | 'handleCreateCanvasDocument'
  >;
  routePresentation: Pick<
    CanvasRouteViewState,
    | 'presentationState'
    | 'workspaceScope'
    | 'draftAccessPosture'
    | 'startupBlockState'
    | 'draftTransportError'
    | 'workbenchErrorMessage'
    | 'canvasDocument'
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
    | 'canEditInspectorNode'
    | 'applyInspectorNodeDraft'
    | 'activeRunId'
    | 'registeredPlugins'
    | 'importedNodeFocusIds'
  >;
  userPermissions: CanvasRouteViewState['effectiveUserPermissions'];
  routePresentation: Pick<CanvasRouteViewState, 'canvasDocument' | 'availableCanvasKinds'>;
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
    | 'viewport'
  >;
}>;

export type CanvasShellToolbarBuilderArgs = Readonly<{
  toolbarState: Pick<
    CanvasRouteController,
    | 'canvasAuthoringMode'
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
    | 'handleExportProjectSnapshot'
    | 'handleImportProjectSnapshotFile'
    | 'reloadLatestDraft'
    | 'handlePlan'
    | 'handleStartRun'
  >;
}>;
