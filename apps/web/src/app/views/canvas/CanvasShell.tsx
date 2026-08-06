/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { CanvasContextMenuLayer } from './CanvasContextMenuLayer';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { CanvasProjectExplorerDialog } from './CanvasProjectExplorerDialog';
import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { CanvasSourceImportDialogHost } from './CanvasSourceImportDialogHost';
import { DbtProjectImportDialog } from '../../components/dbtProjectImport/DbtProjectImportDialog';
import { useCanvasSourceImportDialogState } from './useCanvasSourceImportDialogState';
import { useCanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type { CanvasShellContextualWorkbench, CanvasShellProps } from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import { useCanvasRouteIntentHandler } from './useCanvasRouteIntentHandler';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';

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
  routeIntentRequest,
  canvasContextScreenToFlowPosition,
  onDbtProjectImported,
}: CanvasShellProps): JSX.Element {
  const copy = resolveCanvasViewCopy();
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [dbtProjectImportOpen, setDbtProjectImportOpen] = useState(false);
  const contextualWorkbenchId = useCanvasInteractionStore((state) => state.contextualWorkbenchId);
  const contextualWorkbenchOwnerKey = useCanvasInteractionStore(
    (state) => state.contextualWorkbenchOwnerKey
  );
  const openContextualWorkbench = useCanvasInteractionStore(
    (state) => state.openContextualWorkbench
  );
  const closeContextualWorkbench = useCanvasInteractionStore(
    (state) => state.closeContextualWorkbench
  );
  const activeContextualWorkbenchOwnerKey =
    layout.surfaceStrategy == null || panels.activeCanvasId == null
      ? null
      : `${layout.surfaceStrategy.id}:${panels.activeCanvasId}`;
  const scopedContextualWorkbenchId =
    contextualWorkbenchOwnerKey === activeContextualWorkbenchOwnerKey
      ? contextualWorkbenchId
      : null;
  const codeWorkbenchRef = useRef<SqlContextWorkbenchHandle>(null);
  const openProjectCodeWorkbench = useCallback(() => {
    if (activeContextualWorkbenchOwnerKey != null) {
      openContextualWorkbench('project-code', activeContextualWorkbenchOwnerKey);
    }
  }, [activeContextualWorkbenchOwnerKey, openContextualWorkbench]);
  const openProjectExplorer = useCallback(() => setProjectExplorerOpen(true), []);
  const restoreProjectExplorerFocus = useCallback(() => {
    document
      .querySelector<HTMLButtonElement>('[data-slot="shell-workspace-menu-trigger"]')
      ?.focus({ preventScroll: true });
  }, []);
  const openDbtProjectImport = useCallback(() => setDbtProjectImportOpen(true), []);
  const openCanvasSettings = useCallback(() => setCanvasSettingsOpen(true), []);
  const canEditGraph = panels.userPermissions.canEditEdges;
  const sourceImportContributions = useMemo(
    () => getSourceImportContributions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const sourceImportOptions = useMemo(
    () => getSourceImportOptions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const canBrowseDataRegistry = layout.canOpenSourceImport && sourceImportContributions.length > 0;
  const canOpenDataRegistry = canBrowseDataRegistry;
  const sourceImportDialog = useCanvasSourceImportDialogState(canOpenDataRegistry);
  useEffect(() => {
    if (contextualWorkbenchId != null && scopedContextualWorkbenchId == null) {
      closeContextualWorkbench();
    }
  }, [closeContextualWorkbench, contextualWorkbenchId, scopedContextualWorkbenchId]);
  const internalContextualWorkbench = useMemo<CanvasShellContextualWorkbench | undefined>(() => {
    if (scopedContextualWorkbenchId !== 'project-code') {
      return undefined;
    }

    return {
      id: 'project-code',
      title: copy.sqlContextWorkbenchProjectTitle,
      closeLabel: copy.nodeWorkbenchCloseLabel,
      moveLabel: copy.sqlContextWorkbenchMoveLabel,
      description: copy.sqlContextWorkbenchProjectDescription,
      requestClose: async () => {
        const flushed = (await codeWorkbenchRef.current?.flush()) ?? true;
        if (flushed) {
          closeContextualWorkbench();
        }
      },
      panel: (
        <SqlContextWorkbench
          ref={codeWorkbenchRef}
          loadingMessage={copy.sqlContextWorkbenchLoadingMessage}
        />
      ),
    };
  }, [
    scopedContextualWorkbenchId,
    copy.nodeWorkbenchCloseLabel,
    copy.sqlContextWorkbenchLoadingMessage,
    copy.sqlContextWorkbenchMoveLabel,
    copy.sqlContextWorkbenchProjectDescription,
    copy.sqlContextWorkbenchProjectTitle,
    closeContextualWorkbench,
  ]);
  const shellLayout = useMemo(
    () =>
      layout.contextualWorkbench != null || internalContextualWorkbench == null
        ? layout
        : {
            ...layout,
            contextualWorkbench: internalContextualWorkbench,
          },
    [internalContextualWorkbench, layout]
  );
  const onOpenProjectCode = workspaceCommands?.onOpenProjectCode ?? openProjectCodeWorkbench;
  useCanvasRouteIntentHandler({
    request: routeIntentRequest ?? null,
    columnLevelLineageEnabled: chromeState.columnLevelLineageEnabled,
    canOpenProjectCode: activeContextualWorkbenchOwnerKey != null,
    onOpenProjectCode,
    onToggleColumnLevelLineage: chromeCommands.onToggleColumns,
  });
  const onOpenProjectExplorer =
    workspaceCommands?.canOpenProjectExplorer === false ? undefined : openProjectExplorer;
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: canEditGraph,
    canOpenSourceImport: canOpenDataRegistry,
    canOpenCanvasSettings: true,
    authoringNodeKinds: panels.authoringNodeKinds,
    screenToFlowPosition: canvasContextScreenToFlowPosition ?? ((screenPosition) => screenPosition),
    onCreateAuthoringNode: graphCommands.onCreateAuthoringNode,
    onEdgesChange: graphCommands.onEdgesChange,
    onOpenSourceImport:
      sourceImportDialog.openCommand == null
        ? undefined
        : (flowPosition) =>
            sourceImportDialog.openCommand?.(
              undefined,
              flowPosition == null ? undefined : { canvasPosition: flowPosition }
            ),
    onOpenCanvasSettings: openCanvasSettings,
  });

  return (
    <ResizablePanelGroup
      data-slot="canvas-shell-panel-group"
      id="canvas-shell-horizontal-panels"
      direction="horizontal"
      className="h-full min-w-0"
    >
      {layout.surfaceStrategy?.operationalDrawer == null ? null : (
        <CanvasOperationalDrawerContributionRegistrar
          policy={layout.surfaceStrategy.operationalDrawer}
          panels={panels}
          chromeState={chromeState}
          runControls={runControls}
          onPreviewExecutionPlan={chromeCommands.onPreviewExecutionPlan}
          onStartRun={chromeCommands.onRun}
          selectionRecoveryCommands={chromeCommands.executionSelectionRecovery}
        />
      )}
      <CanvasShellMainPanel
        layout={shellLayout}
        panels={panels}
        graph={graph}
        chromeState={chromeState}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        onOpenSourceImport={sourceImportDialog.openCommand}
        onOpenProjectExplorer={onOpenProjectExplorer}
        onOpenProjectCode={onOpenProjectCode}
        onImportDbtProject={onDbtProjectImported == null ? undefined : openDbtProjectImport}
        onOpenCanvasSettings={openCanvasSettings}
        contextMenuPresenter={contextMenuPresenter}
      />
      <CanvasContextMenuLayer presenter={contextMenuPresenter} />

      {panels.activeCanvasId != null ? (
        <CanvasSourceImportDialogHost
          open={sourceImportDialog.open}
          canvasId={panels.activeCanvasId}
          onClose={sourceImportDialog.close}
          onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
          onComplete={graphCommands.onSourceImportComplete}
          sourceImportOptions={sourceImportOptions}
          initialSelection={sourceImportDialog.initialSelection}
          placement={sourceImportDialog.placement}
        />
      ) : null}
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
        canvasGridVisible={graph.canvasGridVisible}
        canvasGridColor={graph.canvasGridColor}
        canvasSnapToGrid={graph.canvasSnapToGrid}
        canvasEmptyStateGuideVisible={graph.canvasEmptyStateGuideVisible}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
        onSetCanvasEmptyStateGuideVisible={chromeCommands.onSetCanvasEmptyStateGuideVisible}
        onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
        onClose={() => setCanvasSettingsOpen(false)}
      />
      <DbtProjectImportDialog
        open={dbtProjectImportOpen}
        onClose={() => setDbtProjectImportOpen(false)}
        onImported={(result) => {
          setDbtProjectImportOpen(false);
          onDbtProjectImported?.(result);
        }}
      />
    </ResizablePanelGroup>
  );
}
