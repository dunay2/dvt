import type { Dispatch, SetStateAction } from 'react';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';
import type { CanvasDraftAuthoringPayload } from './canvasDraftAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftAttemptRefs,
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphSnapshotQueryState,
} from './canvasDraftLifecycle.types';
import type {
  CanvasDraftLifecycleCanonicalSnapshot,
  CanvasDraftLifecycleGraphStrategy,
} from './canvasDraftLifecycleSnapshot';
import { useCanvasDraftAutosave } from './useCanvasDraftAutosave';
import { useCanvasDraftRecoveryActions } from './useCanvasDraftRecoveryActions';

type UseCanvasDraftPersistenceArgs = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  graphSnapshotQuery: GraphSnapshotQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  currentDraftPayloadSignature: string;
  currentDraftPayload: CanvasDraftAuthoringPayload;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  graphStrategy: CanvasDraftLifecycleGraphStrategy;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  applyReloadedRemoteDraft: (
    remoteDraftState: CanvasDraftReadModel,
    reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
  ) => void;
  createDraftIdempotencyKey: () => string;
};

export function useCanvasDraftPersistence({
  draftRepository,
  graphDraftQuery,
  graphSnapshotQuery,
  draftQueryCache,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
  currentDraftPayloadSignature,
  currentDraftPayload,
  canPersistGraphDraft,
  canPersistCurrentDraft,
  graphStrategy,
  refs,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  applyReloadedRemoteDraft,
  createDraftIdempotencyKey,
}: UseCanvasDraftPersistenceArgs) {
  useCanvasDraftAutosave({
    draftRepository,
    graphDraftQuery,
    graphSnapshotQuery,
    draftQueryCache,
    draftSession,
    setDraftSession,
    currentDraftPayloadSignature,
    currentDraftPayload,
    canPersistGraphDraft,
    canPersistCurrentDraft,
    refs,
    setDraftSaveStatus,
    createDraftIdempotencyKey,
  });

  const { reloadLatestDraft, adoptCurrentWorkspaceSnapshot } =
    useCanvasDraftRecoveryActions({
      draftQueryCache,
      setDraftSession,
      canonicalSnapshot,
      graphStrategy,
      refs,
      setDraftSaveStatus,
      invalidateInFlightSaveAttempt,
      applyReloadedRemoteDraft,
    });

  return {
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
  };
}
