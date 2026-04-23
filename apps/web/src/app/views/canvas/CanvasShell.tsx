/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useEffect, useState } from 'react';
import DbtExplorer from '../../components/DbtExplorer';
import InspectorPanel from '../../components/InspectorPanel';
import SourceImportWizard from '../../components/SourceImportWizard';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import type {
  CanvasShellChromeCommands,
  CanvasShellPanels,
  CanvasShellProps,
} from './canvasShell.types';

type CanvasShellExplorerRailProps = Readonly<{
  focusMode: boolean;
  explorerPanelVisible: boolean;
  explorerNodes: CanvasShellPanels['explorerNodes'];
  canEditGraph: boolean;
  canOpenSourceImport: boolean;
  onHideExplorer: CanvasShellChromeCommands['onHideExplorer'];
  onOpenDataRegistry?: () => void;
}>;

function CanvasShellExplorerRail({
  focusMode,
  explorerPanelVisible,
  explorerNodes,
  canEditGraph,
  canOpenSourceImport,
  onHideExplorer,
  onOpenDataRegistry,
}: CanvasShellExplorerRailProps): JSX.Element | null {
  if (focusMode || !explorerPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
        <DbtExplorer
          nodes={explorerNodes}
          canEditGraph={canEditGraph}
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
  activeRunId: CanvasShellPanels['activeRunId'];
  registeredPlugins: CanvasShellPanels['registeredPlugins'];
  onHideInspector: CanvasShellChromeCommands['onHideInspector'];
}>;

function CanvasShellInspectorRail({
  focusMode,
  inspectorPanelVisible,
  inspectorNode,
  activeRunId,
  registeredPlugins,
  onHideInspector,
}: CanvasShellInspectorRailProps): JSX.Element | null {
  if (focusMode || !inspectorPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizableHandle />
      <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
        <InspectorPanel
          node={inspectorNode}
          activeRunId={activeRunId}
          registeredPlugins={registeredPlugins}
          onHide={onHideInspector}
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
}: CanvasShellProps): JSX.Element {
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);
  const canEditGraph = panels.userPermissions.canEditEdges;
  const canOpenDataRegistry = canEditGraph && layout.canOpenSourceImport;
  const handleOpenDataRegistry = canOpenDataRegistry
    ? () => setDataRegistryOpen(true)
    : undefined;

  useEffect(() => {
    if (!canOpenDataRegistry && dataRegistryOpen) {
      setDataRegistryOpen(false);
    }
  }, [canOpenDataRegistry, dataRegistryOpen]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <CanvasShellExplorerRail
        focusMode={layout.focusMode}
        explorerPanelVisible={layout.explorerPanelVisible}
        explorerNodes={panels.explorerNodes}
        canEditGraph={canEditGraph}
        canOpenSourceImport={layout.canOpenSourceImport}
        onHideExplorer={chromeCommands.onHideExplorer}
        onOpenDataRegistry={handleOpenDataRegistry}
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
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        onHideInspector={chromeCommands.onHideInspector}
      />

      <SourceImportWizard
        open={dataRegistryOpen}
        onClose={() => setDataRegistryOpen(false)}
        onComplete={graphCommands.onSourceImportComplete}
      />
    </ResizablePanelGroup>
  );
}
