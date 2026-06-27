/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { CanvasContextMenuLayer } from './CanvasContextMenuLayer';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { CanvasProjectExplorerDialog } from './CanvasProjectExplorerDialog';
import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { CanvasSourceImportDialogHost } from './CanvasSourceImportDialogHost';
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
  canvasContextScreenToFlowPosition,
}: CanvasShellProps): JSX.Element {
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [contextualWorkbenchId, setContextualWorkbenchId] = useState<'project-code' | null>(null);
  const bottomDrawerVisible = useUiLayoutStore((state) => state.bottomDrawerVisible);
  const setBottomDrawerHeight = useUiLayoutStore((state) => state.setBottomDrawerHeight);
  const toggleBottomDrawer = useUiLayoutStore((state) => state.toggleBottomDrawer);
  const selectOperationalDrawerTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
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
  const canOpenDataRegistry = canEditGraph && canBrowseDataRegistry;
  const sourceImportDialog = useCanvasSourceImportDialogState(canOpenDataRegistry);
  const contextualWorkbench = useMemo<CanvasShellContextualWorkbench | undefined>(() => {
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
      contextualWorkbench == null
        ? layout
        : {
            ...layout,
            contextualWorkbench,
          },
    [contextualWorkbench, layout]
  );
  const revealValidationProblems = useCallback(() => {
    selectOperationalDrawerTab('problems');
    if (bottomDrawerVisible) {
      setBottomDrawerHeight(160);
      return;
    }

    toggleBottomDrawer();
  }, [bottomDrawerVisible, selectOperationalDrawerTab, setBottomDrawerHeight, toggleBottomDrawer]);
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: canEditGraph,
    canOpenSourceImport: canOpenDataRegistry,
    canOpenProjectExplorer: true,
    canOpenProjectCode: true,
    canValidateGraph: panels.userPermissions.canPlan,
    canPreviewExecutionPlan: panels.userPermissions.canPlan && chromeState.canPlanGraph,
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
    onOpenProjectExplorer: () => setProjectExplorerOpen(true),
    onOpenProjectCode: () => setContextualWorkbenchId('project-code'),
    onValidateGraph: revealValidationProblems,
    onPreviewExecutionPlan: chromeCommands.onPreviewExecutionPlan,
    onOpenCanvasSettings: () => setCanvasSettingsOpen(true),
  });

  return (
    <ResizablePanelGroup
      data-slot="canvas-shell-panel-group"
      direction="horizontal"
      className="h-full min-w-0"
    >
      {layout.surfaceStrategy == null ? null : (
        <CanvasOperationalDrawerContributionRegistrar
          policy={layout.surfaceStrategy.operationalDrawer}
          panels={panels}
          chromeState={chromeState}
          onPreviewExecutionPlan={chromeCommands.onPreviewExecutionPlan}
          onStartRun={chromeCommands.onRun}
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
        onOpenProjectExplorer={() => setProjectExplorerOpen(true)}
        onOpenProjectCode={() => setContextualWorkbenchId('project-code')}
        onOpenCanvasSettings={() => setCanvasSettingsOpen(true)}
        contextMenuPresenter={contextMenuPresenter}
      />
      <CanvasContextMenuLayer presenter={contextMenuPresenter} />

      <CanvasSourceImportDialogHost
        open={sourceImportDialog.open}
        onClose={sourceImportDialog.close}
        onComplete={graphCommands.onSourceImportComplete}
        sourceImportOptions={sourceImportOptions}
        initialSelection={sourceImportDialog.initialSelection}
        placement={sourceImportDialog.placement}
      />
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
    </ResizablePanelGroup>
  );
}
