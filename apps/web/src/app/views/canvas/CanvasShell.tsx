/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 * @baseline GH-3622: opening project files from File must return focus to the same owner.
 * @decision Preserve existing dialogs, commands and route state; change only the recovery target.
 * @consequence Scope recovery remains Project and no shell menu authors graph state.
 * @version 1.0.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CanvasProjectFilesExplorer } from './explorer/CanvasProjectFilesExplorer';
import { CanvasProjectElementsExplorer } from './explorer/CanvasProjectElementsExplorer';
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
import { CanvasCodeRouteEntry } from './CanvasCodeRouteEntry';
import { useCanvasOperationDataTab } from './useCanvasOperationDataTab';
import styles from './CanvasShell.module.css';

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
  const openModel = useCallback(
    (nodeId: string) => {
      if (!model.modelIds.has(nodeId)) return;
      code.showCanvas();
      model.open(nodeId);
    },
    [code.showCanvas, model.modelIds, model.open]
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
        openModel,
        inspectOutput: outputInspection.open,
        previewLabel: semanticCopy.previewAction,
        projectSample: projectNode,
        runSnapshot,
      }),
    [
      graph.nodesWithImpact,
      model.modelIds,
      openModel,
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
  const openProjectCode = useCallback(
    async (path?: string): Promise<boolean> => {
      if (!(await code.openProjectCode(path))) return false;
      model.setActive(false);
      void outputInspection.workbench?.requestClose();
      return true;
    },
    [code.openProjectCode, model.setActive, outputInspection.workbench]
  );
  const openProjectExplorer = useCallback(() => setProjectExplorerOpen(true), []);
  const openDbtProjectImport = useCallback(() => setDbtProjectImportOpen(true), []);
  const openCanvasSettings = useCallback(() => setCanvasSettingsOpen(true), []);
  const restoreProjectExplorerFocus = useCallback(() => {
    document
      .querySelector<HTMLButtonElement>('[data-slot="shell-file-menu-trigger"]')
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
  const sourceImportScope = panels.inspectorAuthoring.workspaceScope;
  const sourceImportOwnerKey = JSON.stringify([
    sourceImportScope?.tenantId,
    sourceImportScope?.projectId,
    sourceImportScope?.environmentId,
    panels.activeCanvasId,
  ]);
  const sourceImportDialog = useCanvasSourceImportDialogState(
    canOpenDataRegistry,
    sourceImportOwnerKey
  );
  const retainedSelectionOwner = useRef({
    selection: sourceImportInitialSelection,
    ownerKey: sourceImportOwnerKey,
  });
  if (retainedSelectionOwner.current.selection !== sourceImportInitialSelection)
    retainedSelectionOwner.current = {
      selection: sourceImportInitialSelection,
      ownerKey: sourceImportOwnerKey,
    };
  const retainedInitialSelection =
    retainedSelectionOwner.current.ownerKey === sourceImportOwnerKey
      ? sourceImportInitialSelection
      : undefined;
  useEffect(() => {
    if (retainedInitialSelection != null)
      sourceImportDialog.openCommand?.({
        intent: 'import-sources',
        initialSelection: retainedInitialSelection,
      });
  }, [sourceImportDialog.openCommand, retainedInitialSelection]);
  const openSourceImport = useMemo<CanvasShellOpenDataRegistryCommand | undefined>(() => {
    const open = sourceImportDialog.openCommand;
    return open == null
      ? undefined
      : (request = { intent: 'import-sources' }) =>
          open(
            request.intent === 'manage-connections'
              ? request
              : {
                  ...request,
                  initialSelection: request.initialSelection ?? retainedInitialSelection,
                }
          );
  }, [sourceImportDialog.openCommand, retainedInitialSelection]);
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
            sourceImportDialog.openCommand?.({
              intent: 'import-sources',
              ...(position == null ? {} : { placement: { canvasPosition: position } }),
            }),
    onOpenCanvasSettings: openCanvasSettings,
  });
  const modelData = nodes.find((node) => node.id === model.selected?.id)?.data as
    DbtNodeData | undefined;

  return (
    <ResizablePanelGroup
      data-slot="canvas-shell-panel-group"
      id="canvas-shell-horizontal-panels"
      direction="horizontal"
      className={styles.workspace}
    >
      <CanvasCodeRouteEntry
        ownerKey={
          panels.activeCanvasId == null || layout.surfaceStrategy == null
            ? null
            : `${layout.surfaceStrategy.id}:${panels.activeCanvasId}`
        }
        onOpen={openProjectCode}
      />
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
        projectFiles={
          panels.activeCanvasId == null || layout.surfaceStrategy == null
            ? undefined
            : {
                projectRoot: workspaceCommands?.projectRoot,
                tree: (
                  <CanvasProjectFilesExplorer
                    projectRoot={workspaceCommands?.projectRoot}
                    onOpenFile={(path) => void openProjectCode(path)}
                  />
                ),
                panel:
                  code.layout.contextualWorkbench?.id === 'project-code'
                    ? code.layout.contextualWorkbench.panel
                    : undefined,
                active: code.active,
                onActivate: openProjectCode,
                onCanvas: code.showCanvas,
                onClose: code.active ? code.layout.contextualWorkbench?.requestClose : undefined,
                renderElements: (input) => (
                  <CanvasProjectElementsExplorer
                    {...input}
                    projectRoot={workspaceCommands?.projectRoot}
                  />
                ),
              }
        }
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
                    workspaceScope={panels.inspectorAuthoring?.workspaceScope}
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
                    active={model.active && !code.active}
                    onSelect={() => {
                      code.showCanvas();
                      model.setActive(true);
                    }}
                    onShowCanvas={() => {
                      code.showCanvas();
                      model.setActive(false);
                    }}
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
        onOpenProjectCode={() => {
          void openProjectCode();
        }}
        onImportDbtProject={onDbtProjectImported == null ? undefined : openDbtProjectImport}
        onOpenCanvasSettings={openCanvasSettings}
        onOpenModelEditor={openModel}
        contextMenuPresenter={contextMenuPresenter}
        workspaceTask={
          panels.activeCanvasId == null ||
          !sourceImportDialog.open ||
          sourceImportDialog.request == null ? null : (
            <CanvasSourceImportDialogHost
              open={sourceImportDialog.open}
              canvasId={panels.activeCanvasId}
              onClose={() => {
                if (
                  sourceImportDialog.request != null &&
                  sourceImportDialog.isCurrent(sourceImportDialog.request)
                )
                  sourceImportDialog.close();
              }}
              onRestoreFocus={
                sourceImportDialog.request.intent === 'import-sources'
                  ? contextMenuPresenter.restoreContextMenuOpenerFocus
                  : () => {
                      if (sourceImportDialog.request != null)
                        sourceImportDialog.restoreFocus(sourceImportDialog.request);
                    }
              }
              onComplete={(result, placement) => {
                const request = sourceImportDialog.request;
                if (request?.intent !== 'import-sources' || !sourceImportDialog.isCurrent(request))
                  return;
                graphCommands.onSourceImportComplete(result, placement);
                if (request.initialSelection?.kind === 'dbt-source-binding')
                  onSourceImportInitialSelectionConsumed?.();
              }}
              sourceImportOptions={sourceImportOptions}
              entry={sourceImportDialog.request}
              placement={
                sourceImportDialog.request.intent === 'import-sources'
                  ? sourceImportDialog.request.placement
                  : undefined
              }
            />
          )
        }
      />
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
