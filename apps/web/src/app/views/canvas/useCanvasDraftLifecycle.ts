/** Owned concern: compose bootstrapping, persistence, save-attempt policy, and first-canvas creation into one narrow Canvas draft-lifecycle seam. */
import { useCallback, useState } from 'react';

import { createCanvasDraftIdempotencyKey } from './canvasDraftIdempotencyKey';
import type {
  CanvasDraftLifecycle,
  CanvasDraftLifecycleDto,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import { useCanvasCurrentDraftPayload } from './useCanvasCurrentDraftPayload';
import { useCanvasDraftAttemptRefs } from './useCanvasDraftAttemptRefs';
import { useCanvasDraftBootstrapSync } from './useCanvasDraftBootstrapSync';
import { useCanvasDraftPersistence } from './useCanvasDraftPersistence';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';

export function useCanvasDraftLifecycle({
  baseline,
  session,
  projection,
  policy,
}: CanvasDraftLifecycleDto): CanvasDraftLifecycle {
  const {
    draftRepository,
    graphDraftQuery,
    draftQueryCache,
    graphAuthorityQuery,
    workspaceLayoutKey,
  } = baseline;
  const {
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    persistedNodePositions,
    setCanvasNodePositions,
  } = session;
  const { graphNodes, canonicalNodes, canonicalEdges, workspaceScope, previewProvenanceConfig } =
    projection;
  const { canPersistGraphDraft } = policy;
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');
  const { refs, invalidateInFlightSaveAttempt } = useCanvasDraftAttemptRefs();
  const { currentDraftPayload, currentDraftPayloadSignature, canPersistCurrentDraft } =
    useCanvasCurrentDraftPayload({
      graphNodes,
      draftSession,
      canvasDocument: graphDraftQuery.data?.record?.draft.canvas ?? null,
      canonicalNodes,
      canonicalEdges,
      workspaceScope,
      previewProvenanceConfig,
    });

  const { applyReloadedRemoteDraft } = useCanvasDraftBootstrapSync({
    graphDraftQuery,
    graphAuthorityQuery,
    draftQueryCache,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    persistedNodePositions,
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
    async (command) =>
      await executeCreateCanvasDocumentCommand({
        command,
        draftRepository,
        graphDraftQuery,
        draftQueryCache,
        canPersistGraphDraft,
        setDraftSession,
        setDraftSaveStatus,
        lastSavedSignatureRef: refs.lastSavedSignatureRef,
        workspaceScope,
        previewProvenanceConfig,
      }),
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
