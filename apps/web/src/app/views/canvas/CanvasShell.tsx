/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useEffect, useMemo, useState } from 'react';
import SourceImportWizard from '../../components/SourceImportWizard';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import type { CanvasShellOpenDataRegistryCommand, CanvasShellProps } from './canvasShell.types';

export default function CanvasShell({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
}: CanvasShellProps): JSX.Element {
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);
  const [dataRegistryInitialSelection, setDataRegistryInitialSelection] =
    useState<Parameters<CanvasShellOpenDataRegistryCommand>[0]>(undefined);
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
  const handleOpenDataRegistry: CanvasShellOpenDataRegistryCommand | undefined = canOpenDataRegistry
    ? (initialSelection) => {
        setDataRegistryInitialSelection(initialSelection);
        setDataRegistryOpen(true);
      }
    : undefined;

  useEffect(() => {
    if (!canOpenDataRegistry && dataRegistryOpen) {
      setDataRegistryOpen(false);
      setDataRegistryInitialSelection(undefined);
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
        layout={layout}
        panels={panels}
        graph={graph}
        chromeState={chromeState}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        onOpenSourceImport={handleOpenDataRegistry}
      />

      <SourceImportWizard
        open={dataRegistryOpen}
        onClose={() => {
          setDataRegistryOpen(false);
          setDataRegistryInitialSelection(undefined);
        }}
        onComplete={graphCommands.onSourceImportComplete}
        sourceImportOptions={sourceImportOptions}
        initialSelection={dataRegistryInitialSelection}
      />
    </ResizablePanelGroup>
  );
}
