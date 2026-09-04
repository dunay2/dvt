/**
 * Owned concern: build shell-local chrome command bindings for the route-owned Canvas shell contract.
 */
import type { CanvasShellChromeCommandsBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellChromeCommands } from './canvasShell.types';

export function buildCanvasShellChromeCommands({
  chromeCommands,
}: CanvasShellChromeCommandsBuilderArgs): CanvasShellChromeCommands {
  return {
    onHideInspector: chromeCommands.hideInspectorPanel,
    onShowInspector: chromeCommands.showInspectorPanel,
    onAutoLayout: chromeCommands.handleAutoLayout,
    onToggleCostOverlay: chromeCommands.handleToggleCostOverlay,
    onToggleImpact: chromeCommands.toggleImpactOverlay,
    onToggleColumns: chromeCommands.toggleColumnLevelLineage,
    onGridSizeChange: chromeCommands.setGridSize,
    onCanvasPaletteChange: chromeCommands.setCanvasPalette,
    onToggleGridVisible: () => {
      chromeCommands.setCanvasGridVisible(!chromeCommands.canvasGridVisible);
    },
    onGridColorChange: chromeCommands.setCanvasGridColor,
    onToggleSnapToGrid: () => {
      chromeCommands.setCanvasSnapToGrid(!chromeCommands.canvasSnapToGrid);
    },
    onExportProjectSnapshot: chromeCommands.handleExportProjectSnapshot,
    onImportProjectSnapshotFile: (file) => {
      void chromeCommands.handleImportProjectSnapshotFile(file);
    },
    onReloadLatestDraft: chromeCommands.reloadLatestDraft,
    onPreviewExecutionPlan: () => {
      void chromeCommands.handlePreviewExecutionPlan();
    },
    onRun: () => {
      void chromeCommands.handleStartRun();
    },
    executionSelectionRecovery: chromeCommands.executionSelectionRecoveryCommands,
  };
}
