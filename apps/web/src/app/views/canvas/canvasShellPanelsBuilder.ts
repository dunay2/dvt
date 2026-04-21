/**
 * Owned concern: build the panels concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellPanels } from './canvasShell.types';
import type { CanvasShellBuilderArgs } from './canvasShellBuilder.types';

export function buildCanvasShellPanels({
  controller,
  routeViewState,
}: CanvasShellBuilderArgs): CanvasShellPanels {
  return {
    explorerNodes: controller.explorerNodes,
    inspectorNode: controller.inspectorNode,
    activeRunId: controller.activeRunId,
    registeredPlugins: controller.registeredPlugins,
    userPermissions: routeViewState.effectiveUserPermissions,
    importedNodeFocusIds: controller.importedNodeFocusIds,
  };
}
