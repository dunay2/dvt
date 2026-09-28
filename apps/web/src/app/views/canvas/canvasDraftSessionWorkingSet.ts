import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasDraftEdge,
  CanvasDraftSession,
  CanvasDraftWorkingSet,
  CanonicalSnapshotArgs,
} from './canvasDraftSession.types';
import { canvasDraftEdgeExecutionGate } from './canvasDraftEdgeExecutionGate';
import { canvasDraftWorkingSetModel } from './canvasDraftWorkingSetModel';
const { arraysEqual, dedupeNodeIds, buildVisibleEdges } = canvasDraftWorkingSetModel;
export const EMPTY_WORKING_SET: CanvasDraftWorkingSet = {
  visibleNodeIds: [],
  visibleEdges: [],
  pendingExplicitNodeIds: [],
};
function withWorkingSet(
  session: CanvasDraftSession,
  workingSet: CanvasDraftWorkingSet
): CanvasDraftSession {
  if (canvasDraftWorkingSetModel.equals(session.workingSet, workingSet)) {
    return session;
  }
  return { ...session, workingSet };
}

function readLocalNodeCatalog(session: CanvasDraftSession): Record<string, CanonicalNode> {
  return session.localNodeCatalog ?? {};
}

function withLocalNodeCatalog(
  session: CanvasDraftSession,
  localNodeCatalog: Record<string, CanonicalNode>
): CanvasDraftSession {
  const nextNodeIds = Object.keys(localNodeCatalog);
  if (nextNodeIds.length === 0) {
    if (session.localNodeCatalog === undefined) {
      return session;
    }

    return {
      ...session,
      localNodeCatalog: undefined,
    };
  }

  const currentNodeIds = Object.keys(readLocalNodeCatalog(session));
  const catalogUnchanged =
    arraysEqual(currentNodeIds, nextNodeIds) &&
    currentNodeIds.every(
      (nodeId) => readLocalNodeCatalog(session)[nodeId] === localNodeCatalog[nodeId]
    );
  if (catalogUnchanged) {
    return session;
  }

  return {
    ...session,
    localNodeCatalog,
  };
}
function reconcileSnapshot(
  session: CanvasDraftSession,
  snapshot: CanonicalSnapshotArgs
): CanvasDraftSession {
  const reconciledSession = withWorkingSet(
    session,
    canvasDraftWorkingSetModel.reconcileSnapshot(session.workingSet, snapshot)
  );
  const currentLocalNodeCatalog = readLocalNodeCatalog(reconciledSession);
  const retainedLocalNodeIds = new Set([
    ...reconciledSession.workingSet.visibleNodeIds,
    ...reconciledSession.workingSet.pendingExplicitNodeIds,
  ]);
  const nextLocalNodeCatalog = Object.fromEntries(
    Object.entries(currentLocalNodeCatalog).filter(([nodeId]) => retainedLocalNodeIds.has(nodeId))
  );

  return withLocalNodeCatalog(reconciledSession, nextLocalNodeCatalog);
}
function queueExplicitNodeIds(session: CanvasDraftSession, nodeIds: string[]): CanvasDraftSession {
  if (nodeIds.length === 0) {
    return session;
  }
  const nextPendingNodeIds = dedupeNodeIds([
    ...session.workingSet.pendingExplicitNodeIds,
    ...nodeIds.filter((nodeId) => !session.workingSet.visibleNodeIds.includes(nodeId)),
  ]);
  if (arraysEqual(session.workingSet.pendingExplicitNodeIds, nextPendingNodeIds)) {
    return session;
  }
  return withWorkingSet(session, {
    ...session.workingSet,
    pendingExplicitNodeIds: nextPendingNodeIds,
  });
}
function addExplicitNode(
  session: CanvasDraftSession,
  canonicalNode: CanonicalNode
): CanvasDraftSession {
  if (explicitNodeAlreadyTracked(session, canonicalNode)) {
    return session;
  }

  return upsertNode(session, canonicalNode);
}

function upsertNode(session: CanvasDraftSession, canonicalNode: CanonicalNode): CanvasDraftSession {
  const nodeId = canonicalNode.id;
  const nextVisibleNodeIds = session.workingSet.visibleNodeIds.includes(nodeId)
    ? session.workingSet.visibleNodeIds
    : [...session.workingSet.visibleNodeIds, nodeId];
  const nextPendingNodeIds = session.workingSet.pendingExplicitNodeIds.filter(
    (pendingNodeId) => pendingNodeId !== nodeId
  );
  const nextSession = withWorkingSet(session, {
    ...session.workingSet,
    visibleNodeIds: nextVisibleNodeIds,
    pendingExplicitNodeIds: nextPendingNodeIds,
  });

  return withLocalNodeCatalog(nextSession, {
    ...readLocalNodeCatalog(nextSession),
    [nodeId]: canonicalNode,
  });
}

function explicitNodeAlreadyTracked(
  session: CanvasDraftSession,
  canonicalNode: CanonicalNode
): boolean {
  const nodeId = canonicalNode.id;

  return (
    session.workingSet.visibleNodeIds.includes(nodeId) &&
    !session.workingSet.pendingExplicitNodeIds.includes(nodeId) &&
    readLocalNodeCatalog(session)[nodeId] === canonicalNode
  );
}
function removeNode(session: CanvasDraftSession, nodeId: string): CanvasDraftSession {
  const nextSession = withWorkingSet(session, {
    visibleNodeIds: session.workingSet.visibleNodeIds.filter(
      (visibleNodeId) => visibleNodeId !== nodeId
    ),
    visibleEdges: session.workingSet.visibleEdges.filter(
      (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId
    ),
    pendingExplicitNodeIds: session.workingSet.pendingExplicitNodeIds.filter(
      (pendingNodeId) => pendingNodeId !== nodeId
    ),
  });
  const { [nodeId]: _removedNode, ...nextLocalNodeCatalog } = readLocalNodeCatalog(nextSession);
  return withLocalNodeCatalog(nextSession, nextLocalNodeCatalog);
}
function replaceEdges(session: CanvasDraftSession, edges: CanvasDraftEdge[]): CanvasDraftSession {
  return withWorkingSet(session, {
    ...session.workingSet,
    visibleEdges: buildVisibleEdges(
      canvasDraftEdgeExecutionGate.preserveOnReplacement(session.workingSet.visibleEdges, edges),
      session.workingSet.visibleNodeIds
    ),
  });
}
function setEdgeExecutionGate(
  session: CanvasDraftSession,
  command: Parameters<typeof canvasDraftEdgeExecutionGate.applyCommand>[1]
): CanvasDraftSession {
  const visibleEdges = canvasDraftEdgeExecutionGate.applyCommand(
    session.workingSet.visibleEdges,
    command
  );
  return visibleEdges != null
    ? withWorkingSet(session, { ...session.workingSet, visibleEdges })
    : session;
}
// Working-set policy owns aggregate mutation over visible scope and pending nodes.
export const canvasDraftSessionWorkingSet = {
  buildCanonical: canvasDraftWorkingSetModel.buildCanonical,
  buildFromDraft: canvasDraftWorkingSetModel.buildFromDraft,
  equals: canvasDraftWorkingSetModel.equals,
  reconcileSnapshot,
  queueExplicitNodeIds,
  addExplicitNode,
  upsertNode,
  removeNode,
  replaceEdges,
  setEdgeExecutionGate,
} as const;
