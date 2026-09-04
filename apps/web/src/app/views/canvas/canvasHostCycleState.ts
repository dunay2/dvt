/** Owned concern: derive story-shaped host cycle DTOs from canonical Canvas workbench posture. */
import { canvasViewCopy } from './copy';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasAuthoringCanvasDocument } from './canvasDraftReadModel';

type CreateCanvasDocumentCommand = CanvasWorkbenchSurfaceArgs['onCreateCanvasDocument'];

export type CanvasHostCycleState =
  | {
      kind: 'needs_canvas';
      availableCanvasKinds: readonly CanvasKindRegistration[];
      onCreateCanvasDocument: CreateCanvasDocumentCommand | undefined;
      unavailableMessage: string | null;
    }
  | {
      kind: 'typed_empty';
      canvasDocument: CanvasAuthoringCanvasDocument;
    }
  | {
      kind: 'graph_ready';
      canvasDocument: CanvasAuthoringCanvasDocument;
    };

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
    | 'onCreateCanvasDocument'
  >
): CanvasHostCycleState | null {
  const {
    presentationState: { routeState },
    canvasDocument,
    availableCanvasKinds,
    canCreateCanvasDocument,
    onCreateCanvasDocument,
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

  if (routeState === 'empty' && canvasDocument != null) {
    return {
      kind: 'typed_empty',
      canvasDocument,
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
