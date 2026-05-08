import type { Dispatch, SetStateAction } from 'react';

import type { CanvasNodePositions } from './canvasAuthoringRuntime.types';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphAuthorityQueryState,
} from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import type { CanvasAuthoringSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { useCanvasDraftInitialBootstrap } from './useCanvasDraftInitialBootstrap';
import { useCanvasDraftMissingRemoteSync } from './useCanvasDraftMissingRemoteSync';

type UseCanvasDraftBootstrappingArgs = {
  graphDraftQuery: GraphDraftQueryState;
  graphAuthorityQuery: GraphAuthorityQueryState;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  persistedNodePositions: CanvasNodePositions;
  setCanvasNodePositions: (workspaceLayoutKey: string, positions: CanvasNodePositions) => void;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  lastSavedSignatureRef: { current: string | null };
  lastFailedSignatureRef: { current: string | null };
  lastAuthoritativeSemanticGraphRef: {
    current: CanvasAuthoringSemanticGraph | null;
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
  persistedNodePositions,
  setCanvasNodePositions,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  lastSavedSignatureRef,
  lastFailedSignatureRef,
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
    persistedNodePositions,
    setCanvasNodePositions,
    setDraftSaveStatus,
    lastSavedSignatureRef,
    lastFailedSignatureRef,
  });

  useCanvasDraftMissingRemoteSync({
    shouldWaitForBootstrapReadiness: shouldWait,
    graphDraftQuery,
    draftSession,
    setDraftSession,
    setDraftSaveStatus,
    invalidateInFlightSaveAttempt,
    lastSavedSignatureRef,
    lastFailedSignatureRef,
    lastAuthoritativeSemanticGraphRef,
  });
}
