/** Owned concern: compose bootstrapping, persistence, save-attempt policy, and first-canvas creation into one narrow Canvas draft-lifecycle seam. */
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import { deriveCanCreateCanvasDocument } from './canvasCreateCanvasDocumentAvailability';
import { executeSelectCanvasDocumentCommand } from './canvasProjectCanvasLifecycleCommand';
import { executeImportProjectSnapshotCommand } from './canvasProjectSnapshotImportCommand';
import { canvasProjectSnapshot } from './canvasProjectSnapshot';
import { canvasViewCopy } from './copy';

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
    createDraftIdempotencyKey: () => createBrowserIdempotencyKey('canvas-draft'),
  });
  const effectiveDraftSaveStatus =
    draftSession.syncState === 'editing' &&
    canPersistCurrentDraft &&
    currentDraftPayloadSignature !== refs.lastSavedSignatureRef.current &&
    currentDraftPayloadSignature !== refs.lastFailedSignatureRef.current
      ? 'saving'
      : draftSaveStatus;

  const handleCreateCanvasDocument = useCallback<
    CanvasDraftLifecycle['handleCreateCanvasDocument']
  >(
    async (command) =>
      await executeCreateCanvasDocumentCommand({
        command,
        currentDraftPayload,
        draftRepository,
        graphDraftQuery,
        draftQueryCache,
        canPersistGraphDraft,
        setDraftSession,
        setDraftSaveStatus,
        lastSavedSignatureRef: refs.lastSavedSignatureRef,
      }),
    [
      canPersistGraphDraft,
      draftQueryCache,
      draftRepository,
      graphDraftQuery.data,
      graphDraftQuery.isError,
      graphDraftQuery.isPending,
      refs.lastSavedSignatureRef,
      setDraftSession,
      setDraftSaveStatus,
      currentDraftPayload,
    ]
  );
  const canvasLifecycleCommandDto = useMemo(
    () => ({
      currentDraftPayload,
      draftRepository,
      graphDraftQuery,
      draftQueryCache,
      canPersistGraphDraft,
      setDraftSession,
      setDraftSaveStatus,
      lastSavedSignatureRef: refs.lastSavedSignatureRef,
    }),
    [
      canPersistGraphDraft,
      currentDraftPayload,
      draftQueryCache,
      draftRepository,
      graphDraftQuery,
      refs.lastSavedSignatureRef,
      setDraftSession,
      setDraftSaveStatus,
    ]
  );
  const handleSelectCanvasDocument = useCallback<
    CanvasDraftLifecycle['handleSelectCanvasDocument']
  >(
    async (canvasId) => {
      await executeSelectCanvasDocumentCommand({
        ...canvasLifecycleCommandDto,
        canvasId,
      });
    },
    [canvasLifecycleCommandDto]
  );
  const flushDraftForExecution = useCanvasExecutionDraftFlush({
    draftRepository,
    draftQueryCache,
    graphDraftState: graphDraftQuery.data,
    draftRevision: draftSession.draftRevision,
    draftSyncState: draftSession.syncState,
    currentDraftPayload,
    currentDraftPayloadSignature,
    canPersistGraphDraft,
    canPersistCurrentDraft,
    refs,
    setDraftSession,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    createDraftIdempotencyKey: () => createBrowserIdempotencyKey('canvas-draft'),
  });
  const canExportProjectSnapshot =
    graphDraftQuery.data?.record != null &&
    !graphDraftQuery.isPending &&
    !graphDraftQuery.isError &&
    draftSaveStatus !== 'saving' &&
    draftSaveStatus !== 'failed';
  const canCreateCanvasDocument = deriveCanCreateCanvasDocument({
    canPersistGraphDraft,
    graphDraftQuery,
  });
  const canImportProjectSnapshot =
    canPersistGraphDraft && !graphDraftQuery.isPending && !graphDraftQuery.isError;
  const handleExportProjectSnapshot = useCallback<
    CanvasDraftLifecycle['handleExportProjectSnapshot']
  >(() => {
    const record = graphDraftQuery.data?.record ?? null;
    if (!canExportProjectSnapshot || record == null) {
      toast.error(canvasViewCopy.projectSnapshotExportUnavailableMessage);
      return;
    }

    const exported = canvasProjectSnapshot.exportFile({
      record,
      workspaceScope,
      exportedAt: new Date().toISOString(),
    });
    const blob = new Blob([exported.contents], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exported.fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [canExportProjectSnapshot, graphDraftQuery.data?.record, workspaceScope]);
  const handleImportProjectSnapshotFile = useCallback<
    CanvasDraftLifecycle['handleImportProjectSnapshotFile']
  >(
    async (file) => {
      await executeImportProjectSnapshotCommand({
        file,
        canImportProjectSnapshot,
        draftRepository,
        graphDraftQuery,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        refs,
        invalidateInFlightSaveAttempt,
      });
    },
    [
      canImportProjectSnapshot,
      draftQueryCache,
      draftRepository,
      graphDraftQuery.data?.record?.revision,
      invalidateInFlightSaveAttempt,
      refs,
      setDraftSession,
      setDraftSaveStatus,
    ]
  );

  return {
    draftSaveStatus: effectiveDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    flushDraftForExecution,
    reloadLatestDraft,
    handleCreateCanvasDocument,
    handleSelectCanvasDocument,
    canCreateCanvasDocument,
    canExportProjectSnapshot,
    canImportProjectSnapshot,
    handleExportProjectSnapshot,
    handleImportProjectSnapshotFile,
  };
}
