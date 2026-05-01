/** Owned concern: define Canvas center-surface rendering contracts. */
import type { CanvasKindRegistration, NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import type {
  CanvasCreateCanvasDocumentCommand,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';
import type { CanvasRouteStartupBlockState } from './canvasRouteInteractionState';
import type { WorkspaceGraphDraft } from '../../ports/workspace';

export type RenderCanvasCenterSurfaceArgs = {
  presentationState: CanvasDraftPresentationState;
  startupBlockState: CanvasRouteStartupBlockState | null;
  draftTransportError: CanvasDraftTransportErrorState | null;
  workbenchErrorMessage: string | null;
  canvasDocument: WorkspaceGraphDraft['canvas'] | null;
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
