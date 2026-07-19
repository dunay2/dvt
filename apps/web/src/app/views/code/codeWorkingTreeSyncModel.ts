/** Owned concern: model serialized workspace working-tree synchronization states. */
import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';

export type CodeWorkingTreeSyncPhase =
  | 'synchronized'
  | 'modified'
  | 'syncing'
  | 'reconciling'
  | 'conflict'
  | 'failed'
  | 'reconciliation_failed'
  | 'persisted_stale'
  | 'persisted_invalid'
  | 'persisted_unavailable'
  | 'persisted_verification_unavailable'
  | 'persisted_superseded';

export type CodeWorkingTreeReconciliationOutcome =
  | Readonly<{
      kind: 'fresh';
      analysisSha256: string;
      projectContentSetSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
    }>
  | Readonly<{
      kind: 'superseded';
      currentContentSha256: string;
    }>
  | Readonly<{
      kind: 'verification-unavailable';
    }>;

type PersistedReconciliationPhase = Extract<
  CodeWorkingTreeSyncPhase,
  | 'reconciliation_failed'
  | 'persisted_stale'
  | 'persisted_invalid'
  | 'persisted_unavailable'
  | 'persisted_verification_unavailable'
  | 'persisted_superseded'
>;

type CodeWorkingTreeSyncState = Readonly<{
  filePath: string;
  value: string;
  persistedContent: string;
  persistedRevision: string;
  phase: CodeWorkingTreeSyncPhase;
  inFlight: Readonly<{
    requestId: number;
    content: string;
    expectedRevision: string;
  }> | null;
  pendingReconciliation: WorkspaceFileSaveReceipt | null;
  persistedReconciliationPhase: PersistedReconciliationPhase | null;
}>;

type CodeWorkingTreeSyncEvent =
  | { readonly type: 'file_loaded'; readonly file: FileContent }
  | { readonly type: 'edited'; readonly value: string }
  | { readonly type: 'sync_started'; readonly requestId: number }
  | {
      readonly type: 'content_persisted';
      readonly requestId: number;
      readonly receipt: WorkspaceFileSaveReceipt;
      readonly requiresReconciliation: boolean;
    }
  | { readonly type: 'reconciliation_started' }
  | {
      readonly type: 'reconciliation_completed';
      readonly receipt: WorkspaceFileSaveReceipt;
      readonly outcome: CodeWorkingTreeReconciliationOutcome;
    }
  | { readonly type: 'reconciliation_failed'; readonly receipt: WorkspaceFileSaveReceipt }
  | { readonly type: 'sync_conflicted'; readonly requestId: number }
  | { readonly type: 'sync_failed'; readonly requestId: number }
  | { readonly type: 'retry_requested' };

export function createCodeWorkingTreeSyncState(file: FileContent): CodeWorkingTreeSyncState {
  return {
    filePath: file.path,
    value: file.content,
    persistedContent: file.content,
    persistedRevision: file.contentSha256,
    phase: 'synchronized',
    inFlight: null,
    pendingReconciliation: null,
    persistedReconciliationPhase: null,
  };
}

