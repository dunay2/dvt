/** Owned concern: compose bootstrapping, persistence, save-attempt policy, and first-canvas creation into one narrow Canvas draft-lifecycle seam. */
import { useState } from 'react';

import { createBrowserIdempotencyKey } from '../../services/idempotency/createBrowserIdempotencyKey';
import type {
  CanvasDraftLifecycle,
  CanvasDraftLifecycleDto,
  DraftSaveStatus,
} from './canvasDraftLifecycle.types';
import { useCanvasCurrentDraftPayload } from './useCanvasCurrentDraftPayload';
import { useCanvasDraftAttemptRefs } from './useCanvasDraftAttemptRefs';
import { useCanvasDraftBootstrapSync } from './useCanvasDraftBootstrapSync';
import { useCanvasDraftPersistence } from './useCanvasDraftPersistence';
import { useCanvasExecutionDraftFlush } from './useCanvasExecutionDraftFlush';
import { deriveCanCreateCanvasDocument } from './canvasCreateCanvasDocumentAvailability';
import { useCanvasProjectCanvasCommands } from './useCanvasProjectCanvasCommands';
import { useCanvasProjectSnapshotCommands } from './useCanvasProjectSnapshotCommands';

function createCanvasDraftIdempotencyKey(): string {
  return createBrowserIdempotencyKey('canvas-draft');
}

function resolveEffectiveDraftSaveStatus(args: {
  syncState: CanvasDraftLifecycleDto['session']['draftSession']['syncState'];
  canPersist: boolean;
  signature: string;
  savedSignature: string | null;
  failedSignature: string | null;
  status: DraftSaveStatus;
}): DraftSaveStatus {
  if (args.syncState !== 'editing' || !args.canPersist) return args.status;
  if (args.signature === args.savedSignature || args.signature === args.failedSignature) {
    return args.status;
  }
  return 'saving';
}

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
  const { canonicalNodes, canonicalEdges, workspaceScope, previewProvenanceConfig } = projection;
  const { canPersistGraphDraft } = policy;
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');
  const { refs, invalidateInFlightSaveAttempt } = useCanvasDraftAttemptRefs();
  const { currentDraftPayload, currentDraftPayloadSignature, canPersistCurrentDraft } =
    useCanvasCurrentDraftPayload({
      persistedNodePositions,
      draftSession,
      canvasDocument: graphDraftQuery.data?.record?.draft.canvas ?? null,
      baselineDraft: graphDraftQuery.data?.record?.draft ?? null,
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
    lastFailedSignatureRef: refs.lastFailedSignatureRef,
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
  const effectiveDraftSaveStatus = resolveEffectiveDraftSaveStatus({
    syncState: draftSession.syncState,
    canPersist: canPersistCurrentDraft,
    signature: currentDraftPayloadSignature,
    savedSignature: refs.lastSavedSignatureRef.current,
    failedSignature: refs.lastFailedSignatureRef.current,
    status: draftSaveStatus,
  });

  const projectCanvasCommands = useCanvasProjectCanvasCommands({
    currentDraftPayload,
    draftRepository,
    graphDraftQuery,
    draftQueryCache,
    canPersistGraphDraft,
    setDraftSession,
    setDraftSaveStatus,
    lastSavedSignatureRef: refs.lastSavedSignatureRef,
    invalidateInFlightSaveAttempt,
  });
  const flushDraftForExecution = useCanvasExecutionDraftFlush({
    draftRepository,
    draftQueryCache,
    graphDraftState: graphDraftQuery.data,
    draftSession,
    draftSaveStatus,
    currentDraftPayload,
    currentDraftPayloadSignature,
    canPersistGraphDraft,
    canPersistCurrentDraft,
    refs,
    setDraftSession,
    setDraftSaveStatus,
    createDraftIdempotencyKey: createCanvasDraftIdempotencyKey,
  });
  const canCreateCanvasDocument = deriveCanCreateCanvasDocument({
    canPersistGraphDraft,
    graphDraftQuery,
  });
  const snapshotCommands = useCanvasProjectSnapshotCommands({
    draftRepository,
    graphDraftQuery,
    draftQueryCache,
    canPersistGraphDraft,
    draftSaveStatus,
    workspaceScope,
    setDraftSession,
    setDraftSaveStatus,
    refs,
    invalidateInFlightSaveAttempt,
  });

  return {
    draftSaveStatus: effectiveDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    flushDraftForExecution,
    reloadLatestDraft,
    handleCreateCanvasDocument: projectCanvasCommands.handleCreateCanvasDocument,
    handleSelectCanvasDocument: projectCanvasCommands.handleSelectCanvasDocument,
    canCreateCanvasDocument,
    canExportProjectSnapshot: snapshotCommands.canExportProjectSnapshot,
    canImportProjectSnapshot: snapshotCommands.canImportProjectSnapshot,
    handleExportProjectSnapshot: snapshotCommands.handleExportProjectSnapshot,
    handleImportProjectSnapshotFile: snapshotCommands.handleImportProjectSnapshotFile,
  };
}
