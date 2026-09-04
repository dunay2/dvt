/** Owned concern: compose Canvas center-surface rendering from governed route posture. */
import type { RenderCanvasCenterSurfaceArgs } from './canvasCenterSurface.types';
import { renderCanvasDraftTransportSurface } from './canvasCenterSurfaceTransport';
import { renderCanvasWorkbenchSurface } from './canvasCenterSurfaceWorkbench';

export function renderCanvasCenterSurface(args: RenderCanvasCenterSurfaceArgs) {
  const draftTransportSurface = renderCanvasDraftTransportSurface(args.draftTransportError);
  if (draftTransportSurface != null) {
    return draftTransportSurface;
  }

  return renderCanvasWorkbenchSurface({
    presentationState: args.presentationState,
    workspaceScope: args.workspaceScope,
    startupBlockState: args.startupBlockState,
    workbenchErrorMessage: args.workbenchErrorMessage,
    canvasDocument: args.canvasDocument,
    draftSaveStatus: args.draftSaveStatus,
    availableCanvasKinds: args.availableCanvasKinds,
    canCreateCanvasDocument: args.canCreateCanvasDocument,
    onCreateCanvasDocument: args.onCreateCanvasDocument,
  });
}
