import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { WorkspaceGraphDraftRecord, WorkspaceGraphSnapshot } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import { adoptCurrentSnapshot, type CanvasDraftSession } from './canvasDraftSession';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type {
  DraftAttemptRefs,
  DraftSaveStatus,
  QueryClientLike,
} from './canvasDraftLifecycle.types';
import {
  buildCanonicalSnapshotFromWorkspaceSnapshot,
  type CanvasDraftLifecycleCanonicalSnapshot,
  type CanvasDraftLifecycleGraphStrategy,
} from './canvasDraftLifecycleSnapshot';
import { clearSaveDebounce } from './canvasDraftPersistenceRuntime';

type UseCanvasDraftRecoveryActionsArgs = {
  draftRepository: CanvasDraftRepository;
  queryClient: QueryClientLike;
  workspaceLayoutKey: string;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  graphStrategy: CanvasDraftLifecycleGraphStrategy;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  applyReloadedRemoteDraft: (
    remoteDraft: WorkspaceGraphDraftRecord | null,
    reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
  ) => void;
};

async function fetchRemoteDraftAndSnapshot(args: {
  queryClient: QueryClientLike;
  workspaceLayoutKey: string;
  draftRepository: CanvasDraftRepository;
}): Promise<[WorkspaceGraphDraftRecord | null, WorkspaceGraphSnapshot]> {
  const graphDraftKey = queryKeys.workspace.graphDraft(args.workspaceLayoutKey);
  const graphKey = queryKeys.workspace.graph(args.workspaceLayoutKey);

  await Promise.all([
    args.queryClient.cancelQueries({
      queryKey: graphDraftKey,
    }),
    args.queryClient.cancelQueries({
      queryKey: graphKey,
    }),
  ]);

  return await Promise.all([
    args.queryClient.fetchQuery<WorkspaceGraphDraftRecord | null>({
      queryKey: graphDraftKey,
      queryFn: () => args.draftRepository.readGraphDraft(),
    }),
    args.queryClient.fetchQuery<WorkspaceGraphSnapshot>({
      queryKey: graphKey,
      queryFn: () => args.draftRepository.readGraphSnapshot(),
    }),
  ]);
}

export function useCanvasDraftRecoveryActions({
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
}: UseCanvasDraftRecoveryActionsArgs) {
  const reloadLatestDraft = useCallback(() => {
    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    const reloadGeneration = refs.saveAttemptGenerationRef.current;
    setDraftSaveStatus('idle');

    fetchRemoteDraftAndSnapshot({
      queryClient,
      workspaceLayoutKey,
      draftRepository,
    })
      .then(([remoteDraft, graphSnapshot]) => {
        if (refs.saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        applyReloadedRemoteDraft(
          remoteDraft,
          buildCanonicalSnapshotFromWorkspaceSnapshot(graphSnapshot, graphStrategy)
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
    draftRepository,
    graphStrategy,
    invalidateInFlightSaveAttempt,
    queryClient,
    refs,
    setDraftSaveStatus,
    workspaceLayoutKey,
  ]);

  const adoptCurrentWorkspaceSnapshot = useCallback(() => {
    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    refs.lastSavedSignatureRef.current = null;
    setDraftSaveStatus('idle');
    setDraftSession((currentSession) => adoptCurrentSnapshot(currentSession, canonicalSnapshot));
  }, [canonicalSnapshot, invalidateInFlightSaveAttempt, refs, setDraftSaveStatus, setDraftSession]);

  return {
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
  };
}
