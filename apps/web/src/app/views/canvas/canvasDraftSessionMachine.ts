import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSessionBaseline } from './canvasDraftSessionBaseline';
import { canvasDraftSessionWorkingSet, EMPTY_WORKING_SET } from './canvasDraftSessionWorkingSet';
import type {
  BootstrapSessionArgs,
  CanvasDraftSession,
  CanvasDraftSyncState,
  CanvasDraftWorkingSet,
} from './canvasDraftSession.types';

type BaselineTransitionArgs = {
  nextSyncState: Exclude<CanvasDraftSyncState, 'bootstrapping' | 'saving'>;
  record: WorkspaceGraphDraftRecord | null;
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
  record: WorkspaceGraphDraftRecord,
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
  record: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return transitionWithRecord(
    session,
    'editing',
    record,
    canvasDraftSessionWorkingSet.buildFromDraft(record.draft)
  );
}

function applyConflict(
  session: CanvasDraftSession,
  currentRecord: WorkspaceGraphDraftRecord
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
  record: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return transitionWithRecord(
    session,
    'editing',
    record,
    canvasDraftSessionWorkingSet.buildFromDraft(record.draft)
  );
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
} as const;
