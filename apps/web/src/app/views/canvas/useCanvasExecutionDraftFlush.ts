/** Owned concern: flush the current Canvas draft through the draft-save rail before execution. */
import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  CanvasDraftLifecycle,
  DraftAttemptRefs,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import {
  applyConflictResolution,
  applySavedDraftResolution,
  clearSaveDebounce,
  markDraftSaving,
  restoreEditingAfterSaveFailure,
} from './canvasDraftPersistenceRuntime';
import { canvasViewCopy } from './copy';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';

const DRAFT_SAVE_SETTLE_POLL_MS = 25;
const DRAFT_SAVE_SETTLE_TIMEOUT_MS = 5000;

type UseCanvasExecutionDraftFlushArgs = {
  draftRepository: CanvasDraftRepository;
  draftQueryCache: CanvasDraftQueryCache;
  graphDraftState: CanvasAuthoringDraftReadModel | undefined;
  draftSession: CanvasDraftSession;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  currentDraftPayloadSignature: string;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  refs: DraftAttemptRefs;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  createDraftIdempotencyKey: () => string;
};

function projectFlushGraph(draftState: CanvasAuthoringDraftReadModel) {
  const record = draftState.record;
  if (record == null) {
    return null;
  }

  const semanticGraph =
    draftState.semanticGraph ?? projectWorkspaceGraphAuthoringDraftSemanticGraph(record.draft);

  return {
    canonicalNodes: semanticGraph.canonicalNodes,
    canonicalEdges: semanticGraph.canonicalEdges,
    workspaceNodeIds: record.draft.nodeIds,
  };
}

async function waitForDraftSaveToSettle(latestFlushInputRef: {
  current: { draftSession: CanvasDraftSession };
}): Promise<boolean> {
  const startedAt = Date.now();

  while (latestFlushInputRef.current.draftSession.syncState === 'saving') {
    if (Date.now() - startedAt >= DRAFT_SAVE_SETTLE_TIMEOUT_MS) {
      return false;
    }

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, DRAFT_SAVE_SETTLE_POLL_MS);
    });
  }

  return true;
}

export function useCanvasExecutionDraftFlush({
  draftRepository,
  draftQueryCache,
  graphDraftState,
  draftSession,
  currentDraftPayload,
  currentDraftPayloadSignature,
  canPersistGraphDraft,
  canPersistCurrentDraft,
  refs,
  setDraftSession,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  createDraftIdempotencyKey,
}: UseCanvasExecutionDraftFlushArgs): CanvasDraftLifecycle['flushDraftForExecution'] {
  const latestFlushInputRef = useRef({
    canPersistGraphDraft,
    canPersistCurrentDraft,
    currentDraftPayload,
    currentDraftPayloadSignature,
    draftSession,
    graphDraftState,
  });
  latestFlushInputRef.current = {
    canPersistGraphDraft,
    canPersistCurrentDraft,
    currentDraftPayload,
    currentDraftPayloadSignature,
    draftSession,
    graphDraftState,
  };

  return useCallback<CanvasDraftLifecycle['flushDraftForExecution']>(async () => {
    let latest = latestFlushInputRef.current;

    if (!latest.canPersistGraphDraft || !latest.canPersistCurrentDraft) {
      return {
        ok: false,
        message: canvasViewCopy.planUnableToCreateMessage,
      };
    }

    if (latest.draftSession.syncState === 'saving') {
      const draftSaveSettled = await waitForDraftSaveToSettle(latestFlushInputRef);
      latest = latestFlushInputRef.current;
      if (!draftSaveSettled) {
        return {
          ok: false,
          message: canvasViewCopy.savingDraftLabel,
        };
      }
      if (!latest.canPersistGraphDraft || !latest.canPersistCurrentDraft) {
        return {
          ok: false,
          message: canvasViewCopy.planUnableToCreateMessage,
        };
      }
    }

    if (
      latest.currentDraftPayloadSignature === refs.lastSavedSignatureRef.current &&
      latest.graphDraftState?.record != null
    ) {
      const graph = projectFlushGraph(latest.graphDraftState);
      if (graph != null) {
        return {
          ok: true,
          ...graph,
        };
      }
    }

    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    markDraftSaving(setDraftSession, latest.draftSession);
    setDraftSaveStatus('saving');

    try {
      if (latest.draftSession.draftRevision == null) {
        throw new Error('Cannot flush a draft without a persisted revision.');
      }

      const result = await draftRepository.saveGraphDraft({
        draft: latest.currentDraftPayload,
        expectedRevision: latest.draftSession.draftRevision,
        idempotencyKey: createDraftIdempotencyKey(),
      });

      if (result.outcome === 'conflict') {
        applyConflictResolution({
          draftQueryCache,
          setDraftSession,
          setDraftSaveStatus,
          refs,
          currentState: result.remoteDraftState,
        });
        return {
          ok: false,
          message: canvasViewCopy.staleDraftMessage,
        };
      }

      applySavedDraftResolution({
        draftQueryCache,
        currentDraftPayloadSignature: latest.currentDraftPayloadSignature,
        refs,
        setDraftSession,
        setDraftSaveStatus,
        remoteDraftState: result.remoteDraftState,
      });

      const graph = projectFlushGraph(result.remoteDraftState);
      if (graph == null) {
        return {
          ok: false,
          message: canvasViewCopy.planUnableToCreateMessage,
        };
      }

      return {
        ok: true,
        ...graph,
      };
    } catch {
      restoreEditingAfterSaveFailure(
        refs,
        latest.currentDraftPayloadSignature,
        setDraftSession,
        setDraftSaveStatus
      );
      return {
        ok: false,
        message: canvasViewCopy.draftSaveFailedLabel,
      };
    }
  }, [
    canPersistGraphDraft,
    createDraftIdempotencyKey,
    draftQueryCache,
    draftRepository,
    invalidateInFlightSaveAttempt,
    refs,
    setDraftSaveStatus,
    setDraftSession,
  ]);
}
