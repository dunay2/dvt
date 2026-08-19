/**
 * Owned concern: define route-composition builder inputs for the Canvas shell contract.
 */
import type { CanvasRouteViewState } from './canvasRouteViewState';
import type { useCanvasController } from './useCanvasController';
import type { OperationalDrawerRunControls } from '../../components/shell/operationalDrawerContributionStore';

type CanvasRouteController = ReturnType<typeof useCanvasController>;

export type CanvasShellRouteComposerArgs = Readonly<{
  controller: CanvasRouteController;
  routeViewState: CanvasRouteViewState;
  runControls: OperationalDrawerRunControls | null;
}>;

export type CanvasShellLayoutBuilderArgs = Readonly<{
  layoutState: Pick<
    CanvasRouteController,
    | 'focusMode'
    | 'inspectorPanelVisible'
    | 'canOpenSourceImport'
    | 'canvasEmptyStateGuideVisible'
    | 'canvasSurfaceStrategy'
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
    | 'effectiveUserPermissions'
    | 'readOnlyState'
  >;
}>;

export type CanvasShellPanelsBuilderArgs = Readonly<{
  panelState: Pick<
    CanvasRouteController,
    | 'inspectorNode'
    | 'inspectorPreferredTabId'
    | 'inspectorPreferredTabRequestId'
    | 'inspectorGraphNodes'
    | 'inspectorGraphEdges'
    | 'canEditInspectorNode'
    | 'applyInspectorNodeDraft'
    | 'convertInspectorVisualTransformToSql'
    | 'activeRunId'
    | 'registeredPlugins'
    | 'runtimeCapabilities'
    | 'importedNodeFocusIds'
    | 'executionEnvironmentOptions'
  >;
  userPermissions: CanvasRouteViewState['effectiveUserPermissions'];
  routePresentation: Pick<
    CanvasRouteViewState,
    | 'workspaceScope'
    | 'canvasDocument'
    | 'canvasDocuments'
    | 'activeCanvasId'
    | 'availableCanvasKinds'
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
    | 'frozenNodeIds'
  >;
}>;

export type CanvasShellChromeStateBuilderArgs = Readonly<{
  chromeStateSource: Pick<
    CanvasRouteController,
    | 'canvasAuthoringMode'
    | 'canPlanGraph'
    | 'canStartRun'
    | 'canExportProjectSnapshot'
    | 'canImportProjectSnapshot'
    | 'planStatusSummary'
    | 'planRunReadiness'
    | 'executionSelectionRecovery'
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
    | 'handleViewportChange'
    | 'handleDrop'
    | 'handleDragOver'
    | 'handleToggleFrozenNode'
    | 'handleCreateAuthoringNode'
    | 'handleSourceImportComplete'
    | 'handleImportedNodeFocusComplete'
    | 'handleImpactFocusNodeChange'
  >;
}>;

export type CanvasShellChromeCommandsBuilderArgs = Readonly<{
  chromeCommands: Pick<
    CanvasRouteController,
    | 'hideInspectorPanel'
    | 'showInspectorPanel'
    | 'handleAutoLayout'
    | 'handleToggleCostOverlay'
    | 'toggleImpactOverlay'
    | 'toggleColumnLevelLineage'
    | 'setGridSize'
    | 'setCanvasPalette'
    | 'canvasGridVisible'
    | 'canvasSnapToGrid'
    | 'setCanvasGridVisible'
    | 'setCanvasGridColor'
    | 'setCanvasSnapToGrid'
    | 'setCanvasEmptyStateGuideVisible'
    | 'handleExportProjectSnapshot'
    | 'handleImportProjectSnapshotFile'
    | 'reloadLatestDraft'
    | 'handlePreviewExecutionPlan'
    | 'handleStartRun'
    | 'executionSelectionRecoveryCommands'
  >;
}>;
