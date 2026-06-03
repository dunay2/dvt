/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useEffect, useMemo, useState } from 'react';
import DbtExplorer from '../../components/DbtExplorer';
import SourceImportWizard from '../../components/SourceImportWizard';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import type {
  CanvasShellChromeCommands,
  CanvasShellPanels,
  CanvasShellProps,
} from './canvasShell.types';

type CanvasShellExplorerRailProps = Readonly<{
  focusMode: boolean;
  explorerPanelVisible: boolean;
  explorerResourceGroups: CanvasShellPanels['explorerResourceGroups'];
  activeCanvasId: CanvasShellPanels['activeCanvasId'];
  canEditGraph: boolean;
  canOpenSourceImport: boolean;
  onHideExplorer: CanvasShellChromeCommands['onHideExplorer'];
  onOpenDataRegistry?: () => void;
  onSelectCanvas: (canvasId: string) => void;
}>;

function CanvasShellExplorerRail({
  focusMode,
  explorerPanelVisible,
  explorerResourceGroups,
  activeCanvasId,
  canEditGraph,
  canOpenSourceImport,
  onHideExplorer,
  onOpenDataRegistry,
  onSelectCanvas,
}: CanvasShellExplorerRailProps): JSX.Element | null {
  if (focusMode || !explorerPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
        <DbtExplorer
          resourceGroups={explorerResourceGroups}
          canEditGraph={canEditGraph}
          selectedResourceId={activeCanvasId == null ? null : `canvas:${activeCanvasId}`}
          onResourceSelect={(resource) => {
            if (resource.resourceType === 'canvas') {
              const canvasId = resource.id.replace(/^canvas:/, '');
              if (canvasId !== activeCanvasId) {
                onSelectCanvas(canvasId);
              }
            }
          }}
          onHide={onHideExplorer}
          onOpenDataRegistry={canOpenSourceImport ? onOpenDataRegistry : undefined}
        />
      </ResizablePanel>
      <ResizableHandle />
    </>
  );
}

type CanvasShellInspectorRailProps = Readonly<{
  focusMode: boolean;
  inspectorPanelVisible: boolean;
  inspectorNode: CanvasShellPanels['inspectorNode'];
  activeCanvas: CanvasShellPanels['activeCanvas'];
  executionEnvironmentOptions: CanvasShellPanels['executionEnvironmentOptions'];
  canEditCanvas: CanvasShellPanels['canEditCanvas'];
  canDeleteActiveCanvas: CanvasShellPanels['canDeleteActiveCanvas'];
  inspectorGraphNodes: CanvasShellPanels['inspectorGraphNodes'];
  inspectorGraphEdges: CanvasShellPanels['inspectorGraphEdges'];
  inspectorAuthoring: CanvasShellPanels['inspectorAuthoring'];
  activeRunId: CanvasShellPanels['activeRunId'];
  registeredPlugins: CanvasShellPanels['registeredPlugins'];
  onHideInspector: CanvasShellChromeCommands['onHideInspector'];
  onApplyCanvasPatch: CanvasShellProps['canvasCommands']['onApplyCanvasPatch'];
  onDeleteActiveCanvas: CanvasShellProps['canvasCommands']['onDeleteActiveCanvas'];
}>;

function CanvasShellInspectorRail({
  focusMode,
  inspectorPanelVisible,
  inspectorNode,
  activeCanvas,
  executionEnvironmentOptions,
  canEditCanvas,
  canDeleteActiveCanvas,
  inspectorGraphNodes,
  inspectorGraphEdges,
  inspectorAuthoring,
  activeRunId,
  registeredPlugins,
  onHideInspector,
  onApplyCanvasPatch,
  onDeleteActiveCanvas,
}: CanvasShellInspectorRailProps): JSX.Element | null {
  if (focusMode || !inspectorPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizableHandle />
      <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
        <CanvasInspectorPanel
          node={inspectorNode}
          nodes={inspectorGraphNodes}
          edges={inspectorGraphEdges}
          activeRunId={activeRunId}
          registeredPlugins={registeredPlugins}
          onHide={onHideInspector}
          authoring={inspectorAuthoring}
          canvas={
            activeCanvas == null
              ? null
              : {
                  ...activeCanvas,
                  executionEnvironmentOptions,
                  canEdit: canEditCanvas,
                  canDelete: canDeleteActiveCanvas,
                  onApplyCanvasPatch,
                  onDeleteCanvas: onDeleteActiveCanvas,
                }
          }
        />
      </ResizablePanel>
    </>
  );
}

export default function CanvasShell({
  layout,
  panels,
  graph,
  toolbar,
  graphCommands,
  chromeCommands,
  canvasCommands,
}: CanvasShellProps): JSX.Element {
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);
  const canEditGraph = panels.userPermissions.canEditEdges;
  const sourceImportContributions = useMemo(
    () => getSourceImportContributions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const sourceImportOptions = useMemo(
    () => getSourceImportOptions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const canOpenDataRegistry =
    canEditGraph && layout.canOpenSourceImport && sourceImportContributions.length > 0;
  const handleOpenDataRegistry = canOpenDataRegistry ? () => setDataRegistryOpen(true) : undefined;

  useEffect(() => {
    if (!canOpenDataRegistry && dataRegistryOpen) {
      setDataRegistryOpen(false);
    }
  }, [canOpenDataRegistry, dataRegistryOpen]);

  return (
    <ResizablePanelGroup
      data-slot="canvas-shell-panel-group"
      direction="horizontal"
      className="h-full min-w-[960px]"
    >
      <CanvasShellExplorerRail
        focusMode={layout.focusMode}
        explorerPanelVisible={layout.explorerPanelVisible}
        explorerResourceGroups={panels.explorerResourceGroups}
        activeCanvasId={panels.activeCanvasId}
        canEditGraph={canEditGraph}
        canOpenSourceImport={layout.canOpenSourceImport}
        onHideExplorer={chromeCommands.onHideExplorer}
        onOpenDataRegistry={handleOpenDataRegistry}
        onSelectCanvas={canvasCommands.onSelectCanvas}
      />

      <CanvasShellMainPanel
        layout={layout}
        panels={panels}
        graph={graph}
        toolbar={toolbar}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
      />

      <CanvasShellInspectorRail
        focusMode={layout.focusMode}
        inspectorPanelVisible={layout.inspectorPanelVisible}
        inspectorNode={panels.inspectorNode}
        activeCanvas={panels.activeCanvas}
        executionEnvironmentOptions={panels.executionEnvironmentOptions}
        canEditCanvas={panels.canEditCanvas}
        canDeleteActiveCanvas={panels.canDeleteActiveCanvas}
        inspectorGraphNodes={panels.inspectorGraphNodes}
        inspectorGraphEdges={panels.inspectorGraphEdges}
        inspectorAuthoring={panels.inspectorAuthoring}
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        onHideInspector={chromeCommands.onHideInspector}
        onApplyCanvasPatch={canvasCommands.onApplyCanvasPatch}
        onDeleteActiveCanvas={canvasCommands.onDeleteActiveCanvas}
      />

      <SourceImportWizard
        open={dataRegistryOpen}
        onClose={() => setDataRegistryOpen(false)}
        onComplete={graphCommands.onSourceImportComplete}
        sourceImportOptions={sourceImportOptions}
      />
    </ResizablePanelGroup>
  );
}
