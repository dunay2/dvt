import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSessionBaseline } from './canvasDraftSessionBaseline';
import { canvasDraftSessionWorkingSet, EMPTY_WORKING_SET } from './canvasDraftSessionWorkingSet';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import type {
  BootstrapSessionArgs,
  CanvasDraftSession,
  CanvasDraftSyncState,
  CanvasDraftWorkingSet,
} from './canvasDraftSession.types';

type BaselineTransitionArgs = {
  nextSyncState: Exclude<CanvasDraftSyncState, 'bootstrapping' | 'saving'>;
  record: CanvasAuthoringDraftRecord | null;
  workingSet: CanvasDraftWorkingSet | undefined;
  localNodeCatalog: Record<string, CanonicalNode> | undefined;
};

function transition(
  session: CanvasDraftSession,
  {
    nextSyncState,
    record,
    workingSet = session.workingSet,
    localNodeCatalog,
  }: BaselineTransitionArgs
): CanvasDraftSession {
  return {
    ...session,
    syncState: nextSyncState,
    baseline: canvasDraftSessionBaseline.create(record),
    workingSet,
    draftRevision: record?.revision ?? null,
    savingWorkingSet: undefined,
    savingBaseRevision: undefined,
    localNodeCatalog,
  };
}

function createBootstrapping(): CanvasDraftSession {
  return {
    syncState: 'bootstrapping',
    baseline: canvasDraftSessionBaseline.create(null),
    workingSet: EMPTY_WORKING_SET,
    draftRevision: null,
    localNodeCatalog: undefined,
  };
}

function bootstrap({
  remoteDraft,
  canonicalNodeIds,
  canonicalEdges,
}: BootstrapSessionArgs): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: canvasDraftSessionBaseline.create(remoteDraft),
    workingSet:
      remoteDraft == null
        ? canvasDraftSessionWorkingSet.buildCanonical({ canonicalNodeIds, canonicalEdges })
        : canvasDraftSessionWorkingSet.buildFromDraft(remoteDraft.draft),
    draftRevision: remoteDraft?.revision ?? null,
    localNodeCatalog: undefined,
  };
}

function markSaving(session: CanvasDraftSession): CanvasDraftSession {
  if (session.syncState === 'saving') {
    return session;
  }

  return {
    ...session,
    syncState: 'saving',
    savingWorkingSet: session.workingSet,
    savingBaseRevision: session.draftRevision,
  };
}

function normalizeLocalNodeCatalog(
  localNodeCatalog?: Record<string, CanonicalNode>
): Record<string, CanonicalNode> | undefined {
  return localNodeCatalog == null || Object.keys(localNodeCatalog).length === 0
    ? undefined
    : localNodeCatalog;
}

function transitionWithRecord(
  session: CanvasDraftSession,
  nextSyncState: Exclude<CanvasDraftSyncState, 'bootstrapping' | 'saving' | 'missing_remote'>,
  record: CanvasAuthoringDraftRecord,
  workingSet?: CanvasDraftWorkingSet,
  localNodeCatalog?: Record<string, CanonicalNode>
): CanvasDraftSession {
  return transition(session, {
    nextSyncState,
    record,
    workingSet,
    localNodeCatalog: normalizeLocalNodeCatalog(localNodeCatalog),
  });
}

function applySaveSuccess(
  session: CanvasDraftSession,
  record: CanvasAuthoringDraftRecord
): CanvasDraftSession {
  const saveBaseWasSuperseded =
    session.savingWorkingSet != null &&
    session.savingBaseRevision !== undefined &&
    session.savingBaseRevision !== session.draftRevision &&
    record.revision !== session.draftRevision;

  if (saveBaseWasSuperseded) {
    return {
      ...session,
      syncState: 'editing',
      savingWorkingSet: undefined,
      savingBaseRevision: undefined,
    };
  }

  const persistedWorkingSet = canvasDraftSessionWorkingSet.buildFromDraft(record.draft);
  const hasEditsWhileSaving =
    session.savingWorkingSet != null &&
    !canvasDraftSessionWorkingSet.equals(session.savingWorkingSet, session.workingSet);

  return transitionWithRecord(
    session,
    'editing',
    record,
    hasEditsWhileSaving ? session.workingSet : persistedWorkingSet,
    hasEditsWhileSaving ? session.localNodeCatalog : undefined
  );
}

