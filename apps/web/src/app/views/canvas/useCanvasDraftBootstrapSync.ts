import type { Dispatch, SetStateAction } from 'react';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphSnapshotQueryState,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import { useCanvasDraftBootstrapping } from './useCanvasDraftBootstrapping';
import { useCanvasDraftCanonicalReconcile } from './useCanvasDraftCanonicalReconcile';
import { useCanvasDraftReloadHydration } from './useCanvasDraftReloadHydration';

type UseCanvasDraftBootstrapSyncArgs = {
  graphDraftQuery: GraphDraftQueryState;
  graphSnapshotQuery: GraphSnapshotQueryState;
  draftQueryCache: CanvasDraftQueryCache;
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

export function useCanvasDraftBootstrapSync({
  graphDraftQuery,
  graphSnapshotQuery,
  draftQueryCache,
  workspaceLayoutKey,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
  setCanvasNodePositions,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  lastSavedSignatureRef,
}: UseCanvasDraftBootstrapSyncArgs) {
  const applyReloadedRemoteDraft = useCanvasDraftReloadHydration({
    draftQueryCache,
    workspaceLayoutKey,
    setDraftSession,
    setCanvasNodePositions,
    setDraftSaveStatus,
    lastSavedSignatureRef,
  });

  useCanvasDraftBootstrapping({
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
  });

  useCanvasDraftCanonicalReconcile({
    graphSnapshotQuery,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
  });

  return {
    applyReloadedRemoteDraft,
  };
}
