/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 * @baseline GH-3765: Code owns file import and the rail owns project context.
 * @decision Compose existing guarded sessions and route-owned commands without duplicate dialogs.
 * @consequence Import returns focus to Code; project navigation never authors graph state.
 * @version 1.0.0
 */
import { useCallback, useMemo, useState } from 'react';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { DbtProjectImportDialog } from '../../components/dbtProjectImport/DbtProjectImportDialog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { useCanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type { CanvasShellProps } from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useCanvasOutputExpressionInspection } from './useCanvasOutputExpressionInspection';
import { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import { useCanvasModelSelection } from './useCanvasModelSelection';
import { CanvasExplorerDocumentsContext } from './explorer/CanvasExplorerDocuments';
import { useCanvasModelBrowser } from './useCanvasModelBrowser';
import { CanvasModelBrowserProvider } from './CanvasModelBrowser';
import { useCanvasCodeWorkbench } from './useCanvasCodeWorkbench';
import { CanvasCodeRouteEntry, type CanvasWorkbenchRouteTarget } from './CanvasCodeRouteEntry';
import { CanvasRunModelRouteEntry } from './CanvasRunModelRouteEntry';
import { useCanvasOperationDataTab } from './useCanvasOperationDataTab';
import { useCanvasShellSourceImport } from './useCanvasShellSourceImport';
import { useCanvasShellGraphPresentation } from './useCanvasShellGraphPresentation';
import {
  buildCanvasModelWorkbenchLayout,
  buildCanvasProjectFilesSurface,
} from './canvasShellWorkbenchSurfaces';
import styles from './CanvasShell.module.css';

export default function CanvasShell({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
  canvasCommands,
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
  const projectRoot = workspaceCommands?.projectRoot;
  const focus = useCanvasWorkbenchFocus();
  const code = useCanvasCodeWorkbench(
    layout,
    panels.activeCanvasId,
    copy,
    focus,
    workspaceCommands,
    panels.inspectorAuthoring.workspaceScope
  );
  const model = useCanvasModelSelection({
    canvasId: panels.activeCanvasId,
    nodes: panels.inspectorGraphNodes,
    focus,
    workspaceScope: panels.inspectorAuthoring.workspaceScope,
    projectRoot,
    onActivate: code.showCanvas,
  });
  const operationData = useCanvasOperationDataTab(semanticCopy);
  const catalogueUnavailable =
    panels.inspectorGraphNodes.length === 0 &&
    ['loading_graph', 'loading_backend', 'blocked_backend', 'error_graph'].includes(
      chromeState.routeState
    );
  const modelBrowser = useCanvasModelBrowser({
    canvasId: panels.activeCanvasId,
    nodes: panels.inspectorGraphNodes,
    model,
    projectRoot,
    catalogueUnavailable,
    inspectorTarget: panels.inspectorTarget,
    showCanvas: code.showCanvas,
    onInspect: graphCommands.onInspectNode,
  });
  const outputInspection = useCanvasOutputExpressionInspection(
    panels.activeCanvasId,
    panels.inspectorGraphNodes
  );
  const openModel = useCallback(
    (nodeId: string) => {
      if (!model.modelIds.has(nodeId)) return;
      model.open(nodeId);
    },
    [model.modelIds, model.open]
  );
  const graphPresentation = useCanvasShellGraphPresentation({
    graph,
    panels,
    runSnapshot,
    warehouseSourceDataSampleQuery,
    canvasTransformDataSampleQuery,
    prepareModelPreview,
    projectRoot,
    filePlacementLayoutKey: layout.filePlacementLayoutKey,
    showCardMetricsLabel: copy.showCardMetricsLabel,
    previewLabel: semanticCopy.previewAction,
    modelIds: model.modelIds,
    openModel,
    inspectOutput: outputInspection.open,
  });

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
  const onWorkbenchEntry = useCallback(
    (target: CanvasWorkbenchRouteTarget) => {
      if (target === 'code') return openProjectCode();
      modelBrowser.onBrowse(target);
    },
    [openProjectCode, modelBrowser.onBrowse]
  );
  const openDbtProjectImport = useCallback(() => setDbtProjectImportOpen(true), []);
  const openCanvasSettings = useCallback(() => setCanvasSettingsOpen(true), []);
  const restoreDbtImportFocus = useCallback(() => {
    const importAction = document.querySelector<HTMLElement>(
      '[data-slot="canvas-workspace-import-dbt-project-command"]'
    );
    const opener =
      importAction != null && importAction.closest('[inert], [hidden]') == null
        ? importAction
        : document.querySelector<HTMLElement>('[data-slot="shell-project-code-command"]');
    opener?.focus({ preventScroll: true });
  }, []);
  const sourceImport = useCanvasShellSourceImport({
    activeCanvasId: panels.activeCanvasId,
    scope: panels.inspectorAuthoring.workspaceScope,
    runtimeCapabilities: panels.runtimeCapabilities,
    canOpenSourceImport: layout.canOpenSourceImport,
    initialSelection: sourceImportInitialSelection,
    onInitialSelectionConsumed: onSourceImportInitialSelectionConsumed,
    onComplete: graphCommands.onSourceImportComplete,
  });
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: panels.userPermissions.canEditEdges,
    canOpenSourceImport: sourceImport.available,
    canOpenCanvasSettings: true,
    authoringNodeKinds: panels.authoringNodeKinds,
    screenToFlowPosition: canvasContextScreenToFlowPosition ?? ((position) => position),
    onCreateAuthoringNode: graphCommands.onCreateAuthoringNode,
    onEdgesChange: graphCommands.onEdgesChange,
    onSetEdgeExecutionGate: graphCommands.onSetEdgeExecutionGate,
    onOpenSourceImport: sourceImport.openFromContext,
    onOpenCanvasSettings: openCanvasSettings,
  });
  const workbenchLayout = buildCanvasModelWorkbenchLayout({
    model,
    code,
    panels,
    nodes: graphPresentation.graph.nodesWithImpact,
    draftStatus: chromeState.draftStatusState,
    query: canvasTransformDataSampleQuery,
    preparePreview: prepareModelPreview,
    operationData,
    openSource: graphPresentation.openSource,
    outputInspection: outputInspection.workbench,
  });
  const projectFiles = buildCanvasProjectFilesSurface({
    code,
    projectRoot,
    openProjectCode,
    openDbtProjectImport: onDbtProjectImported == null ? undefined : openDbtProjectImport,
  });
  const { onAddCanvas, onSelectCanvas } = canvasCommands;
  const explorerDocuments = useMemo(() => {
    if (!panels.activeCanvasId) return null;
    if (workbenchLayout.centerSurfaceVisible === true) return null;
    if (code.active) return null;
    if (modelBrowser.mode != null) return null;
    return {
      activeId: panels.activeCanvasId,
      documents: panels.canvasDocuments,
      onAddCanvas,
      onSelectCanvas,
    };
  }, [
    panels.activeCanvasId,
    panels.canvasDocuments,
    workbenchLayout.centerSurfaceVisible,
    code.active,
    modelBrowser.mode,
    onAddCanvas,
    onSelectCanvas,
  ]);

  return (
    <CanvasModelBrowserProvider
      navigation={modelBrowser}
      selectedId={model.selected?.id}
      active={model.active && !code.active}
      projectRoot={projectRoot}
      onManageConnections={sourceImport.manageConnections}
    >
      <ResizablePanelGroup
        data-slot="canvas-shell-panel-group"
        id="canvas-shell-horizontal-panels"
        direction="horizontal"
        className={styles.workspace}
      >
        <CanvasRunModelRouteEntry
          canvasId={panels.activeCanvasId}
          state={chromeState.routeState}
          nodes={panels.inspectorGraphNodes}
          modelIds={model.modelIds}
          openModel={openModel}
          inspect={graphCommands.onInspectNode}
        />
        {layout.surfaceStrategy?.operationalDrawer == null ? null : (
          <CanvasOperationalDrawerContributionRegistrar
            policy={{
              ...layout.surfaceStrategy.operationalDrawer,
              tabs: layout.surfaceStrategy.operationalDrawer.tabs.filter(
                (tab) => tab !== 'semantic'
              ),
            }}
            panels={panels}
            chromeState={chromeState}
            onPreviewExecutionPlan={chromeCommands.onPreviewExecutionPlan}
            onStartRun={chromeCommands.onRun}
            selectionRecoveryCommands={chromeCommands.executionSelectionRecovery}
            dataSampleTabs={graphPresentation.dataSampleTabs}
            operationDataTab={model.selected == null ? undefined : operationData.tab}
          />
        )}
        <CanvasExplorerDocumentsContext.Provider value={explorerDocuments}>
          <CanvasCodeRouteEntry
            ownerKey={code.ownerKey}
            modelOwnerKey={
              catalogueUnavailable ? null : (modelBrowser.scopeKey ?? panels.activeCanvasId)
            }
            onOpen={onWorkbenchEntry}
          >
            <CanvasShellMainPanel
              projectFiles={projectFiles}
              layout={workbenchLayout}
              panels={graphPresentation.panels}
              graph={graphPresentation.graph}
              chromeState={chromeState}
              graphCommands={graphCommands}
              chromeCommands={chromeCommands}
              onSelectCanvas={canvasCommands.onSelectCanvas}
              onOpenSourceImport={sourceImport.open}
              onOpenProjectCode={
                code.available
                  ? () => {
                      void openProjectCode();
                    }
                  : undefined
              }
              onOpenCanvasSettings={openCanvasSettings}
              onOpenModelEditor={openModel}
              contextMenuPresenter={contextMenuPresenter}
              workspaceTask={sourceImport.renderTask(
                contextMenuPresenter.restoreContextMenuOpenerFocus
              )}
            />
          </CanvasCodeRouteEntry>
        </CanvasExplorerDocumentsContext.Provider>
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
          onRestoreFocus={restoreDbtImportFocus}
          onImported={(result, declarations) => {
            setDbtProjectImportOpen(false);
            onDbtProjectImported?.(result, declarations);
          }}
        />
      </ResizablePanelGroup>
    </CanvasModelBrowserProvider>
  );
}