function applyConflict(
  session: CanvasDraftSession,
  currentRecord: CanvasAuthoringDraftRecord
): CanvasDraftSession {
  return transitionWithRecord(session, 'conflict', currentRecord);
}

function markRemoteDraftMissing(
  session: CanvasDraftSession,
  localNodeCatalog?: Record<string, CanonicalNode>
): CanvasDraftSession {
  return transition(session, {
    nextSyncState: 'missing_remote',
    record: null,
    workingSet: undefined,
    localNodeCatalog: normalizeLocalNodeCatalog(localNodeCatalog),
  });
}

function reloadFromRemote(
  session: CanvasDraftSession,
  record: CanvasAuthoringDraftRecord
): CanvasDraftSession {
  const remoteWorkingSet = canvasDraftSessionWorkingSet.buildFromDraft(record.draft);
  if (!hasDirtyLocalAuthoring(session)) {
    return transitionWithRecord(session, 'editing', record, remoteWorkingSet);
  }

  return transitionWithRecord(
    session,
    'editing',
    record,
    mergeRemoteWorkingSetWithLocalAuthoring(remoteWorkingSet, session.workingSet),
    session.localNodeCatalog
  );
}

function adoptExternalRevision(
  session: CanvasDraftSession,
  draftRevision: string | undefined
): CanvasDraftSession {
  if (!draftRevision || session.draftRevision === draftRevision) {
    return session;
  }

  return {
    ...session,
    draftRevision,
    savingWorkingSet: undefined,
    savingBaseRevision: undefined,
    syncState:
      session.syncState === 'conflict' || session.syncState === 'saving'
        ? 'editing'
        : session.syncState,
  };
}

function hasDirtyLocalAuthoring(session: CanvasDraftSession): boolean {
  if (session.localNodeCatalog != null && Object.keys(session.localNodeCatalog).length > 0) {
    return true;
  }

  const baselineRecord = session.baseline.record;
  if (baselineRecord == null) {
    return !canvasDraftSessionWorkingSet.equals(session.workingSet, EMPTY_WORKING_SET);
  }

  return !canvasDraftSessionWorkingSet.equals(
    session.workingSet,
    canvasDraftSessionWorkingSet.buildFromDraft(baselineRecord.draft)
  );
}

function mergeRemoteWorkingSetWithLocalAuthoring(
  remoteWorkingSet: CanvasDraftWorkingSet,
  localWorkingSet: CanvasDraftWorkingSet
): CanvasDraftWorkingSet {
  const visibleNodeIds = [
    ...new Set([...remoteWorkingSet.visibleNodeIds, ...localWorkingSet.visibleNodeIds]),
  ];
  const visibleNodeIdSet = new Set(visibleNodeIds);
  const visibleEdges = dedupeDraftEdges(
    [...remoteWorkingSet.visibleEdges, ...localWorkingSet.visibleEdges].filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    )
  );
  const pendingExplicitNodeIds = [
    ...new Set(
      localWorkingSet.pendingExplicitNodeIds.filter((nodeId) => !visibleNodeIdSet.has(nodeId))
    ),
  ];

  return {
    visibleNodeIds,
    visibleEdges,
    pendingExplicitNodeIds,
  };
}

function dedupeDraftEdges(edges: readonly CanvasDraftWorkingSet['visibleEdges'][number][]) {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const signature = `${edge.sourceId}::${edge.targetId}`;
    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
}

// Machine owns aggregate sync-state transitions over the draft session.
export const canvasDraftSessionMachine = {
  createBootstrapping,
  bootstrap,
  markSaving,
  applySaveSuccess,
  applyConflict,
  markRemoteDraftMissing,
  reloadFromRemote,
  adoptExternalRevision,
} as const;
