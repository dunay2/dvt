import type {
  WorkspaceGraphDraft,
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';

export type CanvasDraftSyncState =
  | 'bootstrapping'
  | 'editing'
  | 'saving'
  | 'conflict'
  | 'missing_remote';

export type CanvasDraftEdge = { sourceId: string; targetId: string };

export type CanvasDraftBaseline = {
  record: WorkspaceGraphDraftRecord | null;
  signature: string | null;
};

export type CanvasDraftWorkingSet = {
  visibleNodeIds: string[];
  visibleEdges: CanvasDraftEdge[];
  pendingExplicitNodeIds: string[];
};

export type CanvasDraftSession = {
  syncState: CanvasDraftSyncState;
  baseline: CanvasDraftBaseline;
  workingSet: CanvasDraftWorkingSet;
  draftRevision: string | null;
};

type CanonicalEdgeRef = { sourceId: string; targetId: string };

type BootstrapSessionArgs = {
  remoteDraft: WorkspaceGraphDraftRecord | null;
  canonicalNodeIds: string[];
  canonicalEdges: CanonicalEdgeRef[];
};

type CanonicalSnapshotArgs = {
  canonicalNodeIds: string[];
  canonicalEdges: CanonicalEdgeRef[];
};

const EMPTY_WORKING_SET: CanvasDraftWorkingSet = {
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
        edge.sourceId === right[index]?.sourceId && edge.targetId === right[index]?.targetId
    )
  );
}

function dedupeNodeIds(nodeIds: string[]): string[] {
  return [...new Set(nodeIds)];
}

