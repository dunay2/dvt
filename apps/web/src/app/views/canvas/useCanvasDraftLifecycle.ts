/** Owned concern: compose bootstrapping, persistence, save-attempt policy, and first-canvas creation into one narrow Canvas draft-lifecycle seam. */
import { useCallback, useState } from 'react';

import { canvasDraftSession } from './canvasDraftSession';
import { createCanvasDraftIdempotencyKey } from './canvasDraftIdempotencyKey';
import type {
  CanvasDraftLifecycle,
  DraftSaveStatus,
  UseCanvasDraftLifecycleArgs,
} from './canvasDraftLifecycle.types';
import { useCanvasCurrentDraftPayload } from './useCanvasCurrentDraftPayload';
import { useCanvasDraftAttemptRefs } from './useCanvasDraftAttemptRefs';
import { useCanvasDraftBootstrapSync } from './useCanvasDraftBootstrapSync';
import { useCanvasDraftPersistence } from './useCanvasDraftPersistence';

export function useCanvasDraftLifecycle({
  draftRepository,
  graphDraftQuery,
  draftQueryCache,
  workspaceLayoutKey,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
  graphNodes,
  canonicalNodes,
  canonicalEdges,
  graphAuthorityQuery,
  canPersistGraphDraft,
  workspaceScope,
  previewProvenanceConfig,
  setCanvasNodePositions,
}: UseCanvasDraftLifecycleArgs): CanvasDraftLifecycle {
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');
  const { refs, invalidateInFlightSaveAttempt } = useCanvasDraftAttemptRefs();
  const { currentDraftPayload, currentDraftPayloadSignature, canPersistCurrentDraft } =
    useCanvasCurrentDraftPayload(
      graphNodes,
      draftSession,
      graphDraftQuery.data?.record?.draft.canvas ?? null,
      canonicalNodes,
      canonicalEdges,
      workspaceScope,
      previewProvenanceConfig
    );

  const { applyReloadedRemoteDraft } = useCanvasDraftBootstrapSync({
    graphDraftQuery,
    graphAuthorityQuery,
    draftQueryCache,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    setCanvasNodePositions,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    lastSavedSignatureRef: refs.lastSavedSignatureRef,
  });
  const { reloadLatestDraft } = useCanvasDraftPersistence({
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
    createDraftIdempotencyKey: createCanvasDraftIdempotencyKey,
  });

  const handleCreateCanvasDocument = useCallback<
    CanvasDraftLifecycle['handleCreateCanvasDocument']
  >(
    async (command) => {
      if (!canPersistGraphDraft || graphDraftQuery.isPending || graphDraftQuery.isError) {
        return;
      }

      const existingRecord = graphDraftQuery.data?.record;
      if (existingRecord != null) {
        return;
      }

      setDraftSaveStatus('saving');

      try {
        const result = await draftRepository.saveGraphDraft({
          expectedRevision: null,
          idempotencyKey: createCanvasDraftIdempotencyKey(),
          draft: {
            projectedDraft: {
              canvas: {
                kind: command.kind,
                title: command.title,
              },
              nodeIds: [],
              nodePositions: {},
              edges: [],
            },
            canonicalNodes: [],
            canonicalEdges: [],
            workspaceScope,
            previewProvenanceConfig,
          },
        });

        if (result.outcome === 'saved') {
          refs.lastSavedSignatureRef.current = canvasDraftSession.baseline.serialize(
            result.record.draft
          );
          draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
          setDraftSession((currentSession) =>
            canvasDraftSession.machine.applySaveSuccess(currentSession, result.record)
          );
          setDraftSaveStatus('saved');
          return;
        }

        draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
        if (result.current != null) {
          setDraftSession((currentSession) =>
            canvasDraftSession.machine.applyConflict(currentSession, result.current)
          );
        }
        setDraftSaveStatus('idle');
      } catch {
        setDraftSaveStatus('idle');
      }
    },
    [
      canPersistGraphDraft,
      draftQueryCache,
      draftRepository,
      graphDraftQuery.data,
      graphDraftQuery.isError,
      graphDraftQuery.isPending,
      previewProvenanceConfig,
      refs.lastSavedSignatureRef,
      setDraftSession,
      setDraftSaveStatus,
      workspaceScope,
    ]
  );

  return {
    draftSaveStatus,
    reloadLatestDraft,
    handleCreateCanvasDocument,
  };
}
