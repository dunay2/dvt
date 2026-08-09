/** Owned concern: compose Canvas chrome state, viewport, and center-surface overlay inside the main shell panel. */
import { CanvasGraphStatusOverlay } from './CanvasGraphStatusOverlay';
import {
  CanvasShellContextualWorkbenchSplit,
  CanvasShellMainPanelFrame,
  CanvasShellOverlayCenterSurfaceFrame,
  CanvasShellReadOnlyBannerSlot,
} from './CanvasShellMainPanelFrame';
import { CanvasNodeWorkbenchOverlay } from './CanvasNodeWorkbenchOverlay';
import { isCanvasNodeWorkbenchVisible } from './canvasNodeWorkbenchVisibility';
import { CanvasViewMenuContributionRegistrar } from './CanvasViewMenuControls';
import CanvasViewport from './CanvasViewport';
import { CanvasWorkspaceMenuContributionRegistrar } from './CanvasWorkspaceMenuControls';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type {
  CanvasShellChromeCommands,
  CanvasShellChromeState,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellOpenDataRegistryCommand,
  CanvasShellPanels,
} from './canvasShell.types';

function resolveCanvasShellMainPanelDefaultSize(): number {
  return 100;
}

type CanvasShellMainPanelProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  chromeState: CanvasShellChromeState;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
  onOpenSourceImport?: CanvasShellOpenDataRegistryCommand;
  onOpenProjectExplorer?: () => void;
  onOpenProjectCode?: () => void;
  onImportDbtProject?: () => void;
  onOpenCanvasSettings?: () => void;
  contextMenuPresenter: CanvasContextMenuPresenter;
}>;

function CanvasShellMenuContributionRegistrars({
  panels,
  graph,
  chromeState,
  chromeCommands,
  onOpenProjectExplorer,
  onOpenProjectCode,
  onImportDbtProject,
}: Pick<
  CanvasShellMainPanelProps,
  | 'panels'
  | 'graph'
  | 'chromeState'
  | 'chromeCommands'
  | 'onOpenProjectExplorer'
  | 'onOpenProjectCode'
  | 'onImportDbtProject'
>): JSX.Element {
  return (
    <>
      <CanvasViewMenuContributionRegistrar
        canEditEdges={panels.userPermissions.canEditEdges}
        canUseCostOverlay={chromeState.canUseCostOverlay}
        exclusiveOverlayMode={chromeState.exclusiveOverlayMode}
        impactOverlayEnabled={chromeState.impactOverlayEnabled}
        columnLevelLineageEnabled={chromeState.columnLevelLineageEnabled}
        canvasGridVisible={graph.canvasGridVisible}
        canvasGridColor={graph.canvasGridColor}
        canvasSnapToGrid={graph.canvasSnapToGrid}
        canvasEmptyStateGuideVisible={graph.canvasEmptyStateGuideVisible}
        onAutoLayout={chromeCommands.onAutoLayout}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
        onSetCanvasEmptyStateGuideVisible={chromeCommands.onSetCanvasEmptyStateGuideVisible}
      />
      <CanvasWorkspaceMenuContributionRegistrar
        activeCanvas={panels.activeCanvas}
        canExportProjectSnapshot={chromeState.canExportProjectSnapshot}
        canImportProjectSnapshot={chromeState.canImportProjectSnapshot}
        canOpenProjectExplorer={typeof onOpenProjectExplorer === 'function'}
        canOpenProjectCode={typeof onOpenProjectCode === 'function'}
        canImportDbtProject={typeof onImportDbtProject === 'function'}
        onExportProjectSnapshot={chromeCommands.onExportProjectSnapshot}
        onImportProjectSnapshotFile={chromeCommands.onImportProjectSnapshotFile}
        onOpenProjectExplorer={onOpenProjectExplorer}
        onOpenProjectCode={onOpenProjectCode}
        onImportDbtProject={onImportDbtProject}
      />
    </>
  );
}

function CanvasShellViewport({
  layout,
  panels,
  graph,
  graphCommands,
  onOpenSourceImport,
  onOpenCanvasSettings,
  contextMenuPresenter,
}: Pick<
  CanvasShellMainPanelProps,
  | 'layout'
  | 'panels'
  | 'graph'
  | 'graphCommands'
  | 'onOpenSourceImport'
  | 'onOpenCanvasSettings'
  | 'contextMenuPresenter'
>): JSX.Element {
  const nodeWorkbenchVisible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy: layout.surfaceStrategy,
    hasInspectorNode: panels.inspectorNode != null,
  });

  return (
    <CanvasViewport
      canEditEdges={panels.userPermissions.canEditEdges}
      canMoveNodes={layout.canMoveNodes}
      canSelectNodes={layout.canSelectNodes}
      nodesWithImpact={graph.nodesWithImpact}
      edges={graph.edges}
      nodeTypes={graph.nodeTypes}
      gridSize={graph.gridSize}
      canvasPalette={graph.canvasPalette}
      canvasGridVisible={graph.canvasGridVisible}
      canvasGridColor={graph.canvasGridColor}
      canvasSnapToGrid={graph.canvasSnapToGrid}
      viewport={graph.viewport}
      frozenNodeIds={graph.frozenNodeIds}
      onToggleFrozenNode={graphCommands.onToggleFrozenNode}
      onNodesChange={graphCommands.onNodesChange}
      onNodeDrag={graphCommands.onNodeDrag}
      onNodeDragStop={graphCommands.onNodeDragStop}
      onEdgesChange={graphCommands.onEdgesChange}
      onConnect={graphCommands.onConnect}
      onReconnect={graphCommands.onReconnect}
      onViewportChange={graphCommands.onViewportChange}
      onDrop={graphCommands.onDrop}
      onDragOver={graphCommands.onDragOver}
      authoringNodeKinds={panels.authoringNodeKinds}
      onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}
      importedNodeFocusIds={panels.importedNodeFocusIds}
      onImportedNodeFocusComplete={graphCommands.onImportedNodeFocusComplete}
      canOpenSourceImport={typeof onOpenSourceImport === 'function'}
      onOpenSourceImport={
        onOpenSourceImport == null
          ? undefined
          : (flowPosition) =>
              onOpenSourceImport(
                undefined,
                flowPosition == null ? undefined : { canvasPosition: flowPosition }
              )
      }
      canOpenCanvasSettings={typeof onOpenCanvasSettings === 'function'}
      onOpenCanvasSettings={onOpenCanvasSettings}
      contextMenuPresenter={contextMenuPresenter}
      externalNodeSurfaceActive={nodeWorkbenchVisible || layout.contextualWorkbench != null}
    />
  );
}

