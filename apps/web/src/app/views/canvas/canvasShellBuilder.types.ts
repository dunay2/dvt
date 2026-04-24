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
  >;
  recoveryCommands: Pick<CanvasRouteController, 'reloadLatestDraft'>;
  authoringCommands: Pick<
    CanvasRouteController,
    'handleCreateAuthoringNode' | 'handleCreateCanvasDocument'
  >;
  routePresentation: Pick<
    CanvasRouteViewState,
    | 'presentationState'
    | 'startupBlockState'
    | 'draftTransportError'
    | 'workbenchErrorMessage'
    | 'canvasDocument'
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
    | 'activeRunId'
    | 'registeredPlugins'
    | 'importedNodeFocusIds'
  >;
  userPermissions: CanvasRouteViewState['effectiveUserPermissions'];
}>;

export type CanvasShellGraphBuilderArgs = Readonly<{
  graphState: Pick<
    CanvasRouteController,
    'nodesWithImpact' | 'edges' | 'nodeTypes' | 'gridSize' | 'canvasPalette' | 'viewport'
  >;
}>;

export type CanvasShellToolbarBuilderArgs = Readonly<{
  toolbarState: Pick<
    CanvasRouteController,
    | 'canvasAuthoringMode'
    | 'canStartRun'
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
    | 'handleNodeDragStop'
    | 'onEdgesChange'
    | 'onConnect'
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
    | 'reloadLatestDraft'
    | 'handlePlan'
    | 'handleStartRun'
  >;
}>;
