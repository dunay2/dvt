/**
 * Owned concern: project editor synchronization and reference states into presentation copy.
 * @decision Keep exhaustive state labels independent of React and file I/O.
 * @consequence Refactoring the view cannot turn analysis or saved bytes into execution readiness.
 */
import type { CodeViewCopy, CodeInlineReferenceCopy } from './codeViewCopy';
import type { CodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';
import type { CodeInlineReferenceState } from './useCodeInlineReferences';

export function resolveCodeEditorStatusCopy(
  copy: CodeViewCopy,
  posture: CodeWorkspaceFileEditPosture,
  inlineMessage: string | undefined
) {
  return {
    synchronized: {
      label: copy.workingTreeSynchronizedLabel,
      message: copy.workingTreeSynchronizedMessage,
    },
    modified: {
      label: copy.workingTreeModifiedLabel,
      message: copy.workingTreeModifiedMessage,
    },
    syncing: {
      label: copy.workingTreeSyncingLabel,
      message: copy.workingTreeSyncingMessage,
    },
    reconciling: {
      label: copy.workingTreeReconcilingLabel,
      message: copy.workingTreeReconcilingMessage,
    },
    conflict: {
      label: copy.workingTreeConflictLabel,
      message: copy.workingTreeConflictMessage,
    },
    failed: {
      label: copy.workingTreeFailedLabel,
      message: copy.workingTreeFailedMessage,
    },
    reconciliation_failed: {
      label: copy.workingTreeReconciliationFailedLabel,
      message: copy.workingTreeReconciliationFailedMessage,
    },
    persisted_stale: {
      label: copy.workingTreePersistedStaleLabel,
      message: copy.workingTreePersistedStaleMessage,
    },
    persisted_invalid: {
      label: copy.workingTreePersistedInvalidLabel,
      message: copy.workingTreePersistedInvalidMessage,
    },
    persisted_unavailable: {
      label: copy.workingTreePersistedUnavailableLabel,
      message: copy.workingTreePersistedUnavailableMessage,
    },
    persisted_verification_unavailable: {
      label: copy.workingTreePersistedVerificationUnavailableLabel,
      message: copy.workingTreePersistedVerificationUnavailableMessage,
    },
    persisted_superseded: {
      label: copy.workingTreePersistedSupersededLabel,
      message: copy.workingTreePersistedSupersededMessage,
    },
    read_only: {
      label:
        posture.kind === 'graph_owned_read_only'
          ? copy.workingTreeGraphOwnedReadOnlyLabel
          : copy.workingTreeReadOnlyLabel,
      message:
        posture.kind === 'graph_owned_read_only'
          ? copy.workingTreeGraphOwnedReadOnlyMessage
          : (inlineMessage ?? copy.workingTreeReadOnlyMessage),
    },
    retryLabel: copy.workingTreeRetryLabel,
    reloadLabel: copy.workingTreeReloadLabel,
  } as const;
}

export function resolveCodeInlineStatusMessage(
  inlineState: CodeInlineReferenceState,
  inlineCopy: CodeInlineReferenceCopy,
  contextChecking: boolean,
  reanalyzing: boolean
): string | undefined {
  return inlineState.kind === 'text-only'
    ? inlineState.reason === 'dirty-buffer'
      ? inlineCopy.dirtyMessage
      : inlineState.reason === 'no-supported-references'
        ? inlineCopy.unsupportedMessage
        : inlineCopy.unavailableMessage
    : {
        inactive: undefined,
        pending: inlineCopy.pendingAnalysisMessage,
        checking: contextChecking
          ? inlineCopy.contextCheckingMessage
          : reanalyzing
            ? inlineCopy.reanalyzingMessage
            : inlineCopy.analyzingMessage,
        ready: inlineCopy.analyzedMessage,
        unavailable: inlineCopy.unavailableMessage,
      }[inlineState.kind];
}
