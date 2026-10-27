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
  DraftSaveCompletion,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import { clearSaveDebounce } from './canvasDraftPersistenceRuntime';
import { performCanvasDraftSave } from './canvasDraftSaveExecution';
import { canvasViewCopy } from './copy';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';

const DRAFT_SAVE_SETTLE_TIMEOUT_MS = 5000;

type UseCanvasExecutionDraftFlushArgs = {
  draftRepository: CanvasDraftRepository;
  draftQueryCache: CanvasDraftQueryCache;
  graphDraftState: CanvasAuthoringDraftReadModel | undefined;
  draftSession: CanvasDraftSession;
  draftSaveStatus: DraftSaveStatus;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  currentDraftPayloadSignature: string;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  refs: DraftAttemptRefs;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
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

async function waitForDraftSaveToSettle(
  completion: Promise<DraftSaveCompletion>,
  deadline: number
): Promise<DraftSaveCompletion | null> {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      completion,
      new Promise<null>((resolve) => {
        timer = globalThis.setTimeout(() => resolve(null), Math.max(0, deadline - Date.now()));
      }),
    ]);
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function useCanvasExecutionDraftFlush({
  draftRepository,
  draftQueryCache,
  graphDraftState,
  draftSession,
  draftSaveStatus,
  currentDraftPayload,
  currentDraftPayloadSignature,
  canPersistGraphDraft,
  canPersistCurrentDraft,
  refs,
  setDraftSession,
  setDraftSaveStatus,
  createDraftIdempotencyKey,
}: UseCanvasExecutionDraftFlushArgs): CanvasDraftLifecycle['flushDraftForExecution'] {
  const latestFlushInputRef = useRef({
    canPersistGraphDraft,
    canPersistCurrentDraft,
    currentDraftPayload,
    currentDraftPayloadSignature,
    draftSession,
    draftSaveStatus,
    graphDraftState,
  });
  latestFlushInputRef.current = {
    canPersistGraphDraft,
    canPersistCurrentDraft,
    currentDraftPayload,
    currentDraftPayloadSignature,
    draftSession,
    draftSaveStatus,
    graphDraftState,
  };

  return useCallback<CanvasDraftLifecycle['flushDraftForExecution']>(async () => {
    const generation = refs.saveAttemptGenerationRef.current;
    const deadline = Date.now() + DRAFT_SAVE_SETTLE_TIMEOUT_MS;

    while (true) {
      const latest = latestFlushInputRef.current;
      if (generation !== refs.saveAttemptGenerationRef.current) {
        return {
          ok: false,
          message: canvasViewCopy.staleDraftMessage,
        };
      }
      if (!latest.canPersistGraphDraft || !latest.canPersistCurrentDraft) {
        return {
          ok: false,
          message: canvasViewCopy.planUnableToCreateMessage,
        };
      }

      const activeSaveAttempt = refs.activeSaveAttemptRef.current;
      if (activeSaveAttempt != null) {
        const result = await waitForDraftSaveToSettle(activeSaveAttempt.completion, deadline);
        if (result == null) return { ok: false, message: canvasViewCopy.savingDraftLabel };
        if (result.outcome !== 'saved') {
          return {
            ok: false,
            message:
              result.outcome === 'failed'
                ? canvasViewCopy.draftSaveFailedLabel
                : canvasViewCopy.staleDraftMessage,
          };
        }
        continue;
      }

      const receipt = refs.confirmedSaveReceiptRef.current;
      const confirmed = receipt?.generation === generation ? receipt : null;
      if (confirmed?.result.outcome === 'conflict') {
        return { ok: false, message: canvasViewCopy.staleDraftMessage };
      }
      if (confirmed?.signature === latest.currentDraftPayloadSignature) {
        const graph = projectFlushGraph(confirmed.result.remoteDraftState);
        return graph == null
          ? { ok: false, message: canvasViewCopy.planUnableToCreateMessage }
          : { ok: true, ...graph };
      }

      if (
        (latest.draftSaveStatus === 'saving' || latest.draftSession.syncState === 'saving') &&
        refs.saveDebounceTimerRef.current == null &&
        confirmed == null
      ) {
        return { ok: false, message: canvasViewCopy.savingDraftLabel };
      }
      if (latest.draftSession.syncState === 'conflict') {
        return { ok: false, message: canvasViewCopy.staleDraftMessage };
      }
      if (
        latest.currentDraftPayloadSignature === refs.lastFailedSignatureRef.current ||
        (latest.draftSaveStatus === 'failed' && confirmed == null)
      ) {
        return { ok: false, message: canvasViewCopy.draftSaveFailedLabel };
      }
      if (
        latest.currentDraftPayloadSignature === refs.lastSavedSignatureRef.current &&
        latest.graphDraftState?.record != null
      ) {
        const graph = projectFlushGraph(latest.graphDraftState);
        return graph == null
          ? { ok: false, message: canvasViewCopy.planUnableToCreateMessage }
          : { ok: true, ...graph };
      }

      if (confirmed == null && latest.draftSession.draftRevision == null) {
        return { ok: false, message: canvasViewCopy.draftSaveFailedLabel };
      }
      clearSaveDebounce(refs);
      void performCanvasDraftSave({
        refs,
        draftRepository,
        draftQueryCache,
        draftSession: latest.draftSession,
        currentDraftPayload: latest.currentDraftPayload,
        currentDraftPayloadSignature: latest.currentDraftPayloadSignature,
        createDraftIdempotencyKey,
        setDraftSession,
        setDraftSaveStatus,
        refreshWorkspaceFilesAfterSave: false,
      });
    }
  }, [
    canPersistGraphDraft,
    createDraftIdempotencyKey,
    draftQueryCache,
    draftRepository,
    refs,
    setDraftSaveStatus,
    setDraftSession,
  ]);
}
