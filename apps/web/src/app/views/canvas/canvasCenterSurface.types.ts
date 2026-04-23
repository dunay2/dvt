/** Owned concern: define Canvas center-surface rendering contracts. */
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { CanvasRouteStartupBlockState } from './canvasRouteInteractionState';

export type RenderCanvasCenterSurfaceArgs = {
  presentationState: CanvasDraftPresentationState;
  startupBlockState: CanvasRouteStartupBlockState | null;
  draftTransportError: CanvasDraftTransportErrorState | null;
  workbenchErrorMessage: string | null;
  canEditEdges: boolean;
  canOpenSourceImport: boolean;
  onCreateAuthoringNode: (registration: NodeKindRegistration) => void;
};

export type CanvasWorkbenchSurfaceArgs = Pick<
  RenderCanvasCenterSurfaceArgs,
  | 'presentationState'
  | 'startupBlockState'
  | 'workbenchErrorMessage'
  | 'canEditEdges'
  | 'canOpenSourceImport'
  | 'onCreateAuthoringNode'
>;