export function reduceCodeWorkingTreeSync(
  state: CodeWorkingTreeSyncState,
  event: CodeWorkingTreeSyncEvent
): CodeWorkingTreeSyncState {
  switch (event.type) {
    case 'file_loaded':
      return createCodeWorkingTreeSyncState(event.file);
    case 'edited':
      return reduceEditedValue(state, event.value);
    case 'sync_started':
      if (state.phase !== 'modified' || state.inFlight) {
        return state;
      }
      return {
        ...state,
        phase: 'syncing',
        inFlight: {
          requestId: event.requestId,
          content: state.value,
          expectedRevision: state.persistedRevision,
        },
      };
    case 'content_persisted':
      if (state.inFlight?.requestId !== event.requestId) {
        return state;
      }
      return {
        ...state,
        persistedContent: state.inFlight.content,
        persistedRevision: event.receipt.contentSha256,
        phase: event.requiresReconciliation
          ? 'reconciling'
          : state.value === state.inFlight.content
            ? 'synchronized'
            : 'modified',
        inFlight: null,
        pendingReconciliation: event.requiresReconciliation ? event.receipt : null,
        persistedReconciliationPhase: null,
      };
    case 'reconciliation_started':
      return isCodeWorkingTreeReconciliationRetryablePhase(state.phase) &&
        state.pendingReconciliation != null
        ? { ...state, phase: 'reconciling' }
        : state;
    case 'reconciliation_completed': {
      if (
        state.phase !== 'reconciling' ||
        state.pendingReconciliation == null ||
        !isSameSaveReceipt(state.pendingReconciliation, event.receipt)
      ) {
        return state;
      }
      if (event.outcome.kind === 'fresh') {
        return {
          ...state,
          phase: state.value === state.persistedContent ? 'synchronized' : 'modified',
          pendingReconciliation: null,
          persistedReconciliationPhase: null,
        };
      }
      const persistedReconciliationPhase = mapReconciliationOutcomePhase(event.outcome);
      return {
        ...state,
        phase: state.value === state.persistedContent ? persistedReconciliationPhase : 'modified',
        persistedReconciliationPhase,
      };
    }
    case 'reconciliation_failed':
      return state.phase === 'reconciling' &&
        state.pendingReconciliation != null &&
        isSameSaveReceipt(state.pendingReconciliation, event.receipt)
        ? {
            ...state,
            phase: state.value === state.persistedContent ? 'reconciliation_failed' : 'modified',
            persistedReconciliationPhase: 'reconciliation_failed',
          }
        : state;
    case 'sync_conflicted':
      return state.inFlight?.requestId === event.requestId
        ? { ...state, phase: 'conflict', inFlight: null }
        : state;
    case 'sync_failed':
      return state.inFlight?.requestId === event.requestId
        ? { ...state, phase: 'failed', inFlight: null }
        : state;
    case 'retry_requested':
      return state.phase === 'failed'
        ? {
            ...state,
            phase: state.value === state.persistedContent ? 'synchronized' : 'modified',
          }
        : state;
  }
}

function isSameSaveReceipt(
  left: WorkspaceFileSaveReceipt,
  right: WorkspaceFileSaveReceipt
): boolean {
  return (
    left.kind === right.kind &&
    left.disposition === right.disposition &&
    left.path === right.path &&
    left.contentSha256 === right.contentSha256 &&
    left.lastModified === right.lastModified
  );
}

function reduceEditedValue(
  state: CodeWorkingTreeSyncState,
  value: string
): CodeWorkingTreeSyncState {
  if (state.phase === 'conflict') {
    return { ...state, value };
  }
  if (state.phase === 'reconciling') {
    return {
      ...state,
      value,
      phase: value === state.persistedContent ? 'reconciling' : 'modified',
    };
  }
  if (state.inFlight) {
    return { ...state, value, phase: 'syncing' };
  }
  return {
    ...state,
    value,
    phase:
      value === state.persistedContent
        ? (state.persistedReconciliationPhase ?? 'synchronized')
        : 'modified',
  };
}

export function isCodeWorkingTreeReconciliationUnresolvedPhase(
  phase: CodeWorkingTreeSyncPhase
): phase is PersistedReconciliationPhase {
  return (
    phase === 'reconciliation_failed' ||
    phase === 'persisted_stale' ||
    phase === 'persisted_invalid' ||
    phase === 'persisted_unavailable' ||
    phase === 'persisted_verification_unavailable' ||
    phase === 'persisted_superseded'
  );
}

export function isCodeWorkingTreeReconciliationRetryablePhase(
  phase: CodeWorkingTreeSyncPhase
): phase is Exclude<PersistedReconciliationPhase, 'persisted_superseded'> {
  return isCodeWorkingTreeReconciliationUnresolvedPhase(phase) && phase !== 'persisted_superseded';
}

function mapDegradedReconciliationPhase(
  freshness: Extract<CodeWorkingTreeReconciliationOutcome, { kind: 'degraded' }>['freshness']
): PersistedReconciliationPhase {
  switch (freshness) {
    case 'stale-last-valid':
      return 'persisted_stale';
    case 'invalid':
      return 'persisted_invalid';
    case 'unavailable':
      return 'persisted_unavailable';
  }
}

function mapReconciliationOutcomePhase(
  outcome: Exclude<CodeWorkingTreeReconciliationOutcome, { kind: 'fresh' }>
): PersistedReconciliationPhase {
  switch (outcome.kind) {
    case 'degraded':
      return mapDegradedReconciliationPhase(outcome.freshness);
    case 'superseded':
      return 'persisted_superseded';
    case 'verification-unavailable':
      return 'persisted_verification_unavailable';
  }
}

export function isCodeWorkingTreeNavigationBlockedPhase(phase: CodeWorkingTreeSyncPhase): boolean {
  return phase === 'modified' || phase === 'syncing' || phase === 'conflict' || phase === 'failed';
}
