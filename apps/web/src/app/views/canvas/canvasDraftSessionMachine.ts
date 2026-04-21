import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { canvasDraftSessionBaseline } from './canvasDraftSessionBaseline';
import {
  canvasDraftSessionWorkingSet,
  EMPTY_WORKING_SET,
} from './canvasDraftSessionWorkingSet';
import type {
  BootstrapSessionArgs,
  CanvasDraftSession,
  CanvasDraftSyncState,
  CanvasDraftWorkingSet,
  CanonicalSnapshotArgs,
} from './canvasDraftSession.types';

type BaselineTransitionArgs = {
  nextSyncState: Exclude<CanvasDraftSyncState, 'bootstrapping' | 'saving'>;
  record: WorkspaceGraphDraftRecord | null;
  workingSet?: CanvasDraftWorkingSet;
};

function transition(
  session: CanvasDraftSession,
  { nextSyncState, record, workingSet = session.workingSet }: BaselineTransitionArgs
): CanvasDraftSession {
  return {
    ...session,
    syncState: nextSyncState,
    baseline: canvasDraftSessionBaseline.create(record),
    workingSet,
    draftRevision: record?.revision ?? null,
  };
}

function createBootstrapping(): CanvasDraftSession {
  return {
    syncState: 'bootstrapping',
    baseline: canvasDraftSessionBaseline.create(null),
    workingSet: EMPTY_WORKING_SET,
    draftRevision: null,
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

function applySaveSuccess(
  session: CanvasDraftSession,
  record: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return transition(session, { nextSyncState: 'editing', record });
}

function applyConflict(
  session: CanvasDraftSession,
  currentRecord: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return transition(session, { nextSyncState: 'conflict', record: currentRecord });
}

function markRemoteDraftMissing(session: CanvasDraftSession): CanvasDraftSession {
  return transition(session, { nextSyncState: 'missing_remote', record: null });
}

function adoptCurrentSnapshot(
  session: CanvasDraftSession,
  { canonicalNodeIds, canonicalEdges }: CanonicalSnapshotArgs
): CanvasDraftSession {
  return transition(session, {
    nextSyncState: 'editing',
    record: null,
    workingSet: canvasDraftSessionWorkingSet.buildCanonical({
      canonicalNodeIds,
      canonicalEdges,
    }),
  });
}

function reloadFromRemote(
  session: CanvasDraftSession,
  record: WorkspaceGraphDraftRecord
): CanvasDraftSession {
  return transition(session, {
    nextSyncState: 'editing',
    record,
    workingSet: canvasDraftSessionWorkingSet.buildFromDraft(record.draft),
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
  adoptCurrentSnapshot,
  reloadFromRemote,
} as const;