function CanvasShellMainSurface({
  layout,
  panels,
  graph,
  graphCommands,
  onOpenSourceImport,
  onOpenCanvasSettings,
  contextMenuPresenter,
}: Pick<
  CanvasShellMainPanelProps,
  | 'layout'
  | 'panels'
  | 'graph'
  | 'graphCommands'
  | 'onOpenSourceImport'
  | 'onOpenCanvasSettings'
  | 'contextMenuPresenter'
>): JSX.Element {
  const viewport = (
    <CanvasShellViewport
      layout={layout}
      panels={panels}
      graph={graph}
      graphCommands={graphCommands}
      onOpenSourceImport={onOpenSourceImport}
      onOpenCanvasSettings={onOpenCanvasSettings}
      contextMenuPresenter={contextMenuPresenter}
    />
  );

  const baseSurface =
    layout.centerSurface == null ? (
      viewport
    ) : layout.centerSurfaceMode === 'replace' ? (
      <>{layout.centerSurface}</>
    ) : (
      <CanvasShellOverlayCenterSurfaceFrame
        viewport={viewport}
        centerSurface={layout.centerSurface}
      />
    );

  if (layout.contextualWorkbench == null) {
    return baseSurface;
  }

  return (
    <CanvasShellContextualWorkbenchSplit
      baseSurface={baseSurface}
      title={layout.contextualWorkbench.title}
      closeLabel={layout.contextualWorkbench.closeLabel}
      moveLabel={layout.contextualWorkbench.moveLabel}
      description={layout.contextualWorkbench.description}
      onClose={() => void layout.contextualWorkbench?.requestClose()}
    >
      {layout.contextualWorkbench.panel}
    </CanvasShellContextualWorkbenchSplit>
  );
}

function CanvasShellNodeWorkbenchOverlay({
  layout,
  panels,
  graph,
  chromeCommands,
}: Pick<
  CanvasShellMainPanelProps,
  'layout' | 'panels' | 'graph' | 'chromeCommands'
>): JSX.Element | null {
  const inspectorNodeId = panels.inspectorNode?.id;
  const inspectorNodeData = graph.nodesWithImpact.find((node) => node.id === inspectorNodeId)
    ?.data as DbtNodeData | undefined;
  const openNodeCode = inspectorNodeData?.onOpenNodeCode;

  return (
    <CanvasNodeWorkbenchOverlay
      layout={layout}
      panels={panels}
      onHide={chromeCommands.onHideInspector}
      onOpenNodeCode={
        inspectorNodeId != null && typeof openNodeCode === 'function'
          ? () => openNodeCode(inspectorNodeId)
          : undefined
      }
    />
  );
}

export function CanvasShellMainPanel({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
  onOpenSourceImport,
  onOpenProjectExplorer,
  onOpenProjectCode,
  onImportDbtProject,
  onOpenCanvasSettings,
  contextMenuPresenter,
}: CanvasShellMainPanelProps): JSX.Element {
  const shouldShowGraphStatusOverlay =
    layout.centerSurface == null || layout.centerSurfaceMode === 'overlay';

  return (
    <CanvasShellMainPanelFrame defaultSize={resolveCanvasShellMainPanelDefaultSize()}>
      <CanvasShellMenuContributionRegistrars
        panels={panels}
        graph={graph}
        chromeState={chromeState}
        chromeCommands={chromeCommands}
        onOpenProjectExplorer={onOpenProjectExplorer}
        onOpenProjectCode={onOpenProjectCode}
        onImportDbtProject={onImportDbtProject}
      />
      {layout.readOnlyBanner ? (
        <CanvasShellReadOnlyBannerSlot>{layout.readOnlyBanner}</CanvasShellReadOnlyBannerSlot>
      ) : null}
      <CanvasShellMainSurface
        layout={layout}
        panels={panels}
        graph={graph}
        graphCommands={graphCommands}
        onOpenSourceImport={onOpenSourceImport}
        onOpenCanvasSettings={onOpenCanvasSettings}
        contextMenuPresenter={contextMenuPresenter}
      />
      {shouldShowGraphStatusOverlay ? (
        <CanvasGraphStatusOverlay
          activeCanvas={panels.activeCanvas}
          draftStatusState={chromeState.draftStatusState}
          onReloadLatestDraft={chromeCommands.onReloadLatestDraft}
        />
      ) : null}
      {layout.contextualWorkbench == null ? (
        <CanvasShellNodeWorkbenchOverlay
          layout={layout}
          panels={panels}
          graph={graph}
          chromeCommands={chromeCommands}
        />
      ) : null}
    </CanvasShellMainPanelFrame>
  );
}
