/** Owned concern: derive route-safe Canvas authoring scopes, recovery posture, and mutation capability from draft-session truth. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  deriveCanvasDraftAccessPosture,
  isCanvasDraftPostureMutationBlocked,
  toCanvasDraftToolbarState,
  type CanvasDraftAccessPosture,
} from './canvasDraftAccessPostureModel';
import type { CanvasDraftAuthTransportPosture } from './canvasDraftAuthTransportPosture';
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
} from './canvasDraftToolbarState';
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
  authTransportPosture: CanvasDraftAuthTransportPosture;
};

export type CanvasAuthoringState = {
  visibleScope: VisibleCanvasScope;
  uiScope: CanvasUiScope;
  executionScope: ExecutionCanvasScope;
  draftAccessMode: CanvasDraftAccessMode;
  draftCapabilityReason: CanvasDraftReadModel['capabilityReason'];
  draftFormatError: CanvasDraftReadModel['formatError'];
  draftFormatMeta: CanvasDraftReadModel['formatMeta'];
  draftAccessPosture: CanvasDraftAccessPosture;
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
  draftReadModel: CanvasDraftReadModel | undefined,
  draftAccessPosture: CanvasDraftAccessPosture
): CanvasDraftAccessState {
  const draftAccessMode = draftReadModel?.accessMode ?? 'unknown';
  const isDraftReadOnly = draftAccessPosture.kind === 'read_only';
  const isDraftAccessBlocked =
    draftAccessPosture.kind === 'unauthenticated' ||
    draftAccessPosture.kind === 'forbidden_scope' ||
    draftAccessPosture.kind === 'format_error' ||
    draftAccessPosture.kind === 'unknown_pending';

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
    isDraftRecoveryBlocked: isMissingRemoteDraft || isStaleDraftConflict || hasDraftProjectionGap,
  };
}

function canMutateCanvasGraph(args: {
  canPersistDraftTransport: boolean;
  draftAccessPosture: CanvasDraftAccessPosture;
  draftRecoveryState: CanvasDraftRecoveryState;
}): boolean {
  const { canPersistDraftTransport, draftAccessPosture, draftRecoveryState } = args;

  return (
    canPersistDraftTransport &&
    !draftRecoveryState.isDraftRecoveryBlocked &&
    !isCanvasDraftPostureMutationBlocked(draftAccessPosture)
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
  authTransportPosture,
}: DeriveCanvasAuthoringStateArgs): CanvasAuthoringState {
  const visibleScope = deriveVisibleScope({
    draftSession,
    canonicalNodes,
    canonicalEdges,
  });
  const uiScope = deriveCanvasUiScope(draftSession, visibleScope, selectedNodeIds, inspectorNodeId);
  const draftRecoveryState = deriveCanvasDraftRecoveryState({
    draftSession,
    visibleScope,
    draftSaveStatus,
  });
  const draftAccessMode = draftReadModel?.accessMode ?? 'unknown';
  const draftAccessPosture = deriveCanvasDraftAccessPosture({
    draftAccessMode,
    draftCapabilityReason: draftReadModel?.capabilityReason ?? null,
    draftFormatError: draftReadModel?.formatError ?? null,
    authTransportPosture,
    recoveryReason: draftRecoveryState.draftRecoveryReason,
    draftSaveStatus,
  });
  const draftAccessState = deriveCanvasDraftAccessState(draftReadModel, draftAccessPosture);

  return {
    visibleScope,
    uiScope,
    executionScope: deriveExecutionScope({
      visibleScope,
      selectedNodeIds: uiScope.selectedNodeIds,
    }),
    ...draftAccessState,
    ...draftRecoveryState,
    draftAccessPosture,
    draftToolbarState: toCanvasDraftToolbarState(draftAccessPosture),
    canMutateGraph: canMutateCanvasGraph({
      canPersistDraftTransport,
      draftAccessPosture,
      draftRecoveryState,
    }),
  };
}
