import { useRef, type Dispatch, type SetStateAction } from 'react';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphAuthorityQueryState,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { useCanvasDraftBootstrapping } from './useCanvasDraftBootstrapping';
import { useCanvasDraftCanonicalReconcile } from './useCanvasDraftCanonicalReconcile';
import { useCanvasDraftReloadHydration } from './useCanvasDraftReloadHydration';

type UseCanvasDraftBootstrapSyncArgs = {
  graphDraftQuery: GraphDraftQueryState;
  graphAuthorityQuery: GraphAuthorityQueryState;
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
  graphAuthorityQuery,
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
  const lastAuthoritativeSemanticGraphRef = useRef<WorkspaceGraphDraftSemanticGraph | null>(null);

  const applyReloadedRemoteDraft = useCanvasDraftReloadHydration({
    draftQueryCache,
    workspaceLayoutKey,
    setDraftSession,
    setCanvasNodePositions,
    setDraftSaveStatus,
    lastSavedSignatureRef,
    lastAuthoritativeSemanticGraphRef,
  });

  useCanvasDraftBootstrapping({
    graphDraftQuery,
    graphAuthorityQuery,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    setCanvasNodePositions,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    lastSavedSignatureRef,
    lastAuthoritativeSemanticGraphRef,
  });

  useCanvasDraftCanonicalReconcile({
    graphAuthorityQuery,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
  });

  return {
    applyReloadedRemoteDraft,
  };
}
