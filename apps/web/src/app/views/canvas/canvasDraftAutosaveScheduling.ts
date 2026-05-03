import type { Dispatch, SetStateAction } from 'react';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftAttemptRefs,
  DraftSaveStatus,
  GraphAuthorityQueryState,
  GraphDraftQueryState,
} from './canvasDraftLifecycle.types';
import {
  clearSaveDebounce,
  DRAFT_SAVE_DEBOUNCE_MS,
  shouldWaitForPersistenceReadiness,
} from './canvasDraftPersistenceRuntime';
import { performCanvasDraftAutosave } from './canvasDraftAutosaveExecution';

type SetDraftSession = Dispatch<SetStateAction<CanvasDraftSession>>;
type SetDraftSaveStatus = Dispatch<SetStateAction<DraftSaveStatus>>;

type AutosaveOutcome =
  | { kind: 'wait' }
  | { kind: 'clear_and_idle' }
  | { kind: 'idle_if_saving' }
  | { kind: 'idle' }
  | { kind: 'schedule' };

export type CanvasDraftAutosaveSchedulingArgs = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  graphAuthorityQuery: GraphAuthorityQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  draftSession: CanvasDraftSession;
  setDraftSession: SetDraftSession;
  currentDraftPayloadSignature: string;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: SetDraftSaveStatus;
  createDraftIdempotencyKey: () => string;
};

function setIdleDraftSaveStatus(setDraftSaveStatus: SetDraftSaveStatus): void {
  setDraftSaveStatus((currentStatus) => (currentStatus === 'idle' ? currentStatus : 'idle'));
}

function setIdleDraftSaveStatusOnlyWhenSaving(setDraftSaveStatus: SetDraftSaveStatus): void {
  setDraftSaveStatus((currentStatus) => (currentStatus === 'saving' ? 'idle' : currentStatus));
}

function resolveAutosaveOutcome(args: {
  graphAuthorityQuery: GraphAuthorityQueryState;
  graphDraftQuery: GraphDraftQueryState;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  draftSession: CanvasDraftSession;
  currentDraftPayloadSignature: string;
  lastSavedSignature: string | null;
}): AutosaveOutcome {
  if (shouldWaitForPersistenceReadiness(args.graphAuthorityQuery, args.graphDraftQuery)) {
    return { kind: 'wait' };
  }

  if (!args.canPersistGraphDraft || !args.canPersistCurrentDraft) {
    return { kind: 'clear_and_idle' };
  }

  if (args.draftSession.syncState !== 'editing') {
    return { kind: 'idle_if_saving' };
  }

  if (args.currentDraftPayloadSignature === args.lastSavedSignature) {
    return { kind: 'idle' };
  }

  return { kind: 'schedule' };
}

function applyAutosaveNonSchedulingOutcome(
  outcome: Exclude<AutosaveOutcome, { kind: 'schedule' }>,
  args: {
    refs: DraftAttemptRefs;
    setDraftSaveStatus: SetDraftSaveStatus;
  }
): void {
  if (outcome.kind === 'wait') {
    return;
  }

  if (outcome.kind === 'clear_and_idle') {
    clearSaveDebounce(args.refs);
    setIdleDraftSaveStatus(args.setDraftSaveStatus);
    return;
  }

  if (outcome.kind === 'idle_if_saving') {
    setIdleDraftSaveStatusOnlyWhenSaving(args.setDraftSaveStatus);
    return;
  }

  setIdleDraftSaveStatus(args.setDraftSaveStatus);
}

function scheduleCanvasDraftAutosave(args: {
  refs: DraftAttemptRefs;
  draftRepository: CanvasDraftRepository;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  draftSession: CanvasDraftSession;
  createDraftIdempotencyKey: () => string;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  draftQueryCache: CanvasDraftQueryCache;
  currentDraftPayloadSignature: string;
}): () => void {
  clearSaveDebounce(args.refs);

  args.refs.saveDebounceTimerRef.current = globalThis.setTimeout(() => {
    performCanvasDraftAutosave({
      refs: args.refs,
      draftRepository: args.draftRepository,
      currentDraftPayload: args.currentDraftPayload,
      draftSession: args.draftSession,
      createDraftIdempotencyKey: args.createDraftIdempotencyKey,
      setDraftSession: args.setDraftSession,
      setDraftSaveStatus: args.setDraftSaveStatus,
      draftQueryCache: args.draftQueryCache,
      currentDraftPayloadSignature: args.currentDraftPayloadSignature,
    });
  }, DRAFT_SAVE_DEBOUNCE_MS);

  return () => {
    clearSaveDebounce(args.refs);
  };
}

export function runCanvasDraftAutosaveEffect(
  args: CanvasDraftAutosaveSchedulingArgs
): void | (() => void) {
  const outcome = resolveAutosaveOutcome({
    graphAuthorityQuery: args.graphAuthorityQuery,
    graphDraftQuery: args.graphDraftQuery,
    canPersistGraphDraft: args.canPersistGraphDraft,
    canPersistCurrentDraft: args.canPersistCurrentDraft,
    draftSession: args.draftSession,
    currentDraftPayloadSignature: args.currentDraftPayloadSignature,
    lastSavedSignature: args.refs.lastSavedSignatureRef.current,
  });

  if (outcome.kind !== 'schedule') {
    applyAutosaveNonSchedulingOutcome(outcome, {
      refs: args.refs,
      setDraftSaveStatus: args.setDraftSaveStatus,
    });
    return;
  }

  return scheduleCanvasDraftAutosave({
    refs: args.refs,
    draftRepository: args.draftRepository,
    currentDraftPayload: args.currentDraftPayload,
    draftSession: args.draftSession,
    createDraftIdempotencyKey: args.createDraftIdempotencyKey,
    setDraftSession: args.setDraftSession,
    setDraftSaveStatus: args.setDraftSaveStatus,
    draftQueryCache: args.draftQueryCache,
    currentDraftPayloadSignature: args.currentDraftPayloadSignature,
  });
}
