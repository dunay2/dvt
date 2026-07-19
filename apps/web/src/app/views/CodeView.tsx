/** Owned concern: render workspace file queries as the Code workbench local Monaco buffer. */
import { FileCode2 } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import { MonacoCodeEditor } from '../components/monaco/MonacoCodeEditor';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { useWorkspaceFileContentCommandPort } from '../services/AppServicesContext';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileHistoryQuery,
  useWorkspaceGraphForViewQuery,
  useWorkspaceFileTreeQuery,
} from '../queries/workspaceQueries';
import { CANVAS_ROUTE_ID } from './canvas/canvasDraftPresentationStore';
import { deriveCodeRouteBootstrapPresentation } from './code/codeRouteBootstrap';
import {
  CodePreviewEmptyStateView,
  CodePreviewErrorStateView,
  CodeRouteEmptyStateView,
  CodeRouteErrorStateView,
  CodeRouteLoadingStateView,
} from './code/CodeStateViews';
import { resolveCodeViewCopy } from './code/codeViewCopy';
import { CodeFileHistoryPanel } from './code/CodeFileHistoryPanel';
import { CodeWorkingTreeStatus } from './code/CodeWorkingTreeStatus';
import { CodeWorkingTreeNavigationGuard } from './code/CodeWorkingTreeNavigationGuard';
import {
  hasCodeWorkspaceFilePath,
  hasCodeWorkspaceFiles,
  resolveGraphScopedCodeWorkspaceFileTree,
  resolveInitialCodeFilePath,
  resolveInitialDbtProjectFilePath,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from './code/codeViewFileSelection';
import { resolveCodeWorkbenchErrorPresentation } from './code/codeWorkbenchErrorModel';
import FileTreePanel from './code/FileTreePanel';
import { useCodeWorkingTreeSync } from './code/useCodeWorkingTreeSync';
import type { WorkspaceFileSaveReceipt } from '../ports/workspace';
import { type CodeWorkingTreeReconciliationOutcome } from './code/codeWorkingTreeSyncModel';
import { reconcileWorkspaceFileAuthority } from './code/workspaceFileReconciliationAuthority';

const CODE_GRAPH_FILE_SCOPE_VIEW_ID = 'canvas-code-file-scope';

export type CodeViewFileScope = Readonly<{
  kind: 'dbt-project-files';
  projectRoot: string;
  initialPath?: string;
}>;

export type CodeViewHandle = Readonly<{
  flush: () => Promise<boolean>;
}>;

export type CodeViewProps = Readonly<{
  publishRouteBootstrap?: boolean;
  routeBootstrapId?: string;
  fileScope?: CodeViewFileScope;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

const CodeView = forwardRef<CodeViewHandle, CodeViewProps>(function CodeView(
  {
    publishRouteBootstrap = true,
    routeBootstrapId = CANVAS_ROUTE_ID,
    fileScope,
    reconcilePersistedFile,
  }: CodeViewProps = {},
  ref
) {
  const copy = resolveCodeViewCopy();
  const workspaceFileContentCommand = useWorkspaceFileContentCommandPort();
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const graphSnapshotQuery = useWorkspaceGraphForViewQuery(
    CODE_GRAPH_FILE_SCOPE_VIEW_ID,
    undefined,
    { enabled: fileScope === undefined }
  );
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    () => fileScope?.initialPath
  );
  const fileSelectionRequestIdRef = useRef(0);
  const workspaceFileTree = fileTreeQuery.data ?? [];
  const scopedWorkspaceFileTree = useMemo(
    () =>
      fileScope
        ? resolveProjectRootScopedCodeWorkspaceFileTree(workspaceFileTree, fileScope.projectRoot)
        : resolveGraphScopedCodeWorkspaceFileTree({
            entries: workspaceFileTree,
            graph: graphSnapshotQuery.data,
          }),
    [fileScope, graphSnapshotQuery.data, workspaceFileTree]
  );
  const resolvedPath = useMemo(
    () =>
      hasCodeWorkspaceFilePath(scopedWorkspaceFileTree, selectedPath)
        ? selectedPath
        : fileScope
          ? resolveInitialDbtProjectFilePath(scopedWorkspaceFileTree, {
              projectRoot: fileScope.projectRoot,
              preferredPath: fileScope.initialPath,
            })
          : resolveInitialCodeFilePath(scopedWorkspaceFileTree),
    [fileScope, scopedWorkspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const refetchFileContent = fileContentQuery.refetch;
  const fileHistoryQuery = useWorkspaceFileHistoryQuery(resolvedPath);
  const fileTreeErrorPresentation = fileTreeQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-tree',
        error: fileTreeQuery.error,
        copy,
      })
    : null;
  const filePreviewErrorPresentation = fileContentQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-preview',
        error: fileContentQuery.error,
        copy,
        selectedPath: resolvedPath,
      })
    : null;
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
    commandPort: workspaceFileContentCommand,
    reconcilePersistedFile:
      reconcilePersistedFile == null ? undefined : reconcilePersistedFileAuthority,
  });
  const requestFileSelection = useCallback(
    async (nextPath: string): Promise<void> => {
      if (nextPath === selectedPath || nextPath === resolvedPath) {
        return;
      }
      const requestId = ++fileSelectionRequestIdRef.current;
      const persisted = await workingTreeSync.flush();
      if (persisted && requestId === fileSelectionRequestIdRef.current) {
        setSelectedPath(nextPath);
      }
    },
    [resolvedPath, selectedPath, workingTreeSync.flush]
  );
  const latestRequestFileSelectionRef = useRef(requestFileSelection);
  useEffect(() => {
    latestRequestFileSelectionRef.current = requestFileSelection;
  }, [requestFileSelection]);
  useEffect(() => {
    if (fileScope?.initialPath != null) {
      void latestRequestFileSelectionRef.current(fileScope.initialPath);
    }
  }, [fileScope?.initialPath]);
  useImperativeHandle(ref, () => ({ flush: workingTreeSync.flush }), [workingTreeSync.flush]);
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
      label: copy.workingTreeReadOnlyLabel,
      message: copy.workingTreeReadOnlyMessage,
    },
    retryLabel: copy.workingTreeRetryLabel,
    reloadLabel: copy.workingTreeReloadLabel,
  } as const;

  usePublishedRouteBootstrap(
    routeBootstrapId,
    deriveCodeRouteBootstrapPresentation(
      {
        isLoadingFileTree:
          fileTreeQuery.isPending ||
          (fileScope === undefined && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending),
        fileTreeErrorMessage: fileTreeErrorPresentation?.message ?? null,
        hasWorkspaceFiles: hasCodeWorkspaceFiles(scopedWorkspaceFileTree),
        isLoadingFilePreview: resolvedPath !== undefined && fileContentQuery.isPending,
        filePreviewErrorMessage: filePreviewErrorPresentation?.message ?? null,
      },
      copy
    ),
    { enabled: publishRouteBootstrap }
  );

  if (
    fileTreeQuery.isPending ||
    (fileScope === undefined && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending)
  ) {
    return <CodeRouteLoadingStateView />;
  }

  if (fileTreeQuery.isError) {
    return <CodeRouteErrorStateView error={fileTreeErrorPresentation!} />;
  }

  if (!hasCodeWorkspaceFiles(scopedWorkspaceFileTree)) {
    return <CodeRouteEmptyStateView />;
  }

  const previewPane = fileContentQuery.isPending ? (
    <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
      {copy.previewLoadingMessage}
    </div>
  ) : fileContentQuery.isError ? (
    <CodePreviewErrorStateView error={filePreviewErrorPresentation!} />
  ) : !fileContentQuery.data ? (
    <CodePreviewEmptyStateView />
  ) : (
    <MonacoCodeEditor
      ariaLabel={`${copy.editorAriaLabelPrefix} ${fileContentQuery.data.name}`}
      language={fileContentQuery.data.language}
      loadingLabel={copy.editorLoadingMessage}
      onChange={workingTreeSync.updateValue}
      path={fileContentQuery.data.path}
      value={workingTreeSync.value}
    />
  );

  return (
    <>
      <CodeWorkingTreeNavigationGuard
        blocked={workingTreeSync.navigationBlocked}
        flush={workingTreeSync.flush}
      />
      <RouteWorkbenchFrame
        scroll={false}
        bodyClassName="flex min-h-0 flex-1"
        presentationMode={publishRouteBootstrap ? 'route' : 'embedded'}
        header={
          publishRouteBootstrap ? (
            <div className={routeWorkbenchHeaderBandClassName}>
              <ViewHeader
                className="border-0 bg-transparent px-0 py-0"
                title={copy.title}
                icon={<FileCode2 className="size-6 text-(--status-info)" />}
                subtitle={copy.subtitle}
              />
            </div>
          ) : undefined
        }
        slots={{
          leftPanel: (
            <FileTreePanel
              title={copy.explorerTitle}
              tree={scopedWorkspaceFileTree}
              selectedPath={resolvedPath}
              onSelect={(entry) => {
                if (entry.kind === 'file' && entry.path !== resolvedPath) {
                  void requestFileSelection(entry.path);
                }
              }}
            />
          ),
          rightPanel: publishRouteBootstrap ? (
            <CodeFileHistoryPanel
              copy={copy}
              selectedPath={resolvedPath}
              entries={fileHistoryQuery.data ?? []}
              isLoading={fileHistoryQuery.isPending}
              error={fileHistoryQuery.error instanceof Error ? fileHistoryQuery.error : null}
            />
          ) : undefined,
          primarySurface: (
            <div className="min-w-0 flex h-full flex-1 flex-col">
              <CodeWorkingTreeStatus
                phase={workingTreeSync.phase}
                copy={workingTreeStatusCopy}
                onRetry={() => void workingTreeSync.retry()}
                onReload={() => {
                  void fileContentQuery.refetch().then((result) => {
                    if (result.data) {
                      workingTreeSync.loadAuthoritative(result.data);
                    }
                  });
                }}
              />
              <div className="min-h-0 flex-1 p-4">{previewPane}</div>
            </div>
          ),
        }}
      />
    </>
  );
});

export default CodeView;
