/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
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

const CodeWorkbench = lazy(() => import('../CodeView'));

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
  onDbtProjectImported,
}: CanvasShellProps): JSX.Element {
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [dbtProjectImportOpen, setDbtProjectImportOpen] = useState(false);
  const [contextualWorkbenchId, setContextualWorkbenchId] = useState<'project-code' | null>(null);
  const openProjectCodeWorkbench = useCallback(() => setContextualWorkbenchId('project-code'), []);
  const openProjectExplorer = useCallback(() => setProjectExplorerOpen(true), []);
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
  const internalContextualWorkbench = useMemo<CanvasShellContextualWorkbench | undefined>(() => {
    if (contextualWorkbenchId !== 'project-code') {
      return undefined;
    }

    return {
      id: 'project-code',
      title: 'Project code',
      description: 'Workspace files in the active project scope.',
      onClose: () => setContextualWorkbenchId(null),
      panel: (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
              Loading project code...
            </div>
          }
        >
          <CodeWorkbench publishRouteBootstrap={false} />
        </Suspense>
      ),
    };
  }, [contextualWorkbenchId]);
  const shellLayout = useMemo(
    () =>
      internalContextualWorkbench == null
        ? layout
        : {
            ...layout,
            contextualWorkbench: internalContextualWorkbench,
          },
    [internalContextualWorkbench, layout]
  );
  const onOpenProjectCode = workspaceCommands?.onOpenProjectCode ?? openProjectCodeWorkbench;
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
