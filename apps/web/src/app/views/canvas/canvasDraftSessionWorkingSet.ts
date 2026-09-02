import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasDraftEdge,
  CanvasDraftSession,
  CanvasDraftWorkingSet,
  CanonicalSnapshotArgs,
} from './canvasDraftSession.types';
import { canvasDraftEdgeExecutionGate } from './canvasDraftEdgeExecutionGate';
export const EMPTY_WORKING_SET: CanvasDraftWorkingSet = {
  visibleNodeIds: [],
  visibleEdges: [],
  pendingExplicitNodeIds: [],
};
function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function draftEdgesEqual(left: CanvasDraftEdge[], right: CanvasDraftEdge[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (edge, index) =>
        edge.sourceId === right[index]?.sourceId &&
        edge.targetId === right[index]?.targetId &&
        edge.executionGate === right[index]?.executionGate
    )
  );
}
function dedupeNodeIds(nodeIds: string[]): string[] {
  return [...new Set(nodeIds)];
}
function dedupeEdges(edges: ReadonlyArray<CanvasDraftEdge>): CanvasDraftEdge[] {
  const seen = new Set<string>();
  const deduped: CanvasDraftEdge[] = [];
  for (const edge of edges) {
    const signature = `${edge.sourceId}::${edge.targetId}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      ...(edge.executionGate == null ? {} : { executionGate: edge.executionGate }),
    });
  }
  return deduped;
}
function buildVisibleEdges(
  edges: ReadonlyArray<CanvasDraftEdge>,
  visibleNodeIds: readonly string[]
): CanvasDraftEdge[] {
  const visibleNodeIdSet = new Set(visibleNodeIds);
  return dedupeEdges(
    edges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    )
  );
}
function buildWorkingSet(
  nodeIds: string[],
  edges: ReadonlyArray<CanvasDraftEdge>
): CanvasDraftWorkingSet {
  const visibleNodeIds = dedupeNodeIds(nodeIds);
  return {
    visibleNodeIds,
    visibleEdges: buildVisibleEdges(edges, visibleNodeIds),
    pendingExplicitNodeIds: [],
  };
}
function buildCanonical({
  canonicalNodeIds,
  canonicalEdges,
}: CanonicalSnapshotArgs): CanvasDraftWorkingSet {
  return buildWorkingSet(canonicalNodeIds, canonicalEdges);
}
function buildFromDraft(draft: WorkspaceGraphAuthoringDraft): CanvasDraftWorkingSet {
  return buildWorkingSet(
    draft.nodeIds,
    draft.edges.map(canvasDraftEdgeExecutionGate.fromAuthoringEdge)
  );
}
function workingSetsEqual(left: CanvasDraftWorkingSet, right: CanvasDraftWorkingSet): boolean {
  if (!arraysEqual(left.visibleNodeIds, right.visibleNodeIds)) {
    return false;
  }
  if (!draftEdgesEqual(left.visibleEdges, right.visibleEdges)) {
    return false;
  }
  return arraysEqual(left.pendingExplicitNodeIds, right.pendingExplicitNodeIds);
}
function withWorkingSet(
  session: CanvasDraftSession,
  workingSet: CanvasDraftWorkingSet
): CanvasDraftSession {
  if (workingSetsEqual(session.workingSet, workingSet)) {
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
  { canonicalNodeIds, canonicalEdges }: CanonicalSnapshotArgs
): CanvasDraftSession {
  const knownNodeIds = new Set(dedupeNodeIds(canonicalNodeIds));
  const nextVisibleNodeIds = dedupeNodeIds(session.workingSet.visibleNodeIds);
  const pendingExplicitNodeIds = dedupeNodeIds(
    session.workingSet.pendingExplicitNodeIds.filter(
      (nodeId) => !nextVisibleNodeIds.includes(nodeId)
    )
  );
  const promotedExplicitNodeIds = pendingExplicitNodeIds.filter((nodeId) =>
    knownNodeIds.has(nodeId)
  );
  const nextPendingExplicitNodeIds = pendingExplicitNodeIds.filter(
    (nodeId) => !knownNodeIds.has(nodeId)
  );
  const mergedVisibleNodeIds = dedupeNodeIds([...nextVisibleNodeIds, ...promotedExplicitNodeIds]);
  const visibleNodeIdSet = new Set(mergedVisibleNodeIds);
  const promotedNodeIdSet = new Set(promotedExplicitNodeIds);
  const promotedCanonicalEdges = dedupeEdges(
    canonicalEdges.filter(
      (edge) =>
        visibleNodeIdSet.has(edge.sourceId) &&
        visibleNodeIdSet.has(edge.targetId) &&
        (promotedNodeIdSet.has(edge.sourceId) || promotedNodeIdSet.has(edge.targetId))
    )
  );
  const nextVisibleEdges = dedupeEdges([
    ...session.workingSet.visibleEdges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    ),
    ...promotedCanonicalEdges,
  ]);

  const reconciledSession = withWorkingSet(session, {
    visibleNodeIds: mergedVisibleNodeIds,
    visibleEdges: nextVisibleEdges,
    pendingExplicitNodeIds: nextPendingExplicitNodeIds,
  });
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
  buildCanonical,
  buildFromDraft,
  equals: workingSetsEqual,
  reconcileSnapshot,
  queueExplicitNodeIds,
  addExplicitNode,
  upsertNode,
  removeNode,
  replaceEdges,
  setEdgeExecutionGate,
} as const;
