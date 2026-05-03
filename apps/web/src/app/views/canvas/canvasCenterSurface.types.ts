/** Owned concern: define Canvas center-surface rendering contracts. */
import type { CanvasKindRegistration, NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import type {
  CanvasCreateCanvasDocumentCommand,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { CanvasRouteStartupBlockState } from './canvasRouteInteractionState';
import type { CanvasAuthoringCanvasDocument } from './canvasDraftReadModel';

export type RenderCanvasCenterSurfaceArgs = {
  presentationState: CanvasDraftPresentationState;
  startupBlockState: CanvasRouteStartupBlockState | null;
  draftTransportError: CanvasDraftTransportErrorState | null;
  workbenchErrorMessage: string | null;
  canvasDocument: CanvasAuthoringCanvasDocument | null;
  draftSaveStatus: DraftSaveStatus;
  availableCanvasKinds: readonly CanvasKindRegistration[];
  canEditEdges: boolean;
  canOpenSourceImport: boolean;
  onCreateCanvasDocument: (command: CanvasCreateCanvasDocumentCommand) => void;
  onCreateAuthoringNode: (registration: NodeKindRegistration) => void;
};

export type CanvasWorkbenchSurfaceArgs = Pick<
  RenderCanvasCenterSurfaceArgs,
  | 'presentationState'
  | 'startupBlockState'
  | 'workbenchErrorMessage'
  | 'canvasDocument'
  | 'draftSaveStatus'
  | 'availableCanvasKinds'
  | 'canEditEdges'
  | 'canOpenSourceImport'
  | 'onCreateCanvasDocument'
  | 'onCreateAuthoringNode'
>;
