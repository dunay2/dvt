import type { Dispatch, SetStateAction } from 'react';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftAttemptRefs,
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphSnapshotQueryState,
  QueryClientLike,
} from './canvasDraftLifecycle.types';
import type {
  CanvasDraftLifecycleCanonicalSnapshot,
  CanvasDraftLifecycleGraphStrategy,
} from './canvasDraftLifecycleSnapshot';
import { useCanvasDraftAutosave } from './useCanvasDraftAutosave';
import { useCanvasDraftRecoveryActions } from './useCanvasDraftRecoveryActions';

type UseCanvasDraftPersistenceArgs = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  graphSnapshotQuery: GraphSnapshotQueryState;
  queryClient: QueryClientLike;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  currentDraftPayloadSignature: string;
  currentDraftPayload: {
    nodeIds: string[];
    nodePositions: Record<string, { x: number; y: number }>;
    edges: Array<{ sourceId: string; targetId: string }>;
  };
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  graphStrategy: CanvasDraftLifecycleGraphStrategy;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  applyReloadedRemoteDraft: (
    remoteDraft: WorkspaceGraphDraftRecord | null,
    reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
  ) => void;
  createDraftIdempotencyKey: () => string;
};

export function useCanvasDraftPersistence({
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
  createDraftIdempotencyKey,
}: UseCanvasDraftPersistenceArgs) {
  useCanvasDraftAutosave({
    draftRepository,
    graphDraftQuery,
    graphSnapshotQuery,
    queryClient,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    currentDraftPayloadSignature,
    currentDraftPayload,
    canPersistGraphDraft,
    canPersistCurrentDraft,
    refs,
    setDraftSaveStatus,
    createDraftIdempotencyKey,
  });

  const { reloadLatestDraft, adoptCurrentWorkspaceSnapshot } =
    useCanvasDraftRecoveryActions({
      draftRepository,
      queryClient,
      workspaceLayoutKey,
      setDraftSession,
      canonicalSnapshot,
      graphStrategy,
      refs,
      setDraftSaveStatus,
      invalidateInFlightSaveAttempt,
      applyReloadedRemoteDraft,
    });

  return {
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
  };
}
