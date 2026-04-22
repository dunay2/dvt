/** Owned concern: compose bootstrapping, persistence, and save-attempt policy into one narrow Canvas draft-lifecycle seam. */
import { useState } from 'react';

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

  return {
    draftSaveStatus,
    reloadLatestDraft,
  };
}
