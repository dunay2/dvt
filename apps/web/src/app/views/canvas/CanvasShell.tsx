/** Owned concern: compose the Canvas shell from route-owned presentation contracts. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { DbtProjectImportDialog } from '../../components/dbtProjectImport/DbtProjectImportDialog';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { CanvasModelEditor } from './CanvasModelEditor';
import { CanvasProjectExplorerDialog } from './CanvasProjectExplorerDialog';
import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { CanvasSourceImportDialogHost } from './CanvasSourceImportDialogHost';
import { useCanvasSourceImportDialogState } from './useCanvasSourceImportDialogState';
import { useCanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type { CanvasShellOpenDataRegistryCommand, CanvasShellProps } from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { buildCanvasInspectorCodeContributions } from './graphDraftWorkspaceFileCodeContribution';
import { projectCanvasShellNodes } from './canvasShellNodeProjection';
import { useCanvasNodeDataSample } from './useCanvasNodeDataSample';
import { useCanvasOutputExpressionInspection } from './useCanvasOutputExpressionInspection';
import { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import { useCanvasModelSelection } from './useCanvasModelSelection';
import { useCanvasCodeWorkbench } from './useCanvasCodeWorkbench';
import { useCanvasOperationDataTab } from './useCanvasOperationDataTab';

export default function CanvasShell({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
  canvasCommands,
  runControls,
  workspaceCommands,
  canvasContextScreenToFlowPosition,
  sourceImportInitialSelection,
  onSourceImportInitialSelectionConsumed,
  onDbtProjectImported,
  warehouseSourceDataSampleQuery,
  canvasTransformDataSampleQuery,
  prepareModelPreview,
  runSnapshot,
}: CanvasShellProps): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(language);
  const semanticCopy = resolveCanvasSemanticEditorCopy(language);
  const focus = useCanvasWorkbenchFocus();
  const model = useCanvasModelSelection(panels.activeCanvasId, panels.inspectorGraphNodes, focus);
  const code = useCanvasCodeWorkbench(
    layout,
    panels.activeCanvasId,
    copy,
    focus,
    workspaceCommands
  );
  const operationData = useCanvasOperationDataTab(semanticCopy);
  const outputInspection = useCanvasOutputExpressionInspection(
    panels.activeCanvasId,
    panels.inspectorGraphNodes
  );
  const { dataSampleTabs, projectNode, openSource } = useCanvasNodeDataSample({
    activeCanvasId: panels.activeCanvasId,
    nodes: graph.nodesWithImpact,
    canonicalNodes: panels.inspectorGraphNodes,
    canonicalEdges: panels.inspectorGraphEdges,
    canEditModel: panels.relationalTreeAuthoring?.canEditNode === true,
    warehouseSourceDataSampleQuery,
    canvasTransformDataSampleQuery,
    prepareModelPreview,
  });
  const nodes = useMemo(
    () =>
      projectCanvasShellNodes(graph.nodesWithImpact, {
        modelIds: model.modelIds,
        openModel: model.open,
        inspectOutput: outputInspection.open,
        previewLabel: semanticCopy.previewAction,
        projectSample: projectNode,
        runSnapshot,
      }),
    [
      graph.nodesWithImpact,
      model.modelIds,
      model.open,
      outputInspection.open,
      semanticCopy.previewAction,
      projectNode,
      runSnapshot,
    ]
  );
  const presentedGraph = useMemo(() => ({ ...graph, nodesWithImpact: nodes }), [graph, nodes]);
  const { inspectorNode, inspectorWorkbenchContributions } = panels;
  const inspectorContributions = useMemo(
    () =>
      buildCanvasInspectorCodeContributions(
        { inspectorNode, inspectorWorkbenchContributions },
        graph.nodesWithImpact
      ),
    [inspectorNode, inspectorWorkbenchContributions, graph.nodesWithImpact]
  );
  const presentedPanels = useMemo(
    () => ({ ...panels, inspectorWorkbenchContributions: inspectorContributions }),
    [panels, inspectorContributions]
  );

  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [dbtProjectImportOpen, setDbtProjectImportOpen] = useState(false);
  const openProjectExplorer = useCallback(() => setProjectExplorerOpen(true), []);
  const openDbtProjectImport = useCallback(() => setDbtProjectImportOpen(true), []);
  const openCanvasSettings = useCallback(() => setCanvasSettingsOpen(true), []);
  const restoreProjectExplorerFocus = useCallback(() => {
    document
      .querySelector<HTMLButtonElement>('[data-slot="shell-workspace-menu-trigger"]')
      ?.focus({ preventScroll: true });
  }, []);
  const sourceImportOptions = useMemo(
    () => getSourceImportOptions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const sourceImportContributions = useMemo(
    () => getSourceImportContributions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const canOpenDataRegistry = layout.canOpenSourceImport && sourceImportContributions.length > 0;
  const sourceImportDialog = useCanvasSourceImportDialogState(canOpenDataRegistry);
  useEffect(() => {
    if (sourceImportInitialSelection != null)
      sourceImportDialog.openCommand?.(sourceImportInitialSelection);
  }, [sourceImportDialog.openCommand, sourceImportInitialSelection]);
  const openSourceImport = useMemo<CanvasShellOpenDataRegistryCommand | undefined>(() => {
    const open = sourceImportDialog.openCommand;
    return open == null
      ? undefined
      : (initialSelection, placement) =>
          open(initialSelection ?? sourceImportInitialSelection, placement);
  }, [sourceImportDialog.openCommand, sourceImportInitialSelection]);
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: panels.userPermissions.canEditEdges,
    canOpenSourceImport: canOpenDataRegistry,
    canOpenCanvasSettings: true,
    authoringNodeKinds: panels.authoringNodeKinds,
    screenToFlowPosition: canvasContextScreenToFlowPosition ?? ((position) => position),
    onCreateAuthoringNode: graphCommands.onCreateAuthoringNode,
    onEdgesChange: graphCommands.onEdgesChange,
    onSetEdgeExecutionGate: graphCommands.onSetEdgeExecutionGate,
    onOpenSourceImport:
      sourceImportDialog.openCommand == null
        ? undefined
        : (position) =>
            sourceImportDialog.openCommand?.(
              undefined,
              position == null ? undefined : { canvasPosition: position }
            ),
    onOpenCanvasSettings: openCanvasSettings,
  });
  const modelData = nodes.find((node) => node.id === model.selected?.id)?.data as
    DbtNodeData | undefined;

  return (
    <ResizablePanelGroup
      data-slot="canvas-shell-panel-group"
      id="canvas-shell-horizontal-panels"
      direction="horizontal"
      className="h-full min-w-0"
    >
      {layout.surfaceStrategy?.operationalDrawer == null ? null : (
        <CanvasOperationalDrawerContributionRegistrar
          policy={{
            ...layout.surfaceStrategy.operationalDrawer,
            tabs: layout.surfaceStrategy.operationalDrawer.tabs.filter((tab) => tab !== 'semantic'),
          }}
          panels={panels}
          chromeState={chromeState}
          runControls={runControls}
          onPreviewExecutionPlan={chromeCommands.onPreviewExecutionPlan}
          onStartRun={chromeCommands.onRun}
          selectionRecoveryCommands={chromeCommands.executionSelectionRecovery}
          dataSampleTabs={dataSampleTabs}
          operationDataTab={model.selected == null ? undefined : operationData.tab}
        />
      )}
      <CanvasShellMainPanel
        layout={
          model.selected == null || panels.activeCanvasId == null
            ? {
                ...code.layout,
                contextualWorkbench: outputInspection.workbench ?? code.layout.contextualWorkbench,
              }
            : {
                ...code.layout,
                inspectorPanelVisible: model.active ? false : code.layout.inspectorPanelVisible,
                contextualWorkbench: model.active
                  ? undefined
                  : (outputInspection.workbench ?? code.layout.contextualWorkbench),
                centerSurfaceVisible: model.active,
                centerSurface: (
                  <CanvasModelEditor
                    key={`${panels.activeCanvasId}:${model.selected.id}`}
                    canvasId={panels.activeCanvasId}
                    transformNode={model.selected}
                    nodes={panels.inspectorGraphNodes}
                    edges={panels.inspectorGraphEdges}
                    authoring={
                      panels.relationalTreeAuthoring == null
                        ? undefined
                        : {
                            ...panels.relationalTreeAuthoring,
                            onMapInput: modelData?.onMapCanvasInput,
                            onRemoveInput: modelData?.onRemoveCanvasInput,
                          }
                    }
                    draftStatus={chromeState.draftStatusState}
                    query={canvasTransformDataSampleQuery}
                    onExecuteSource={openSource}
                    preparePreview={prepareModelPreview}
                    operationDataHost={operationData.host}
                    onOpenOperationData={operationData.open}
                    active={model.active}
                    onSelect={() => model.setActive(true)}
                    onShowCanvas={() => model.setActive(false)}
                    onClose={model.close}
                  />
                ),
              }
        }
        panels={presentedPanels}
        graph={presentedGraph}
        chromeState={chromeState}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        onOpenSourceImport={openSourceImport}
        onOpenProjectExplorer={
          workspaceCommands?.canOpenProjectExplorer === false ? undefined : openProjectExplorer
        }
        onOpenProjectCode={code.openProjectCode}
        onImportDbtProject={onDbtProjectImported == null ? undefined : openDbtProjectImport}
        onOpenCanvasSettings={openCanvasSettings}
        onOpenModelEditor={model.open}
        contextMenuPresenter={contextMenuPresenter}
      />
      {panels.activeCanvasId == null ? null : (
        <CanvasSourceImportDialogHost
          open={sourceImportDialog.open}
          canvasId={panels.activeCanvasId}
          onClose={sourceImportDialog.close}
          onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
          onComplete={(result, placement) => {
            graphCommands.onSourceImportComplete(result, placement);
            if (sourceImportInitialSelection?.kind === 'dbt-source-binding')
              onSourceImportInitialSelectionConsumed?.();
          }}
          sourceImportOptions={sourceImportOptions}
          initialSelection={sourceImportDialog.initialSelection}
          placement={sourceImportDialog.placement}
        />
      )}
      <CanvasProjectExplorerDialog
        open={projectExplorerOpen}
        activeCanvasId={panels.activeCanvasId}
        canvasDocuments={panels.canvasDocuments}
        onSelectCanvas={canvasCommands.onSelectCanvas}
        onClose={() => setProjectExplorerOpen(false)}
        onRestoreFocus={restoreProjectExplorerFocus}
      />
      <CanvasSettingsDialog
        open={canvasSettingsOpen}
        impactOverlayEnabled={chromeState.impactOverlayEnabled}
        columnLevelLineageEnabled={chromeState.columnLevelLineageEnabled}
        canUseCostOverlay={chromeState.canUseCostOverlay}
        costOverlayEnabled={chromeState.exclusiveOverlayMode === 'cost'}
        gridSize={graph.gridSize}
        canvasPalette={graph.canvasPalette}
        canvasGridVisible={graph.canvasGridVisible}
        canvasGridColor={graph.canvasGridColor}
        canvasSnapToGrid={graph.canvasSnapToGrid}
        canAutoLayout={panels.userPermissions.canEditEdges}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onGridSizeChange={chromeCommands.onGridSizeChange}
        onCanvasPaletteChange={chromeCommands.onCanvasPaletteChange}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
        onAutoLayout={chromeCommands.onAutoLayout}
        onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
        onClose={() => setCanvasSettingsOpen(false)}
      />
      <DbtProjectImportDialog
        open={dbtProjectImportOpen}
        onClose={() => setDbtProjectImportOpen(false)}
        onRestoreFocus={restoreProjectExplorerFocus}
        onImported={(result, declarations) => {
          setDbtProjectImportOpen(false);
          onDbtProjectImported?.(result, declarations);
        }}
      />
    </ResizablePanelGroup>
  );
}
