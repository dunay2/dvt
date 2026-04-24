/** Owned concern: derive story-shaped host cycle DTOs from canonical Canvas workbench posture. */
import { canvasViewCopy } from './copy';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { CanvasKindRegistration, NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { WorkspaceGraphDraft } from '../../ports/workspace';

type CreateCanvasDocumentCommand = CanvasWorkbenchSurfaceArgs['onCreateCanvasDocument'];
type CreateAuthoringNodeCommand = CanvasWorkbenchSurfaceArgs['onCreateAuthoringNode'];

export type CanvasHostCycleState =
  | {
      kind: 'needs_canvas';
      availableCanvasKinds: readonly CanvasKindRegistration[];
      onCreateCanvasDocument: CreateCanvasDocumentCommand;
    }
  | {
      kind: 'typed_empty';
      title: string;
      message: string;
      firstNodeLabel: string;
      firstNodeHelper: string;
      nodeKinds: readonly NodeKindRegistration[];
      onCreateAuthoringNode: CreateAuthoringNodeCommand | undefined;
    }
  | {
      kind: 'graph_ready';
      canvasDocument: WorkspaceGraphDraft['canvas'];
    };

function resolveCanvasKindRegistration(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'canvasDocument' | 'availableCanvasKinds'>
): CanvasKindRegistration | null {
  const { canvasDocument, availableCanvasKinds } = args;
  if (canvasDocument == null) {
    return null;
  }

  return (
    availableCanvasKinds.find((registration) => registration.kind === canvasDocument.kind) ?? null
  );
}

function resolveTypedEmptyMessage(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    'canEditEdges' | 'canOpenSourceImport' | 'canvasDocument' | 'availableCanvasKinds'
  >
): string {
  const { canEditEdges, canOpenSourceImport } = args;
  const activeCanvasKind = resolveCanvasKindRegistration(args);

  if (!canEditEdges) {
    return canvasViewCopy.routeEmptyReadOnlyMessage;
  }

  if (!canOpenSourceImport) {
    return canvasViewCopy.routeEmptyImportUnavailableMessage;
  }

  return activeCanvasKind?.emptyState.editableMessage ?? canvasViewCopy.routeEmptyEditableMessage;
}

export function deriveCanvasHostCycleState(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    | 'presentationState'
    | 'canvasDocument'
    | 'availableCanvasKinds'
    | 'canEditEdges'
    | 'canOpenSourceImport'
    | 'onCreateCanvasDocument'
    | 'onCreateAuthoringNode'
  >
): CanvasHostCycleState | null {
  const {
    presentationState: { routeState },
    canvasDocument,
    availableCanvasKinds,
    canEditEdges,
    canOpenSourceImport,
    onCreateCanvasDocument,
    onCreateAuthoringNode,
  } = args;

  if (routeState === 'needs_canvas') {
    return {
      kind: 'needs_canvas',
      availableCanvasKinds,
      onCreateCanvasDocument,
    };
  }

  if (routeState === 'empty') {
    const activeCanvasKind = resolveCanvasKindRegistration({
      canvasDocument,
      availableCanvasKinds,
    });

    return {
      kind: 'typed_empty',
      title: activeCanvasKind?.emptyState.title ?? canvasViewCopy.routeEmptyTitle,
      message: resolveTypedEmptyMessage({
        canEditEdges,
        canOpenSourceImport,
        canvasDocument,
        availableCanvasKinds,
      }),
      firstNodeLabel:
        activeCanvasKind?.emptyState.firstNodeLabel ?? canvasViewCopy.routeEmptyFirstNodeLabel,
      firstNodeHelper:
        activeCanvasKind?.emptyState.firstNodeHelper ?? canvasViewCopy.routeEmptyFirstNodeHelper,
      nodeKinds: canEditEdges ? activeCanvasKind?.nodeKinds ?? [] : [],
      onCreateAuthoringNode: canEditEdges ? onCreateAuthoringNode : undefined,
    };
  }

  if (routeState === 'ready' && canvasDocument != null) {
    return {
      kind: 'graph_ready',
      canvasDocument,
    };
  }

  return null;
}
