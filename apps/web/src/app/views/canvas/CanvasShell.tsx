/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useEffect, useState } from 'react';
import DbtExplorer from '../../components/DbtExplorer';
import SourceImportWizard from '../../components/SourceImportWizard';
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
  explorerNodes: CanvasShellPanels['explorerNodes'];
  authoringNodeKinds: CanvasShellPanels['authoringNodeKinds'];
  canEditGraph: boolean;
  canOpenSourceImport: boolean;
  onCreateAuthoringNode: CanvasShellProps['graphCommands']['onCreateAuthoringNode'];
  onHideExplorer: CanvasShellChromeCommands['onHideExplorer'];
  onOpenDataRegistry?: () => void;
}>;

function CanvasShellExplorerRail({
  focusMode,
  explorerPanelVisible,
  explorerNodes,
  authoringNodeKinds,
  canEditGraph,
  canOpenSourceImport,
  onCreateAuthoringNode,
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
          nodeKinds={authoringNodeKinds}
          canEditGraph={canEditGraph}
          onCreateAuthoringNode={onCreateAuthoringNode}
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
  inspectorAuthoring: CanvasShellPanels['inspectorAuthoring'];
  activeRunId: CanvasShellPanels['activeRunId'];
  registeredPlugins: CanvasShellPanels['registeredPlugins'];
  onHideInspector: CanvasShellChromeCommands['onHideInspector'];
}>;

function CanvasShellInspectorRail({
  focusMode,
  inspectorPanelVisible,
  inspectorNode,
  inspectorAuthoring,
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
        <CanvasInspectorPanel
          node={inspectorNode}
          activeRunId={activeRunId}
          registeredPlugins={registeredPlugins}
          onHide={onHideInspector}
          authoring={inspectorAuthoring}
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
  const handleOpenDataRegistry = canOpenDataRegistry ? () => setDataRegistryOpen(true) : undefined;

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
        authoringNodeKinds={panels.authoringNodeKinds}
        canEditGraph={canEditGraph}
        canOpenSourceImport={layout.canOpenSourceImport}
        onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}
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
        inspectorAuthoring={panels.inspectorAuthoring}
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
