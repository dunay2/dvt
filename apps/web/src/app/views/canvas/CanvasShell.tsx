/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import SourceImportWizard from '../../components/SourceImportWizard';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { CanvasContextMenuView } from './CanvasContextMenuView';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { CanvasProjectExplorerDialog } from './CanvasProjectExplorerDialog';
import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { useCanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type {
  CanvasShellContextualWorkbench,
  CanvasShellOpenDataRegistryCommand,
  CanvasShellProps,
  CanvasShellSourceImportPlacement,
} from './canvasShell.types';

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
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [contextualWorkbenchId, setContextualWorkbenchId] = useState<'project-code' | null>(null);
  const [dataRegistryInitialSelection, setDataRegistryInitialSelection] =
    useState<Parameters<CanvasShellOpenDataRegistryCommand>[0]>(undefined);
  const [dataRegistryPlacement, setDataRegistryPlacement] = useState<
    CanvasShellSourceImportPlacement | undefined
  >(undefined);
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
          <CodeWorkbench />
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
  const handleOpenDataRegistry: CanvasShellOpenDataRegistryCommand | undefined = canOpenDataRegistry
    ? (initialSelection, placement) => {
        setDataRegistryInitialSelection(initialSelection);
        setDataRegistryPlacement(placement);
        setDataRegistryOpen(true);
      }
    : undefined;
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: canEditGraph,
    canOpenSourceImport: canOpenDataRegistry,
    canOpenProjectExplorer: true,
    canOpenProjectCode: true,
    canPreviewExecutionPlan: panels.userPermissions.canPlan && chromeState.canPlanGraph,
    canOpenCanvasSettings: true,
    authoringNodeKinds: panels.authoringNodeKinds,
    screenToFlowPosition: canvasContextScreenToFlowPosition ?? ((screenPosition) => screenPosition),
    onCreateAuthoringNode: graphCommands.onCreateAuthoringNode,
    onEdgesChange: graphCommands.onEdgesChange,
    onOpenSourceImport:
      handleOpenDataRegistry == null
        ? undefined
        : (flowPosition) =>
            handleOpenDataRegistry(
              undefined,
              flowPosition == null ? undefined : { canvasPosition: flowPosition }
            ),
    onOpenProjectExplorer: () => setProjectExplorerOpen(true),
    onOpenProjectCode: () => setContextualWorkbenchId('project-code'),
    onPreviewExecutionPlan: chromeCommands.onPlan,
    onOpenCanvasSettings: () => setCanvasSettingsOpen(true),
  });

  useEffect(() => {
    if (!canOpenDataRegistry && dataRegistryOpen) {
      setDataRegistryOpen(false);
      setDataRegistryInitialSelection(undefined);
      setDataRegistryPlacement(undefined);
    }
  }, [canOpenDataRegistry, dataRegistryOpen]);

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
          onPreviewExecutionPlan={chromeCommands.onPlan}
        />
      )}
      <CanvasShellMainPanel
        layout={shellLayout}
        panels={panels}
        graph={graph}
        chromeState={chromeState}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        onOpenSourceImport={handleOpenDataRegistry}
        onOpenProjectExplorer={() => setProjectExplorerOpen(true)}
        onOpenProjectCode={() => setContextualWorkbenchId('project-code')}
        onOpenCanvasSettings={() => setCanvasSettingsOpen(true)}
        contextMenuPresenter={contextMenuPresenter}
      />
      <CanvasContextMenuView
        model={contextMenuPresenter.model}
        menuRef={contextMenuPresenter.menuRef}
        onCanvasAction={contextMenuPresenter.handleCanvasAction}
        onCreateNodeAction={contextMenuPresenter.handleCreateNodeAction}
        onEdgeAction={contextMenuPresenter.handleEdgeAction}
      />

      <SourceImportWizard
        open={dataRegistryOpen}
        onClose={() => {
          setDataRegistryOpen(false);
          setDataRegistryInitialSelection(undefined);
          setDataRegistryPlacement(undefined);
        }}
        onComplete={(result) => graphCommands.onSourceImportComplete(result, dataRegistryPlacement)}
        sourceImportOptions={sourceImportOptions}
        initialSelection={dataRegistryInitialSelection}
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
