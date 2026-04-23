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
    startupBlockState: args.startupBlockState,
    workbenchErrorMessage: args.workbenchErrorMessage,
    canvasDocument: args.canvasDocument,
    availableCanvasKinds: args.availableCanvasKinds,
    canEditEdges: args.canEditEdges,
    canOpenSourceImport: args.canOpenSourceImport,
    onCreateCanvasDocument: args.onCreateCanvasDocument,
    onCreateAuthoringNode: args.onCreateAuthoringNode,
  });
}
