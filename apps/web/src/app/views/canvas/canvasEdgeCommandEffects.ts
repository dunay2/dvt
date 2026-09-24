/** Apply an accepted edge transaction while preserving concurrent local draft state. */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Edge } from '@xyflow/react';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasEdgeAdmissionTransaction } from './canvasEdgeAdmissionTransaction';

export function applyAcceptedEdgeTransaction(args: {
  transaction: Extract<CanvasEdgeAdmissionTransaction, { outcome: 'created' | 'reconnected' }>;
  baselineDraftSession: CanvasDraftSession;
  latestEdgesRef: MutableRefObject<Edge[]>;
  latestDraftSessionRef: MutableRefObject<CanvasDraftSession>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
}) {
  const changedNodes = Object.entries(args.transaction.draftSession.localNodeCatalog ?? {})
    .filter(([nodeId, node]) => args.baselineDraftSession.localNodeCatalog?.[nodeId] !== node)
    .map(([, node]) => node);
  args.latestEdgesRef.current = args.transaction.edges;
  args.latestDraftSessionRef.current = args.transaction.draftSession;
  args.setEdges(args.transaction.edges);
  args.setDraftSession((currentDraftSession) => {
    let nextDraftSession = canvasGraphLifecycle.edge.replaceVisible(
      currentDraftSession,
      args.transaction.edges
    );
    for (const node of changedNodes) {
      nextDraftSession = canvasDraftSession.workingSet.upsertNode(nextDraftSession, node);
    }
    args.latestDraftSessionRef.current = nextDraftSession;
    return nextDraftSession;
  });
}
