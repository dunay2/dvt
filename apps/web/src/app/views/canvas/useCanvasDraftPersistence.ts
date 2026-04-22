import type { Dispatch, SetStateAction } from 'react';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';
import type { CanvasDraftAuthoringPayload } from './canvasDraftAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftAttemptRefs,
  DraftSaveStatus,
  GraphAuthorityQueryState,
  GraphDraftQueryState,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import { useCanvasDraftAutosave } from './useCanvasDraftAutosave';
import { useCanvasDraftRecoveryActions } from './useCanvasDraftRecoveryActions';

type UseCanvasDraftPersistenceArgs = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  graphAuthorityQuery: GraphAuthorityQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  currentDraftPayloadSignature: string;
  currentDraftPayload: CanvasDraftAuthoringPayload;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
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
  graphAuthorityQuery,
  draftQueryCache,
  draftSession,
  setDraftSession,
  currentDraftPayloadSignature,
  currentDraftPayload,
  canPersistGraphDraft,
  canPersistCurrentDraft,
  refs,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  applyReloadedRemoteDraft,
  createDraftIdempotencyKey,
}: UseCanvasDraftPersistenceArgs) {
  useCanvasDraftAutosave({
    draftRepository,
    graphDraftQuery,
    graphAuthorityQuery,
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

  const { reloadLatestDraft } = useCanvasDraftRecoveryActions({
    draftQueryCache,
    refs,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    applyReloadedRemoteDraft,
  });

  return {
    reloadLatestDraft,
  };
}
