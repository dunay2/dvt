/**
 * Owned concern: build shell-local chrome command bindings for the route-owned Canvas shell contract.
 */
import type { CanvasShellChromeCommandsBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellChromeCommands } from './canvasShell.types';

export function buildCanvasShellChromeCommands({
  chromeCommands,
}: CanvasShellChromeCommandsBuilderArgs): CanvasShellChromeCommands {
  return {
    onHideExplorer: chromeCommands.hideExplorerPanel,
    onShowExplorer: chromeCommands.showExplorerPanel,
    onHideInspector: chromeCommands.hideInspectorPanel,
    onShowInspector: chromeCommands.showInspectorPanel,
    onAutoLayout: chromeCommands.handleAutoLayout,
    onToggleCostOverlay: chromeCommands.handleToggleCostOverlay,
    onToggleImpact: chromeCommands.toggleImpactOverlay,
    onToggleColumns: chromeCommands.toggleColumnLevelLineage,
    onToggleGridVisible: () => {
      chromeCommands.setCanvasGridVisible(!chromeCommands.canvasGridVisible);
    },
    onGridColorChange: chromeCommands.setCanvasGridColor,
    onToggleSnapToGrid: () => {
      chromeCommands.setCanvasSnapToGrid(!chromeCommands.canvasSnapToGrid);
    },
    onReloadLatestDraft: chromeCommands.reloadLatestDraft,
    onPlan: () => {
      void chromeCommands.handlePlan();
    },
    onRun: () => {
      void chromeCommands.handleStartRun();
    },
  };
}
