/** Owned concern: derive story-shaped host cycle DTOs from canonical Canvas workbench posture. */
import { canvasViewCopy } from './copy';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { CanvasKindRegistration, NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasAuthoringCanvasDocument } from './canvasDraftReadModel';

type CreateCanvasDocumentCommand = CanvasWorkbenchSurfaceArgs['onCreateCanvasDocument'];
type CreateAuthoringNodeCommand = CanvasWorkbenchSurfaceArgs['onCreateAuthoringNode'];

function normalizeCanvasKind(kind: string): string {
  return kind.trim().toLowerCase();
}

export type CanvasHostCycleState =
  | {
      kind: 'needs_canvas';
      availableCanvasKinds: readonly CanvasKindRegistration[];
      onCreateCanvasDocument: CreateCanvasDocumentCommand | undefined;
      unavailableMessage: string | null;
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
      canvasDocument: CanvasAuthoringCanvasDocument;
    };

function resolveCanvasKindRegistration(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'canvasDocument' | 'availableCanvasKinds'>
): CanvasKindRegistration | null {
  const { canvasDocument, availableCanvasKinds } = args;
  if (canvasDocument == null) {
    return null;
  }

  const activeCanvasKind = normalizeCanvasKind(canvasDocument.kind);
  return (
    availableCanvasKinds.find(
      (registration) => normalizeCanvasKind(registration.kind) === activeCanvasKind
    ) ?? null
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

function canCreateFirstNode(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'canEditEdges' | 'draftSaveStatus'>
): boolean {
  return args.canEditEdges && args.draftSaveStatus !== 'saving';
}

function canCreateFirstCanvasDocument(
  args: Pick<CanvasWorkbenchSurfaceArgs, 'canCreateCanvasDocument' | 'draftSaveStatus'>
): boolean {
  return args.canCreateCanvasDocument && args.draftSaveStatus !== 'saving';
}

export function deriveCanvasHostCycleState(
  args: Pick<
    CanvasWorkbenchSurfaceArgs,
    | 'presentationState'
    | 'canvasDocument'
    | 'draftSaveStatus'
    | 'availableCanvasKinds'
    | 'canCreateCanvasDocument'
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
    canCreateCanvasDocument,
    canEditEdges,
    canOpenSourceImport,
    onCreateCanvasDocument,
    onCreateAuthoringNode,
  } = args;

  if (routeState === 'needs_canvas') {
    const canCreateCanvas = canCreateFirstCanvasDocument({
      canCreateCanvasDocument,
      draftSaveStatus: args.draftSaveStatus,
    });

    return {
      kind: 'needs_canvas',
      availableCanvasKinds,
      onCreateCanvasDocument: canCreateCanvas ? onCreateCanvasDocument : undefined,
      unavailableMessage: canCreateCanvas
        ? null
        : canCreateCanvasDocument
          ? canvasViewCopy.mutationUnavailableMessage
          : canvasViewCopy.routeNeedsCanvasReadOnlyMessage,
    };
  }

  if (routeState === 'empty') {
    const activeCanvasKind = resolveCanvasKindRegistration({
      canvasDocument,
      availableCanvasKinds,
    });
    const canCreateNode = canCreateFirstNode({
      canEditEdges,
      draftSaveStatus: args.draftSaveStatus,
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
      nodeKinds: canCreateNode ? (activeCanvasKind?.nodeKinds ?? []) : [],
      onCreateAuthoringNode: canCreateNode ? onCreateAuthoringNode : undefined,
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