function dedupeEdges(edges: CanvasDraftEdge[]): CanvasDraftEdge[] {
  const seen = new Set<string>();
  const deduped: CanvasDraftEdge[] = [];

  for (const edge of edges) {
    const signature = `${edge.sourceId}::${edge.targetId}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push({ sourceId: edge.sourceId, targetId: edge.targetId });
  }

  return deduped;
}

function buildCanonicalWorkingSet({
  canonicalNodeIds,
  canonicalEdges,
}: CanonicalSnapshotArgs): CanvasDraftWorkingSet {
  const visibleNodeIds = dedupeNodeIds(canonicalNodeIds);
  const visibleNodeIdSet = new Set(visibleNodeIds);

  return {
    visibleNodeIds,
    visibleEdges: dedupeEdges(
      canonicalEdges.filter(
        (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
      )
    ),
    pendingExplicitNodeIds: [],
  };
}

function buildDraftWorkingSet(
  draft: WorkspaceGraphDraft
): CanvasDraftWorkingSet {
  const visibleNodeIds = dedupeNodeIds(draft.nodeIds);
  const visibleNodeIdSet = new Set(visibleNodeIds);

  return {
    visibleNodeIds,
    visibleEdges: dedupeEdges(
      draft.edges.filter(
        (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
      )
    ),
    pendingExplicitNodeIds: [],
  };
}

function buildBaseline(record: WorkspaceGraphDraftRecord | null): CanvasDraftBaseline {
  return {
    record,
    signature: record ? serializeWorkspaceGraphDraft(record.draft) : null,
  };
}

function withWorkingSet(
  session: CanvasDraftSession,
  workingSet: CanvasDraftWorkingSet
): CanvasDraftSession {
  if (
    arraysEqual(session.workingSet.visibleNodeIds, workingSet.visibleNodeIds) &&
    draftEdgesEqual(session.workingSet.visibleEdges, workingSet.visibleEdges) &&
    arraysEqual(session.workingSet.pendingExplicitNodeIds, workingSet.pendingExplicitNodeIds)
  ) {
    return session;
  }

  return {
    ...session,
    workingSet,
  };
}

export function createBootstrappingCanvasDraftSession(): CanvasDraftSession {
  return {
    syncState: 'bootstrapping',
    baseline: buildBaseline(null),
    workingSet: EMPTY_WORKING_SET,
    draftRevision: null,
  };
}

export function serializeWorkspaceGraphDraft(draft: WorkspaceGraphDraft): string {
  return JSON.stringify({
    nodeIds: [...draft.nodeIds],
    nodePositions: Object.fromEntries(
      Object.entries(draft.nodePositions)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([nodeId, position]) => [nodeId, { x: position.x, y: position.y }])
    ),
    edges: [...draft.edges]
      .map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId }))
      .sort(
        (left, right) =>
          left.sourceId.localeCompare(right.sourceId) ||
          left.targetId.localeCompare(right.targetId)
      ),
  });
}

export function bootstrapSession({
  remoteDraft,
  canonicalNodeIds,
  canonicalEdges,
}: BootstrapSessionArgs): CanvasDraftSession {
  const workingSet =
    remoteDraft == null
      ? buildCanonicalWorkingSet({ canonicalNodeIds, canonicalEdges })
      : buildDraftWorkingSet(remoteDraft.draft);

  return {
    syncState: 'editing',
    baseline: buildBaseline(remoteDraft),
    workingSet,
    draftRevision: remoteDraft?.revision ?? null,
  };
}

export function reconcileSnapshot(
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
  const promotedExplicitNodeIds = pendingExplicitNodeIds.filter((nodeId) => knownNodeIds.has(nodeId));
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
  const nextVisibleEdges = dedupeEdges(
    [
      ...session.workingSet.visibleEdges.filter(
        (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
      ),
      ...promotedCanonicalEdges,
    ]
  );

  return withWorkingSet(session, {
    visibleNodeIds: mergedVisibleNodeIds,
    visibleEdges: nextVisibleEdges,
    pendingExplicitNodeIds: nextPendingExplicitNodeIds,
  });
}

export function queueExplicitNodeIds(
  session: CanvasDraftSession,
  nodeIds: string[]
): CanvasDraftSession {
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

export function addExplicitNode(session: CanvasDraftSession, nodeId: string): CanvasDraftSession {
  if (session.workingSet.visibleNodeIds.includes(nodeId)) {
    if (!session.workingSet.pendingExplicitNodeIds.includes(nodeId)) {
      return session;
    }
  }

  const nextVisibleNodeIds = session.workingSet.visibleNodeIds.includes(nodeId)
    ? session.workingSet.visibleNodeIds
    : [...session.workingSet.visibleNodeIds, nodeId];
  const nextPendingNodeIds = session.workingSet.pendingExplicitNodeIds.filter(
    (pendingNodeId) => pendingNodeId !== nodeId
  );

  return withWorkingSet(session, {
    ...session.workingSet,
    visibleNodeIds: nextVisibleNodeIds,
    pendingExplicitNodeIds: nextPendingNodeIds,
  });
}

export function removeNode(session: CanvasDraftSession, nodeId: string): CanvasDraftSession {
  const nextVisibleNodeIds = session.workingSet.visibleNodeIds.filter(
    (visibleNodeId) => visibleNodeId !== nodeId
  );
  const nextVisibleEdges = session.workingSet.visibleEdges.filter(
    (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId
  );
  const nextPendingNodeIds = session.workingSet.pendingExplicitNodeIds.filter(
    (pendingNodeId) => pendingNodeId !== nodeId
  );

  return withWorkingSet(session, {
    visibleNodeIds: nextVisibleNodeIds,
    visibleEdges: nextVisibleEdges,
    pendingExplicitNodeIds: nextPendingNodeIds,
  });
}

export function replaceEdges(
  session: CanvasDraftSession,
  edges: CanvasDraftEdge[]
): CanvasDraftSession {
  const visibleNodeIdSet = new Set(session.workingSet.visibleNodeIds);
  const nextVisibleEdges = dedupeEdges(
    edges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    )
  );

  return withWorkingSet(session, {
    ...session.workingSet,
    visibleEdges: nextVisibleEdges,
  });
}

export function markSaving(session: CanvasDraftSession): CanvasDraftSession {
  if (session.syncState === 'saving') {
    return session;
  }

  return {
    ...session,
    syncState: 'saving',
  };
}

export function applySaveSuccess(
  session: CanvasDraftSession,
  record: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return {
    ...session,
    syncState: 'editing',
    baseline: buildBaseline(record),
    draftRevision: record.revision,
  };
}

export function applyConflict(
  session: CanvasDraftSession,
  currentRecord: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return {
    ...session,
    syncState: 'conflict',
    baseline: buildBaseline(currentRecord),
    draftRevision: currentRecord.revision,
  };
}

export function markRemoteDraftMissing(session: CanvasDraftSession): CanvasDraftSession {
  return {
    ...session,
    syncState: 'missing_remote',
    baseline: buildBaseline(null),
    draftRevision: null,
  };
}

export function adoptCurrentSnapshot(
  session: CanvasDraftSession,
  { canonicalNodeIds, canonicalEdges }: CanonicalSnapshotArgs
): CanvasDraftSession {
  return {
    ...session,
    syncState: 'editing',
    baseline: buildBaseline(null),
    workingSet: buildCanonicalWorkingSet({ canonicalNodeIds, canonicalEdges }),
    draftRevision: null,
  };
}

export function reloadFromRemote(
  session: CanvasDraftSession,
  record: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return {
    ...session,
    syncState: 'editing',
    baseline: buildBaseline(record),
    workingSet: {
      visibleNodeIds: dedupeNodeIds(record.draft.nodeIds),
      visibleEdges: dedupeEdges(record.draft.edges),
      pendingExplicitNodeIds: [],
    },
    draftRevision: record.revision,
  };
}
