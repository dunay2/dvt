/** Owned concern: derive route-safe Canvas authoring scopes, recovery posture, and mutation capability from draft-session truth. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  deriveCanvasDraftAccessPosture,
  isCanvasDraftPostureMutationBlocked,
  toCanvasDraftStatusState,
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
  deriveCanvasDraftStatusState,
  deriveDraftRecoveryReason,
  type CanvasDraftRecoveryReason,
  type CanvasDraftStatusState,
} from './canvasDraftStatusState';
import type { CanvasDraftAccessMode, CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';

type DeriveCanvasAuthoringStateArgs = {
  draftSession: CanvasDraftSession;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  draftSaveStatus: DraftSaveStatus;
  canMutateGraphTransport: boolean;
  draftReadModel: CanvasAuthoringDraftReadModel | undefined;
  authTransportPosture: CanvasDraftAuthTransportPosture;
};

export type CanvasAuthoringState = {
  visibleScope: VisibleCanvasScope;
  uiScope: CanvasUiScope;
  executionScope: ExecutionCanvasScope;
  draftAccessMode: CanvasDraftAccessMode;
  draftCapabilityReason: CanvasAuthoringDraftReadModel['capabilityReason'];
  draftFormatError: CanvasAuthoringDraftReadModel['formatError'];
  draftFormatMeta: CanvasAuthoringDraftReadModel['formatMeta'];
  draftAccessPosture: CanvasDraftAccessPosture;
  isMissingRemoteDraft: boolean;
  isStaleDraftConflict: boolean;
  hasDraftProjectionGap: boolean;
  draftRecoveryReason: CanvasDraftRecoveryReason;
  draftStatusState: CanvasDraftStatusState;
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
  | 'draftStatusState'
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
  draftReadModel: CanvasAuthoringDraftReadModel | undefined,
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
    draftStatusState: deriveCanvasDraftStatusState({
      draftSaveStatus,
      recoveryReason: draftRecoveryReason,
    }),
    isDraftRecoveryBlocked: isMissingRemoteDraft || isStaleDraftConflict || hasDraftProjectionGap,
  };
}

function canMutateCanvasGraph(args: {
  canMutateGraphTransport: boolean;
  draftAccessPosture: CanvasDraftAccessPosture;
  draftRecoveryState: CanvasDraftRecoveryState;
}): boolean {
  const { canMutateGraphTransport, draftAccessPosture, draftRecoveryState } = args;

  return (
    canMutateGraphTransport &&
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
  canMutateGraphTransport,
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
      visibleNodeIds: visibleScope.visibleNodeIds,
      selectedNodeIds,
    }),
    ...draftAccessState,
    ...draftRecoveryState,
    draftAccessPosture,
    draftStatusState: toCanvasDraftStatusState(draftAccessPosture),
    canMutateGraph: canMutateCanvasGraph({
      canMutateGraphTransport,
      draftAccessPosture,
      draftRecoveryState,
    }),
  };
}
