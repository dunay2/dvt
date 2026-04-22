import type { Dispatch, SetStateAction } from 'react';

import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphAuthorityQueryState,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { useCanvasDraftInitialBootstrap } from './useCanvasDraftInitialBootstrap';
import { useCanvasDraftMissingRemoteSync } from './useCanvasDraftMissingRemoteSync';

type UseCanvasDraftBootstrappingArgs = {
  graphDraftQuery: GraphDraftQueryState;
  graphAuthorityQuery: GraphAuthorityQueryState;
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
  lastAuthoritativeSemanticGraphRef: {
    current: WorkspaceGraphDraftSemanticGraph | null;
  };
};

function shouldWaitForBootstrapReadiness(
  graphAuthorityQuery: GraphAuthorityQueryState,
  graphDraftQuery: GraphDraftQueryState
): boolean {
  return (
    graphAuthorityQuery.isPending ||
    graphAuthorityQuery.isError ||
    graphDraftQuery.isPending ||
    graphDraftQuery.isError
  );
}

export function useCanvasDraftBootstrapping({
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
}: UseCanvasDraftBootstrappingArgs) {
  const shouldWait = shouldWaitForBootstrapReadiness(graphAuthorityQuery, graphDraftQuery);

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
    lastAuthoritativeSemanticGraphRef,
  });
}
