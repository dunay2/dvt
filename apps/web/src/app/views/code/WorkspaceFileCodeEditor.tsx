/** Owned concern: edit one known workspace file through the canonical revision-aware Code rail. */
import { forwardRef, useCallback, useImperativeHandle } from 'react';

import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { useWorkspaceFileContentQuery } from '../../queries/workspaceQueries';
import { useWorkspaceFileContentCommandPort } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CodePreviewEmptyStateView, CodePreviewErrorStateView } from './CodeStateViews';
import { CodeWorkingTreeNavigationGuard } from './CodeWorkingTreeNavigationGuard';
import { CodeWorkingTreeStatus } from './CodeWorkingTreeStatus';
import type { CodeWorkingTreeReconciliationOutcome } from './codeWorkingTreeSyncModel';
import { resolveCodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';
import { CodeWorkspaceFileSurface } from './CodeWorkspaceFileSurface';
import { resolveCodeViewCopy } from './codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';
import { useCodeWorkingTreeSync } from './useCodeWorkingTreeSync';
import { reconcileWorkspaceFileAuthority } from './workspaceFileReconciliationAuthority';

export type WorkspaceFileCodeAuthority = 'graph-draft' | 'dbt-project-files' | 'missing' | 'mixed';

export type WorkspaceFileCodeEditorHandle = Readonly<{
  flush: () => Promise<boolean>;
}>;

export type WorkspaceFileCodeEditorProps = Readonly<{
  authority: WorkspaceFileCodeAuthority;
  className?: string;
  graphOwnedPaths?: ReadonlySet<string>;
  path: string | undefined;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
  onPersistenceRecovered?: () => void | Promise<void>;
}>;

export const WorkspaceFileCodeEditor = forwardRef<
  WorkspaceFileCodeEditorHandle,
  WorkspaceFileCodeEditorProps
>(function WorkspaceFileCodeEditor(
  {
    authority,
    className,
    graphOwnedPaths = EMPTY_GRAPH_OWNED_PATHS,
    path,
    reconcilePersistedFile,
    onPersistenceRecovered,
  },
  ref
) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCodeViewCopy(applicationLanguage);
  const commandPort = useWorkspaceFileContentCommandPort();
  const fileContentQuery = useWorkspaceFileContentQuery(path);
  const refetchFileContent = fileContentQuery.refetch;
  const posture = resolveCodeWorkspaceFileEditPosture({
    authority,
    selectedPath: path,
    graphOwnedPaths,
  });
  const reconcilePersistedFileAuthority = useCallback(
    async (receipt: WorkspaceFileSaveReceipt): Promise<CodeWorkingTreeReconciliationOutcome> => {
      if (reconcilePersistedFile == null) {
        throw new Error('Project reconciliation is unavailable.');
      }
      const projectOutcome = await reconcilePersistedFile(receipt);
      const authoritativeFileResult = await refetchFileContent();
      if (!authoritativeFileResult.isSuccess || authoritativeFileResult.data == null) {
        return { kind: 'verification-unavailable' };
      }
      return reconcileWorkspaceFileAuthority(receipt, authoritativeFileResult.data, projectOutcome);
    },
    [reconcilePersistedFile, refetchFileContent]
  );
  const workingTreeSync = useCodeWorkingTreeSync({
    file: fileContentQuery.data,
    commandPort,
    reconcilePersistedFile:
      reconcilePersistedFile == null ? undefined : reconcilePersistedFileAuthority,
  });

  useImperativeHandle(ref, () => ({ flush: workingTreeSync.flush }), [workingTreeSync.flush]);

  const retryWorkingTreeSync = useCallback(async (): Promise<void> => {
    await workingTreeSync.retry();
    await onPersistenceRecovered?.();
  }, [onPersistenceRecovered, workingTreeSync.retry]);

  const workingTreeStatusCopy = {
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
          : copy.workingTreeReadOnlyMessage,
    },
    retryLabel: copy.workingTreeRetryLabel,
    reloadLabel: copy.workingTreeReloadLabel,
  } as const;

  const errorPresentation = fileContentQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-preview',
        error: fileContentQuery.error,
        copy,
        selectedPath: path,
      })
    : null;

  const surface = fileContentQuery.isPending ? (
    <div className="flex min-h-48 items-center justify-center text-sm text-(--text-muted)">
      {copy.previewLoadingMessage}
    </div>
  ) : errorPresentation ? (
    <CodePreviewErrorStateView error={errorPresentation} />
  ) : !fileContentQuery.data ? (
    <CodePreviewEmptyStateView />
  ) : (
    <CodeWorkspaceFileSurface
      ariaLabel={`${copy.editorAriaLabelPrefix} ${fileContentQuery.data.name}`}
      file={fileContentQuery.data}
      loadingLabel={copy.editorLoadingMessage}
      onChange={workingTreeSync.updateValue}
      posture={posture}
      value={workingTreeSync.value}
    />
  );

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-(--border-subtle) ${className ?? ''}`}
      data-file-path={path}
      data-slot="workspace-file-code-editor"
    >
      <CodeWorkingTreeNavigationGuard
        blocked={workingTreeSync.navigationBlocked}
        flush={workingTreeSync.flush}
      />
      <div className="flex min-h-10 items-center gap-3 border-b border-(--border-subtle) px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs text-(--text-secondary)">{path}</code>
      </div>
      {posture.kind === 'graph_owned_read_only' ? null : (
        <CodeWorkingTreeStatus
          phase={posture.kind === 'editable' ? workingTreeSync.phase : 'read_only'}
          copy={workingTreeStatusCopy}
          onRetry={() => void retryWorkingTreeSync()}
          onReload={() => {
            void fileContentQuery.refetch().then((result) => {
              if (result.data) {
                workingTreeSync.loadAuthoritative(result.data);
              }
            });
          }}
        />
      )}
      <div className="min-h-80 flex-1 p-3">{surface}</div>
    </div>
  );
});

const EMPTY_GRAPH_OWNED_PATHS: ReadonlySet<string> = new Set();
