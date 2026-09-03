/**
 * Owned concern: build the panels concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellPanelsBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellPanels } from './canvasShell.types';

function normalizeCanvasKind(kind: string): string {
  return kind.trim().toLowerCase();
}

function resolveActiveCanvasAuthoringNodeKinds({
  routePresentation,
  userPermissions,
}: Pick<
  CanvasShellPanelsBuilderArgs,
  'routePresentation' | 'userPermissions'
>): CanvasShellPanels['authoringNodeKinds'] {
  if (!userPermissions.canEditEdges || routePresentation.canvasDocument == null) {
    return [];
  }

  const activeCanvasKind = normalizeCanvasKind(routePresentation.canvasDocument.kind);
  return (
    routePresentation.availableCanvasKinds.find(
      (registration) => normalizeCanvasKind(registration.kind) === activeCanvasKind
    )?.nodeKinds ?? []
  );
}

export function buildCanvasShellPanels({
  panelState,
  routePresentation,
  userPermissions,
}: CanvasShellPanelsBuilderArgs): CanvasShellPanels {
  const activeCanvas =
    routePresentation.canvasDocuments.find(
      (canvas) => canvas.id === routePresentation.activeCanvasId
    ) ?? null;

  return {
    authoringNodeKinds: resolveActiveCanvasAuthoringNodeKinds({
      routePresentation,
      userPermissions,
    }),
    activeCanvasId: routePresentation.activeCanvasId,
    activeCanvas,
    canvasDocuments: routePresentation.canvasDocuments,
    executionEnvironmentOptions: panelState.executionEnvironmentOptions,
    canEditCanvas: userPermissions.canEditEdges,
    canDeleteActiveCanvas:
      userPermissions.canEditEdges && routePresentation.canvasDocuments.length > 1,
    inspectorNode: panelState.inspectorNode,
    inspectorPreferredTabId:
      panelState.inspectorNode == null ? null : panelState.inspectorPreferredTabId,
    inspectorPreferredTabRequestId:
      panelState.inspectorNode == null ? 0 : panelState.inspectorPreferredTabRequestId,
    inspectorGraphNodes: panelState.inspectorGraphNodes,
    inspectorGraphEdges: panelState.inspectorGraphEdges,
    inspectorAuthoring: {
      canEditNode: panelState.canEditInspectorNode,
      workspaceScope: routePresentation.workspaceScope,
      onApplyNodeDraft: panelState.applyInspectorNodeDraft,
    },
    inspectorWorkbenchContributions: [],
    activeRunId: panelState.activeRunId,
    registeredPlugins: panelState.registeredPlugins,
    runtimeCapabilities: panelState.runtimeCapabilities,
    userPermissions,
    importedNodeFocusIds: panelState.importedNodeFocusIds,
  };
}
