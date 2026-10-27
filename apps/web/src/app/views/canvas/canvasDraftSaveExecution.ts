import type { Dispatch, SetStateAction } from 'react';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository, CanvasDraftSaveResult } from './canvasDraftRepository';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftAttemptRefs,
  DraftSaveCompletion,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import {
  applyConflictResolution,
  applySavedDraftResolution,
  type DraftSaveAttempt,
  isStaleSaveResolution,
  markDraftSaving,
  restoreEditingAfterSaveFailure,
  startNextSaveAttempt,
} from './canvasDraftPersistenceRuntime';

type SetDraftSession = Dispatch<SetStateAction<CanvasDraftSession>>;
type SetDraftSaveStatus = Dispatch<SetStateAction<DraftSaveStatus>>;

type SaveResolutionContext = {
  refs: DraftAttemptRefs;
  saveAttempt: DraftSaveAttempt;
  draftQueryCache: CanvasDraftQueryCache;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  currentDraftPayloadSignature: string;
  refreshWorkspaceFilesAfterSave: boolean;
};

type SaveFailureContext = {
  refs: DraftAttemptRefs;
  saveAttempt: DraftSaveAttempt;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  currentDraftPayloadSignature: string;
};

export type PerformCanvasDraftSaveArgs = {
  refs: DraftAttemptRefs;
  draftRepository: CanvasDraftRepository;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  draftSession: CanvasDraftSession;
  createDraftIdempotencyKey: () => string;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  draftQueryCache: CanvasDraftQueryCache;
  currentDraftPayloadSignature: string;
  refreshWorkspaceFilesAfterSave: boolean;
};

function resolveDraftSaveSuccess(
  result: CanvasDraftSaveResult,
  {
    refs,
    saveAttempt,
    draftQueryCache,
    setDraftSession,
    setDraftSaveStatus,
    currentDraftPayloadSignature,
    refreshWorkspaceFilesAfterSave,
  }: SaveResolutionContext
) {
  if (isStaleSaveResolution(refs, saveAttempt)) {
    return;
  }

  refs.confirmedSaveReceiptRef.current = {
    generation: saveAttempt.generation,
    signature: currentDraftPayloadSignature,
    result,
  };
  if (result.outcome === 'conflict') {
    applyConflictResolution({
      draftQueryCache,
      setDraftSession,
      setDraftSaveStatus: (status) => setDraftSaveStatus(status),
      refs,
      currentState: result.remoteDraftState,
    });
    refs.activeSaveAttemptRef.current = null;
    return;
  }

  applySavedDraftResolution({
    draftQueryCache,
    currentDraftPayloadSignature,
    refs,
    setDraftSession,
    setDraftSaveStatus: (status) => setDraftSaveStatus(status),
    remoteDraftState: result.remoteDraftState,
  });
  refs.activeSaveAttemptRef.current = null;
  if (refreshWorkspaceFilesAfterSave) {
    void draftQueryCache.refreshWorkspaceFilesAfterSourceRemoval().catch(() => undefined);
  }
}

function resolveDraftSaveFailure({
  refs,
  saveAttempt,
  setDraftSession,
  setDraftSaveStatus,
  currentDraftPayloadSignature,
}: SaveFailureContext) {
  if (isStaleSaveResolution(refs, saveAttempt)) {
    return;
  }

  refs.activeSaveAttemptRef.current = null;
  refs.confirmedSaveReceiptRef.current = null;
  restoreEditingAfterSaveFailure(refs, currentDraftPayloadSignature, setDraftSession, (status) =>
    setDraftSaveStatus(status)
  );
}

export function performCanvasDraftSave({
  refs,
  draftRepository,
  currentDraftPayload,
  draftSession,
  createDraftIdempotencyKey,
  setDraftSession,
  setDraftSaveStatus,
  draftQueryCache,
  currentDraftPayloadSignature,
  refreshWorkspaceFilesAfterSave,
}: PerformCanvasDraftSaveArgs): Promise<DraftSaveCompletion> {
  const activeSaveAttempt = refs.activeSaveAttemptRef.current;
  if (activeSaveAttempt != null) return activeSaveAttempt.completion;

  const receipt = refs.confirmedSaveReceiptRef.current;
  const confirmed = receipt?.generation === refs.saveAttemptGenerationRef.current ? receipt : null;
  if (confirmed?.result.outcome === 'conflict') {
    setDraftSaveStatus('idle');
    return Promise.resolve(confirmed.result);
  }
  if (confirmed?.signature === currentDraftPayloadSignature) {
    setDraftSaveStatus('saved');
    return Promise.resolve(confirmed.result);
  }
  const confirmedRevision =
    confirmed?.result.outcome === 'saved' ? confirmed.result.record.revision : null;
  const saveAttempt = startNextSaveAttempt(refs, currentDraftPayloadSignature);
  markDraftSaving(
    setDraftSession,
    confirmedRevision == null
      ? draftSession
      : { ...draftSession, syncState: 'editing', draftRevision: confirmedRevision }
  );
  setDraftSaveStatus('saving');

  void (async () => {
    try {
      const result = await draftRepository.saveGraphDraft({
        draft: currentDraftPayload,
        expectedRevision: confirmedRevision ?? draftSession.draftRevision,
        idempotencyKey: createDraftIdempotencyKey(),
      });
      resolveDraftSaveSuccess(result, {
        refs,
        saveAttempt,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        currentDraftPayloadSignature,
        refreshWorkspaceFilesAfterSave,
      });
      saveAttempt.settle(result);
    } catch {
      resolveDraftSaveFailure({
        refs,
        saveAttempt,
        setDraftSession,
        setDraftSaveStatus,
        currentDraftPayloadSignature,
      });
      saveAttempt.settle({ outcome: 'failed' });
    }
  })();

  return saveAttempt.completion;
}
