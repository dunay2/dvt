/**
 * Owned concern: build the panels concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellPanelsBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellPanels } from './canvasShell.types';

function resolveExplorerAuthoringNodeKinds({
  routePresentation,
  userPermissions,
}: Pick<
  CanvasShellPanelsBuilderArgs,
  'routePresentation' | 'userPermissions'
>): CanvasShellPanels['authoringNodeKinds'] {
  if (!userPermissions.canEditEdges || routePresentation.canvasDocument == null) {
    return [];
  }

  return (
    routePresentation.availableCanvasKinds.find(
      (registration) => registration.kind === routePresentation.canvasDocument?.kind
    )?.nodeKinds ?? []
  );
}

export function buildCanvasShellPanels({
  panelState,
  routePresentation,
  userPermissions,
}: CanvasShellPanelsBuilderArgs): CanvasShellPanels {
  return {
    explorerNodes: panelState.explorerNodes,
    authoringNodeKinds: resolveExplorerAuthoringNodeKinds({
      routePresentation,
      userPermissions,
    }),
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
