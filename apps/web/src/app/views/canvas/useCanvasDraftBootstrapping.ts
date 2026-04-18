import type { Dispatch, SetStateAction } from 'react';

import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphSnapshotQueryState,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import { useCanvasDraftInitialBootstrap } from './useCanvasDraftInitialBootstrap';
import { useCanvasDraftMissingRemoteSync } from './useCanvasDraftMissingRemoteSync';

type UseCanvasDraftBootstrappingArgs = {
  graphDraftQuery: GraphDraftQueryState;
  graphSnapshotQuery: GraphSnapshotQueryState;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  lastSavedSignatureRef: { current: string | null };
};

function shouldWaitForBootstrapReadiness(
  graphSnapshotQuery: GraphSnapshotQueryState,
  graphDraftQuery: GraphDraftQueryState
): boolean {
  return (
    graphSnapshotQuery.isPending ||
    graphSnapshotQuery.isError ||
    graphDraftQuery.isPending ||
    graphDraftQuery.isError
  );
}

export function useCanvasDraftBootstrapping({
  graphDraftQuery,
  graphSnapshotQuery,
  workspaceLayoutKey,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
  setCanvasNodePositions,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  lastSavedSignatureRef,
}: UseCanvasDraftBootstrappingArgs) {
  const shouldWait = shouldWaitForBootstrapReadiness(graphSnapshotQuery, graphDraftQuery);

  useCanvasDraftInitialBootstrap({
    shouldWaitForBootstrapReadiness: shouldWait,
    graphDraftQuery,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    setCanvasNodePositions,
    setDraftSaveStatus,
    lastSavedSignatureRef,
  });

  useCanvasDraftMissingRemoteSync({
    shouldWaitForBootstrapReadiness: shouldWait,
    graphDraftQuery,
    draftSession,
    setDraftSession,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    lastSavedSignatureRef,
  });
}
