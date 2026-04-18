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
  queryClient,
  workspaceLayoutKey,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
  graphNodes,
  graphSnapshotQuery,
  canPersistGraphDraft,
  setCanvasNodePositions,
  graphStrategy,
}: UseCanvasDraftLifecycleArgs): CanvasDraftLifecycle {
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');
  const { refs, invalidateInFlightSaveAttempt } = useCanvasDraftAttemptRefs();
  const { currentDraftPayload, currentDraftPayloadSignature, canPersistCurrentDraft } =
    useCanvasCurrentDraftPayload(graphNodes, draftSession);

  const { applyReloadedRemoteDraft } = useCanvasDraftBootstrapSync({
    graphDraftQuery,
    graphSnapshotQuery,
    queryClient,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    setCanvasNodePositions,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    lastSavedSignatureRef: refs.lastSavedSignatureRef,
  });
  const { reloadLatestDraft, adoptCurrentWorkspaceSnapshot } = useCanvasDraftPersistence({
    draftRepository,
    graphDraftQuery,
    graphSnapshotQuery,
    queryClient,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    currentDraftPayloadSignature,
    currentDraftPayload,
    canPersistGraphDraft,
    canPersistCurrentDraft,
    graphStrategy,
    refs,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    applyReloadedRemoteDraft,
    createDraftIdempotencyKey: createCanvasDraftIdempotencyKey,
  });

  return {
    draftSaveStatus,
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
  };
}
