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
  workingSet?: CanvasDraftWorkingSet
): CanvasDraftSession {
  return transition(session, {
    nextSyncState,
    record,
    workingSet,
    localNodeCatalog: undefined,
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
    hasEditsWhileSaving ? session.workingSet : persistedWorkingSet
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
  return transitionWithRecord(
    session,
    'editing',
    record,
    canvasDraftSessionWorkingSet.buildFromDraft(record.draft)
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
    savingWorkingSet: session.syncState === 'saving' ? session.savingWorkingSet : undefined,
    savingBaseRevision: session.syncState === 'saving' ? session.savingBaseRevision : undefined,
    syncState: session.syncState === 'conflict' ? 'editing' : session.syncState,
  };
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
