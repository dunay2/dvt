import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import type { DraftAttemptRefs, DraftSaveStatus } from './canvasDraftLifecycle.types';
import { buildCanvasCanonicalSnapshot } from './canvasCanonicalSnapshot';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import { clearSaveDebounce } from './canvasDraftPersistenceRuntime';

type UseCanvasDraftRecoveryActionsArgs = {
  draftQueryCache: CanvasDraftQueryCache;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  applyReloadedRemoteDraft: (
    remoteDraftState: CanvasAuthoringDraftReadModel,
    reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
  ) => void;
};

function buildCanonicalSnapshotFromDraftState(
  remoteDraftState: CanvasAuthoringDraftReadModel
): CanvasDraftLifecycleCanonicalSnapshot {
  if (remoteDraftState.semanticGraph != null) {
    return buildCanvasCanonicalSnapshot(
      remoteDraftState.semanticGraph.canonicalNodes,
      remoteDraftState.semanticGraph.canonicalEdges
    );
  }

  const remoteDraft = remoteDraftState.record;
  if (remoteDraft == null) {
    return buildCanvasCanonicalSnapshot([], []);
  }

  return buildCanvasCanonicalSnapshot(
    remoteDraft.draft.nodeIds.map((id) => ({ id })),
    remoteDraft.draft.edges
  );
}

export function useCanvasDraftRecoveryActions({
  draftQueryCache,
  refs,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  applyReloadedRemoteDraft,
}: UseCanvasDraftRecoveryActionsArgs) {
  const reloadLatestDraft = useCallback(() => {
    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    refs.lastFailedSignatureRef.current = null;
    const reloadGeneration = refs.saveAttemptGenerationRef.current;
    setDraftSaveStatus('idle');

    draftQueryCache
      .fetchLatestRemoteDraftState()
      .then((remoteDraftState) => {
        if (refs.saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        applyReloadedRemoteDraft(
          remoteDraftState,
          buildCanonicalSnapshotFromDraftState(remoteDraftState)
        );
      })
      .catch(() => {
        if (refs.saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        setDraftSaveStatus('idle');
      });
  }, [
    applyReloadedRemoteDraft,
    draftQueryCache,
    invalidateInFlightSaveAttempt,
    refs,
    setDraftSaveStatus,
  ]);

  return {
    reloadLatestDraft,
  };
}
