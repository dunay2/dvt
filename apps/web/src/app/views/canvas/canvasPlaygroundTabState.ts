/** Owned concern: derive host-visible Canvas tab state from the authoritative workspace draft. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { WorkspaceGraphDraft } from '../../ports/workspace';

export const WORKSPACE_DRAFT_CANVAS_TAB_ID = 'workspace-draft-canvas';

export type CanvasPlaygroundTab = Readonly<{
  id: typeof WORKSPACE_DRAFT_CANVAS_TAB_ID;
  title: string;
  kind: WorkspaceGraphDraft['canvas']['kind'];
  kindLabel: string;
  source: 'workspace_draft';
}>;

export type CanvasPlaygroundTabState = Readonly<{
  activeTabId: CanvasPlaygroundTab['id'] | null;
  tabs: readonly CanvasPlaygroundTab[];
}>;

function resolveCanvasKindLabel(args: {
  canvasKind: WorkspaceGraphDraft['canvas']['kind'];
  availableCanvasKinds: readonly CanvasKindRegistration[];
}): string {
  const { canvasKind, availableCanvasKinds } = args;
  return (
    availableCanvasKinds.find((registration) => registration.kind === canvasKind)?.label ??
    canvasKind
  );
}

export function deriveCanvasPlaygroundTabState(args: {
  canvasDocument: WorkspaceGraphDraft['canvas'] | null;
  availableCanvasKinds: readonly CanvasKindRegistration[];
}): CanvasPlaygroundTabState {
  const { canvasDocument, availableCanvasKinds } = args;
  if (canvasDocument == null) {
    return {
      activeTabId: null,
      tabs: [],
    };
  }

  return {
    activeTabId: WORKSPACE_DRAFT_CANVAS_TAB_ID,
    tabs: [
      {
        id: WORKSPACE_DRAFT_CANVAS_TAB_ID,
        title: canvasDocument.title,
        kind: canvasDocument.kind,
        kindLabel: resolveCanvasKindLabel({
          canvasKind: canvasDocument.kind,
          availableCanvasKinds,
        }),
        source: 'workspace_draft',
      },
    ],
  };
}
