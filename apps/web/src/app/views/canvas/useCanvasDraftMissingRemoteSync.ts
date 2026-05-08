import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { CanvasAuthoringSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { buildLocalNodeCatalogFromSemanticGraph } from './canvasDraftLocalNodeCatalog';
import type { DraftSaveStatus, GraphDraftQueryState } from './canvasDraftLifecycle.types';

type UseCanvasDraftMissingRemoteSyncArgs = {
  shouldWaitForBootstrapReadiness: boolean;
  graphDraftQuery: GraphDraftQueryState;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  lastSavedSignatureRef: { current: string | null };
  lastFailedSignatureRef: { current: string | null };
  lastAuthoritativeSemanticGraphRef: {
    current: CanvasAuthoringSemanticGraph | null;
  };
};

function syncLastAuthoritativeSemanticGraph(
  args: Pick<
    UseCanvasDraftMissingRemoteSyncArgs,
    'draftSession' | 'graphDraftQuery' | 'lastAuthoritativeSemanticGraphRef'
  >
): void {
  const { draftSession, graphDraftQuery, lastAuthoritativeSemanticGraphRef } = args;

  if (graphDraftQuery.data?.record != null && graphDraftQuery.data.semanticGraph != null) {
    lastAuthoritativeSemanticGraphRef.current = graphDraftQuery.data.semanticGraph;
    return;
  }

  if (draftSession.syncState === 'bootstrapping' && graphDraftQuery.data?.record == null) {
    lastAuthoritativeSemanticGraphRef.current = null;
  }
}

function shouldMarkRemoteDraftMissing(
  args: Pick<
    UseCanvasDraftMissingRemoteSyncArgs,
    'shouldWaitForBootstrapReadiness' | 'graphDraftQuery' | 'draftSession'
  >
): boolean {
  const { shouldWaitForBootstrapReadiness, graphDraftQuery, draftSession } = args;

  return !(
    shouldWaitForBootstrapReadiness ||
    draftSession.syncState === 'bootstrapping' ||
    graphDraftQuery.data?.record != null ||
    draftSession.baseline.record == null
  );
}

export function useCanvasDraftMissingRemoteSync({
  shouldWaitForBootstrapReadiness,
  graphDraftQuery,
  draftSession,
  setDraftSession,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  lastSavedSignatureRef,
  lastFailedSignatureRef,
  lastAuthoritativeSemanticGraphRef,
}: UseCanvasDraftMissingRemoteSyncArgs) {
  useEffect(() => {
    syncLastAuthoritativeSemanticGraph({
      draftSession,
      graphDraftQuery,
      lastAuthoritativeSemanticGraphRef,
    });
  }, [
    draftSession.syncState,
    graphDraftQuery.data?.record,
    graphDraftQuery.data?.semanticGraph,
    lastAuthoritativeSemanticGraphRef,
  ]);

  useEffect(() => {
    if (
      !shouldMarkRemoteDraftMissing({
        shouldWaitForBootstrapReadiness,
        graphDraftQuery,
        draftSession,
      })
    ) {
      return;
    }

    invalidateInFlightSaveAttempt();
    lastSavedSignatureRef.current = null;
    lastFailedSignatureRef.current = null;
    setDraftSaveStatus('idle');
    setDraftSession((currentSession) =>
      canvasDraftSession.machine.markRemoteDraftMissing(
        currentSession,
        buildLocalNodeCatalogFromSemanticGraph(
          lastAuthoritativeSemanticGraphRef.current,
          currentSession.workingSet.visibleNodeIds
        )
      )
    );
  }, [
    draftSession.baseline.record,
    draftSession.syncState,
    graphDraftQuery.data?.record,
    invalidateInFlightSaveAttempt,
    lastAuthoritativeSemanticGraphRef,
    lastFailedSignatureRef,
    lastSavedSignatureRef,
    setDraftSaveStatus,
    setDraftSession,
    shouldWaitForBootstrapReadiness,
  ]);
}
