/** Owned concern: define Canvas center-surface rendering contracts. */
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
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
  workspaceScope: WorkspaceScope;
  startupBlockState: CanvasRouteStartupBlockState | null;
  draftTransportError: CanvasDraftTransportErrorState | null;
  workbenchErrorMessage: string | null;
  canvasDocument: CanvasAuthoringCanvasDocument | null;
  draftSaveStatus: DraftSaveStatus;
  availableCanvasKinds: readonly CanvasKindRegistration[];
  canCreateCanvasDocument: boolean;
  onCreateCanvasDocument: (command: CanvasCreateCanvasDocumentCommand) => void;
};

export type CanvasWorkbenchSurfaceArgs = Pick<
  RenderCanvasCenterSurfaceArgs,
  | 'presentationState'
  | 'workspaceScope'
  | 'startupBlockState'
  | 'workbenchErrorMessage'
  | 'canvasDocument'
  | 'draftSaveStatus'
  | 'availableCanvasKinds'
  | 'canCreateCanvasDocument'
  | 'onCreateCanvasDocument'
>;
