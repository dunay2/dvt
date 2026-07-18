/** Owned concern: model serialized workspace working-tree synchronization states. */
import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';

export type CodeWorkingTreeSyncPhase =
  | 'synchronized'
  | 'modified'
  | 'syncing'
  | 'reconciling'
  | 'conflict'
  | 'failed'
  | 'reconciliation_failed';

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
  | { readonly type: 'reconciliation_succeeded' }
  | { readonly type: 'reconciliation_failed' }
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
      };
    case 'reconciliation_started':
      return state.phase === 'reconciliation_failed' && state.pendingReconciliation != null
        ? { ...state, phase: 'reconciling' }
        : state;
    case 'reconciliation_succeeded':
      return state.phase === 'reconciling' && state.pendingReconciliation != null
        ? {
            ...state,
            phase: state.value === state.persistedContent ? 'synchronized' : 'modified',
            pendingReconciliation: null,
          }
        : state;
    case 'reconciliation_failed':
      return state.phase === 'reconciling' && state.pendingReconciliation != null
        ? { ...state, phase: 'reconciliation_failed' }
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

function reduceEditedValue(
  state: CodeWorkingTreeSyncState,
  value: string
): CodeWorkingTreeSyncState {
  if (state.phase === 'conflict') {
    return { ...state, value };
  }
  if (state.phase === 'reconciling' || state.phase === 'reconciliation_failed') {
    return { ...state, value };
  }
  if (state.inFlight) {
    return { ...state, value, phase: 'syncing' };
  }
  return {
    ...state,
    value,
    phase: value === state.persistedContent ? 'synchronized' : 'modified',
  };
}
