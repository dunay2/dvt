/**
 * Owned concern: build the panels concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellPanelsBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellPanels } from './canvasShell.types';

export function buildCanvasShellPanels({
  panelState,
  userPermissions,
}: CanvasShellPanelsBuilderArgs): CanvasShellPanels {
  return {
    explorerNodes: panelState.explorerNodes,
    inspectorNode: panelState.inspectorNode,
    inspectorAuthoring: {
      canEditNode: panelState.canEditInspectorNode,
      onApplyNodeDraft: panelState.applyInspectorNodeDraft,
    },
    activeRunId: panelState.activeRunId,
    registeredPlugins: panelState.registeredPlugins,
    userPermissions,
    importedNodeFocusIds: panelState.importedNodeFocusIds,
  };
}
