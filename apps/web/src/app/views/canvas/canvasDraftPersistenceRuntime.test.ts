import { describe, expect, it, vi } from 'vitest';

import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';
import { runCanvasDraftAutosaveEffect } from './canvasDraftAutosaveScheduling';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  isStaleSaveResolution,
  restoreEditingAfterSaveFailure,
} from './canvasDraftPersistenceRuntime';

function createDraftAttemptRefs(): DraftAttemptRefs {
  return {
    saveDebounceTimerRef: { current: null },
    lastSavedSignatureRef: { current: null },
    lastFailedSignatureRef: { current: null },
    saveAttemptGenerationRef: { current: 0 },
    nextSaveAttemptIdRef: { current: 0 },
    activeSaveAttemptRef: { current: null },
  };
}

describe('canvasDraftPersistenceRuntime', () => {
  it('treats a resolution as stale when the active save attempt was invalidated', () => {
    const refs = createDraftAttemptRefs();
    refs.saveAttemptGenerationRef.current = 2;

    expect(isStaleSaveResolution(refs, { id: 1, generation: 1 })).toBe(true);
  });

  it('keeps a matching active save attempt as current', () => {
    const refs = createDraftAttemptRefs();
    const saveAttempt = { id: 2, generation: 3 };
    refs.saveAttemptGenerationRef.current = saveAttempt.generation;
    refs.activeSaveAttemptRef.current = saveAttempt;

    expect(isStaleSaveResolution(refs, saveAttempt)).toBe(false);
  });

  it('holds a failed autosave signature until the draft changes', () => {
    const refs = {
      ...createDraftAttemptRefs(),
      lastFailedSignatureRef: { current: 'draft-signature-1' },
    };
    const setDraftSaveStatus = vi.fn();

    const cleanup = runCanvasDraftAutosaveEffect({
      refs: refs as DraftAttemptRefs,
      draftRepository: {} as never,
      graphDraftQuery: { isPending: false, isError: false, data: undefined },
      graphAuthorityQuery: { isPending: false, isError: false },
      draftQueryCache: {} as never,
      draftSession: {
        syncState: 'editing',
        baseline: { record: null },
        workingSet: {
          visibleNodeIds: [],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
        draftRevision: 'rev-1',
      },
      setDraftSession: vi.fn(),
      currentDraftPayloadSignature: 'draft-signature-1',
      currentDraftPayload: {} as never,
      canPersistGraphDraft: true,
      canPersistCurrentDraft: true,
      setDraftSaveStatus,
      createDraftIdempotencyKey: () => 'idem-1',
    });
    const scheduledRetry = typeof cleanup === 'function';
    if (typeof cleanup === 'function') {
      cleanup();
    }

    expect(scheduledRetry).toBe(false);
    expect(refs.saveDebounceTimerRef.current).toBeNull();
    expect(setDraftSaveStatus).toHaveBeenLastCalledWith('failed');
  });

  it('clears stale saving markers when restoring editing after save failure', () => {
    const refs = createDraftAttemptRefs();
    let session: CanvasDraftSession = {
      syncState: 'saving',
      baseline: { record: null },
      draftRevision: 'rev-imported',
      workingSet: {
        visibleNodeIds: ['node_1', 'node_imported'],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
      savingBaseRevision: 'rev-before-import',
      savingWorkingSet: {
        visibleNodeIds: ['node_1'],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const setDraftSession = vi.fn(
      (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => {
        session = updater(session);
      }
    );
    const setDraftSaveStatus = vi.fn();

    restoreEditingAfterSaveFailure(
      refs,
      'draft-signature-after-import',
      setDraftSession,
      setDraftSaveStatus
    );

    expect(session.syncState).toBe('editing');
    expect(session.savingBaseRevision).toBeUndefined();
    expect(session.savingWorkingSet).toBeUndefined();
    expect(setDraftSaveStatus).toHaveBeenCalledWith('failed');
  });
});
