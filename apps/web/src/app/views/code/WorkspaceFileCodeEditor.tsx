/** Owned concern: inspect one scoped workspace file while preserving existing edit-session recovery. */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DbtProjectGraphProjection } from '@dvt/contracts';

import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { useWorkspaceFileContentQuery } from '../../queries/workspaceQueries';
import { useWorkspaceFileContentCommandPort } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { cn } from '../../components/ui/utils';
import { routeWorkbenchPanelHeaderClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { CodePreviewEmptyStateView, CodePreviewErrorStateView } from './CodeStateViews';
import { CodeWorkingTreeNavigationGuard } from './CodeWorkingTreeNavigationGuard';
import { CodeWorkingTreeStatus } from './CodeWorkingTreeStatus';
import type { CodeWorkingTreeReconciliationOutcome } from './codeWorkingTreeSyncModel';
import {
  resolveCodeWorkspaceFileEditPosture,
  type CodeWorkspaceFileAccess,
} from './codeWorkspaceFileEditPosture';
import { CodeWorkspaceFileSurface } from './CodeWorkspaceFileSurface';
import { resolveCodeViewCopy, resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';
import { useCodeWorkingTreeSync } from './useCodeWorkingTreeSync';
import { reconcileWorkspaceFileAuthority } from './workspaceFileReconciliationAuthority';
import { useCodeInlineReferences, type CodeInlineReferenceState } from './useCodeInlineReferences';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';
import { CodeReferenceDetails } from './CodeReferenceDetails';
import { useCodeWorkspaceFileContext } from './useCodeWorkspaceFileContext';

export type WorkspaceFileCodeAuthority = 'graph-draft' | 'dbt-project-files' | 'missing' | 'mixed';

export type WorkspaceFileCodeEditorHandle = Readonly<{
  flush: () => Promise<boolean>;
}>;

export type WorkspaceFileCodeEditorProps = Readonly<{
  access?: CodeWorkspaceFileAccess;
  authority: WorkspaceFileCodeAuthority;
  className?: string;
  graphOwnedPaths?: ReadonlySet<string>;
  path: string | undefined;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
  onPersistenceRecovered?: () => void | Promise<void>;
  fillAvailableSpace?: boolean;
  headerActions?: ReactNode;
  dbtProject?: DbtProjectGraphProjection;
  onInspectReference?: (reference: CodeInlineReferenceDetail | undefined) => void;
}>;

export const WorkspaceFileCodeEditor = forwardRef<
  WorkspaceFileCodeEditorHandle,
  WorkspaceFileCodeEditorProps
>(function WorkspaceFileCodeEditor(
  {
    access = 'read-only',
    authority,
    className,
    graphOwnedPaths = EMPTY_GRAPH_OWNED_PATHS,
    path,
    reconcilePersistedFile,
    onPersistenceRecovered,
    fillAvailableSpace = false,
    headerActions,
    dbtProject,
    onInspectReference,
  },
  ref
) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCodeViewCopy(applicationLanguage);
  const inlineCopy = resolveCodeInlineReferenceCopy(applicationLanguage);
  const [localReference, setLocalReference] = useState<CodeInlineReferenceDetail>();
  const referenceOpener = useRef<HTMLElement | null>(null);
  const reloadRequestId = useRef(0);
  useEffect(() => {
    reloadRequestId.current += 1;
    return () => {
      reloadRequestId.current += 1;
    };
  }, [path]);
  const commandPort = useWorkspaceFileContentCommandPort();
  const fileContentQuery = useWorkspaceFileContentQuery(path);
  const refetchFileContent = fileContentQuery.refetch;
  const posture = resolveCodeWorkspaceFileEditPosture({
    access,
    authority,
    selectedPath: path,
    graphOwnedPaths,
  });
  const acceptedInlineFile =
    fileContentQuery.isSuccess &&
    !fileContentQuery.isFetching &&
    fileContentQuery.data.path === path
      ? fileContentQuery.data
      : undefined;
  const context = useCodeWorkspaceFileContext({
    file: acceptedInlineFile,
    project: dbtProject,
    allowed: authority !== 'mixed' && (path === undefined || !graphOwnedPaths.has(path)),
  });
  const reconcileProject = reconcilePersistedFile ?? context.reconcilePersistedFile;
  const reconcilePersistedFileAuthority = useCallback(
    async (receipt: WorkspaceFileSaveReceipt): Promise<CodeWorkingTreeReconciliationOutcome> => {
      if (reconcileProject == null) {
        throw new Error('Project reconciliation is unavailable.');
      }
      const projectOutcome = await reconcileProject(receipt);
      const authoritativeFileResult = await refetchFileContent();
      if (!authoritativeFileResult.isSuccess || authoritativeFileResult.data == null) {
        return { kind: 'verification-unavailable' };
      }
      return reconcileWorkspaceFileAuthority(receipt, authoritativeFileResult.data, projectOutcome);
    },
    [reconcileProject, refetchFileContent]
  );
  const workingTreeSync = useCodeWorkingTreeSync({
    file: fileContentQuery.data,
    commandPort,
    reconcilePersistedFile: reconcileProject == null ? undefined : reconcilePersistedFileAuthority,
  });
  const references = useCodeInlineReferences({
    project: context.project,
    file: acceptedInlineFile,
    value: workingTreeSync.value,
    enabled: workingTreeSync.phase === 'synchronized',
  });
  const inlineState: CodeInlineReferenceState =
    context.status === 'checking' || context.status === 'unavailable'
      ? { kind: context.status }
      : references;
  const inlineReferences = useMemo(
    () =>
      inlineState.kind === 'ready' ? { ...inlineState.references, copy: inlineCopy } : undefined,
    [inlineState, inlineCopy]
  );
  const clearReference = useCallback(() => {
    setLocalReference(undefined);
    onInspectReference?.(undefined);
  }, [onInspectReference]);
  useEffect(clearReference, [clearReference, inlineState]);
  const inspectReference = useCallback(
    (id: string) => {
      if (inlineState.kind !== 'ready') return;
      const reference = inlineState.details.find((item) => item.id === id);
      if (reference == null) return;
      referenceOpener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (onInspectReference != null) onInspectReference(reference);
      else setLocalReference(reference);
    },
    [inlineState, onInspectReference]
  );
  const changeValue = useCallback(
    (nextValue: string) => {
      if (posture.kind !== 'editable') return;
      clearReference();
      workingTreeSync.updateValue(nextValue);
    },
    [clearReference, posture.kind, workingTreeSync.updateValue]
  );
  const inlineMessage =
    inlineState.kind === 'checking'
      ? inlineCopy.checkingMessage
      : inlineState.kind === 'unavailable'
        ? inlineCopy.unavailableMessage
        : inlineState.kind === 'text-only'
          ? inlineState.reason === 'dirty-buffer'
            ? inlineCopy.dirtyMessage
            : inlineState.reason === 'no-supported-references'
              ? inlineCopy.unsupportedMessage
              : inlineCopy.unavailableMessage
          : undefined;

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

  const retainsPendingBuffer =
    fileContentQuery.data?.path === path && workingTreeSync.navigationBlocked;

  const surface = fileContentQuery.isPending ? (
    <div className="flex min-h-48 items-center justify-center text-sm text-(--text-muted)">
      {copy.previewLoadingMessage}
    </div>
  ) : errorPresentation && !retainsPendingBuffer ? (
    <CodePreviewErrorStateView error={errorPresentation} />
  ) : !fileContentQuery.data ? (
    <CodePreviewEmptyStateView />
  ) : (
    <CodeWorkspaceFileSurface
      ariaLabel={`${posture.kind === 'editable' ? copy.editorAriaLabelPrefix : copy.viewerAriaLabelPrefix} ${fileContentQuery.data.name}`}
      fillAvailableSpace={fillAvailableSpace}
      file={fileContentQuery.data}
      loadingLabel={copy.editorLoadingMessage}
      onChange={changeValue}
      posture={posture}
      value={workingTreeSync.value}
      inlineReferences={inlineReferences}
      onInspectReference={inspectReference}
    />
  );

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-(--border-subtle) ${className ?? ''}`}
      data-file-path={path}
      data-slot="workspace-file-code-editor"
    >
      <CodeWorkingTreeNavigationGuard
        blocked={workingTreeSync.navigationBlocked}
        flush={workingTreeSync.flush}
      />
      <div className={routeWorkbenchPanelHeaderClassName}>
        <code className="min-w-0 flex-1 truncate text-(--text-secondary)">{path}</code>
        {headerActions}
      </div>
      {inlineMessage == null ? null : (
        <p role="status" className="px-3 py-1 text-xs text-(--text-muted)">
          {inlineMessage}
        </p>
      )}
      {posture.kind === 'graph_owned_read_only' ? null : (
        <CodeWorkingTreeStatus
          phase={
            posture.kind === 'editable' || workingTreeSync.phase !== 'synchronized'
              ? workingTreeSync.phase
              : 'read_only'
          }
          copy={workingTreeStatusCopy}
          onRetry={() => void retryWorkingTreeSync()}
          onReload={() => {
            const requestId = ++reloadRequestId.current;
            void fileContentQuery.refetch().then((result) => {
              if (
                requestId === reloadRequestId.current &&
                result.isSuccess &&
                result.data?.path === path
              ) {
                workingTreeSync.loadAuthoritative(result.data);
              }
            });
          }}
        />
      )}
      {errorPresentation && retainsPendingBuffer ? (
        <CodePreviewErrorStateView error={errorPresentation} />
      ) : null}
      <div className={cn('flex-1 p-1', fillAvailableSpace ? 'flex min-h-0 flex-col' : 'min-h-80')}>
        {surface}
      </div>
      {onInspectReference != null || localReference == null ? null : (
        <CodeReferenceDetails
          overlay
          reference={localReference}
          copy={inlineCopy}
          onClose={() => {
            clearReference();
            if (referenceOpener.current?.isConnected) referenceOpener.current.focus();
          }}
        />
      )}
    </div>
  );
});

const EMPTY_GRAPH_OWNED_PATHS: ReadonlySet<string> = new Set();
