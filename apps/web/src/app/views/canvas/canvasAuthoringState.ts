import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  deriveExecutionScope,
  deriveVisibleScope,
  reconcileUiScope,
  type CanvasUiScope,
  type ExecutionCanvasScope,
  type VisibleCanvasScope,
} from './canvasDraftScope';
import {
  deriveCanvasDraftToolbarState,
  deriveDraftRecoveryReason,
  type CanvasDraftRecoveryReason,
  type CanvasDraftToolbarState,
} from './canvasDraftPresentationState';
import type { CanvasDraftAccessMode, CanvasDraftReadModel } from './canvasDraftReadModel';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';

type DeriveCanvasAuthoringStateArgs = {
  draftSession: CanvasDraftSession;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  draftSaveStatus: DraftSaveStatus;
  canPersistDraftTransport: boolean;
  draftReadModel: CanvasDraftReadModel | undefined;
};

export type CanvasAuthoringState = {
  visibleScope: VisibleCanvasScope;
  uiScope: CanvasUiScope;
  executionScope: ExecutionCanvasScope;
  draftAccessMode: CanvasDraftAccessMode;
  draftCapabilityReason: CanvasDraftReadModel['capabilityReason'];
  draftFormatError: CanvasDraftReadModel['formatError'];
  draftFormatMeta: CanvasDraftReadModel['formatMeta'];
  isMissingRemoteDraft: boolean;
  isStaleDraftConflict: boolean;
  hasDraftProjectionGap: boolean;
  draftRecoveryReason: CanvasDraftRecoveryReason;
  draftToolbarState: CanvasDraftToolbarState;
  isDraftRecoveryBlocked: boolean;
  isDraftAccessBlocked: boolean;
  isDraftReadOnly: boolean;
  canMutateGraph: boolean;
};

type CanvasDraftAccessState = Pick<
  CanvasAuthoringState,
  | 'draftAccessMode'
  | 'draftCapabilityReason'
  | 'draftFormatError'
  | 'draftFormatMeta'
  | 'isDraftAccessBlocked'
  | 'isDraftReadOnly'
>;

type CanvasDraftRecoveryState = Pick<
  CanvasAuthoringState,
  | 'isMissingRemoteDraft'
  | 'isStaleDraftConflict'
  | 'hasDraftProjectionGap'
  | 'draftRecoveryReason'
  | 'draftToolbarState'
  | 'isDraftRecoveryBlocked'
>;

function deriveCanvasUiScope(
  draftSession: CanvasDraftSession,
  visibleScope: VisibleCanvasScope,
  selectedNodeIds: string[],
  inspectorNodeId: string | null
): CanvasUiScope {
  if (draftSession.syncState === 'bootstrapping') {
    return {
      selectedNodeIds,
      inspectorNodeId,
    };
  }

  return reconcileUiScope({
    visibleScope,
    pendingExplicitNodeIds: draftSession.workingSet.pendingExplicitNodeIds,
    selectedNodeIds,
    inspectorNodeId,
  });
}

function deriveCanvasDraftAccessState(
  draftReadModel: CanvasDraftReadModel | undefined
): CanvasDraftAccessState {
  const draftAccessMode = draftReadModel?.accessMode ?? 'unknown';
  const isDraftReadOnly = draftAccessMode === 'read_only';
  const isDraftAccessBlocked =
    draftAccessMode === 'forbidden' || draftReadModel?.formatError != null;

  return {
    draftAccessMode,
    draftCapabilityReason: draftReadModel?.capabilityReason ?? null,
    draftFormatError: draftReadModel?.formatError ?? null,
    draftFormatMeta: draftReadModel?.formatMeta ?? null,
    isDraftAccessBlocked,
    isDraftReadOnly,
  };
}

function deriveCanvasDraftRecoveryState(args: {
  draftSession: CanvasDraftSession;
  visibleScope: VisibleCanvasScope;
  draftSaveStatus: DraftSaveStatus;
}): CanvasDraftRecoveryState {
  const { draftSession, visibleScope, draftSaveStatus } = args;
  const isMissingRemoteDraft = draftSession.syncState === 'missing_remote';
  const isStaleDraftConflict = draftSession.syncState === 'conflict';
  const hasDraftProjectionGap =
    draftSession.syncState !== 'bootstrapping' && !visibleScope.isProjectionComplete;
  const draftRecoveryReason = deriveDraftRecoveryReason({
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasDraftProjectionGap,
  });

  return {
    isMissingRemoteDraft,
    isStaleDraftConflict,
    hasDraftProjectionGap,
    draftRecoveryReason,
    draftToolbarState: deriveCanvasDraftToolbarState({
      draftSaveStatus,
      recoveryReason: draftRecoveryReason,
    }),
    isDraftRecoveryBlocked:
      isMissingRemoteDraft || isStaleDraftConflict || hasDraftProjectionGap,
  };
}

function canMutateCanvasGraph(args: {
  canPersistDraftTransport: boolean;
  draftAccessState: CanvasDraftAccessState;
  draftRecoveryState: CanvasDraftRecoveryState;
}): boolean {
  const { canPersistDraftTransport, draftAccessState, draftRecoveryState } = args;

  return (
    canPersistDraftTransport &&
    !draftRecoveryState.isDraftRecoveryBlocked &&
    !draftAccessState.isDraftAccessBlocked &&
    !draftAccessState.isDraftReadOnly
  );
}

export function deriveCanvasAuthoringState({
  draftSession,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  inspectorNodeId,
  draftSaveStatus,
  canPersistDraftTransport,
  draftReadModel,
}: DeriveCanvasAuthoringStateArgs): CanvasAuthoringState {
  const visibleScope = deriveVisibleScope({
    draftSession,
    canonicalNodes,
    canonicalEdges,
  });
  const uiScope = deriveCanvasUiScope(
    draftSession,
    visibleScope,
    selectedNodeIds,
    inspectorNodeId
  );
  const draftAccessState = deriveCanvasDraftAccessState(draftReadModel);
  const draftRecoveryState = deriveCanvasDraftRecoveryState({
    draftSession,
    visibleScope,
    draftSaveStatus,
  });

  return {
    visibleScope,
    uiScope,
    executionScope: deriveExecutionScope({
      visibleScope,
      selectedNodeIds: uiScope.selectedNodeIds,
    }),
    ...draftAccessState,
    ...draftRecoveryState,
    canMutateGraph: canMutateCanvasGraph({
      canPersistDraftTransport,
      draftAccessState,
      draftRecoveryState,
    }),
  };
}
