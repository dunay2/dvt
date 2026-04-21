/**
 * Owned concern: build shell-local chrome command bindings for the route-owned Canvas shell contract.
 */
import type { CanvasShellChromeCommands } from './canvasShell.types';
import type { CanvasShellBuilderArgs } from './canvasShellBuilder.types';

export function buildCanvasShellChromeCommands({
  controller,
}: CanvasShellBuilderArgs): CanvasShellChromeCommands {
  return {
    onHideExplorer: controller.hideExplorerPanel,
    onShowExplorer: controller.showExplorerPanel,
    onHideInspector: controller.hideInspectorPanel,
    onShowInspector: controller.showInspectorPanel,
    onAutoLayout: controller.handleAutoLayout,
    onToggleCostOverlay: controller.handleToggleCostOverlay,
    onToggleImpact: controller.toggleImpactOverlay,
    onToggleColumns: controller.toggleColumnLevelLineage,
    onReloadLatestDraft: controller.reloadLatestDraft,
    onPlan: () => {
      void controller.handlePlan();
    },
    onRun: () => {
      void controller.handleStartRun();
    },
  };
}
