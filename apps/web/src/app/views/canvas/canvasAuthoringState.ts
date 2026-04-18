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
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';

type DeriveCanvasAuthoringStateArgs = {
  draftSession: CanvasDraftSession;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  draftSaveStatus: DraftSaveStatus;
  canPersistDraftTransport: boolean;
};

export type CanvasAuthoringState = {
  visibleScope: VisibleCanvasScope;
  uiScope: CanvasUiScope;
  executionScope: ExecutionCanvasScope;
  isMissingRemoteDraft: boolean;
  isStaleDraftConflict: boolean;
  hasDraftProjectionGap: boolean;
  draftRecoveryReason: CanvasDraftRecoveryReason;
  draftToolbarState: CanvasDraftToolbarState;
  isDraftRecoveryBlocked: boolean;
  canMutateGraph: boolean;
};

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

export function deriveCanvasAuthoringState({
  draftSession,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  inspectorNodeId,
  draftSaveStatus,
  canPersistDraftTransport,
}: DeriveCanvasAuthoringStateArgs): CanvasAuthoringState {
  const visibleScope = deriveVisibleScope({
    draftSession,
    canonicalNodes,
    canonicalEdges,
  });
  const isMissingRemoteDraft = draftSession.syncState === 'missing_remote';
  const isStaleDraftConflict = draftSession.syncState === 'conflict';
  const hasDraftProjectionGap =
    draftSession.syncState !== 'bootstrapping' && !visibleScope.isProjectionComplete;
  const draftRecoveryReason = deriveDraftRecoveryReason({
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasDraftProjectionGap,
  });
  const draftToolbarState = deriveCanvasDraftToolbarState({
    draftSaveStatus,
    recoveryReason: draftRecoveryReason,
  });
  const isDraftRecoveryBlocked =
    isMissingRemoteDraft || isStaleDraftConflict || hasDraftProjectionGap;
  const uiScope = deriveCanvasUiScope(
    draftSession,
    visibleScope,
    selectedNodeIds,
    inspectorNodeId
  );

  return {
    visibleScope,
    uiScope,
    executionScope: deriveExecutionScope({
      visibleScope,
      selectedNodeIds: uiScope.selectedNodeIds,
    }),
    isMissingRemoteDraft,
    isStaleDraftConflict,
    hasDraftProjectionGap,
    draftRecoveryReason,
    draftToolbarState,
    isDraftRecoveryBlocked,
    canMutateGraph: canPersistDraftTransport && !isDraftRecoveryBlocked,
  };
}
