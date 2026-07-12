/** Owned concern: render workspace file queries as the Code workbench local Monaco buffer. */
import { FileCode2 } from 'lucide-react';
import { useMemo, useState } from 'react';

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
import {
  hasCodeWorkspaceFilePath,
  hasCodeWorkspaceFiles,
  resolveGraphScopedCodeWorkspaceFileTree,
  resolveInitialCodeFilePath,
} from './code/codeViewFileSelection';
import { resolveCodeWorkbenchErrorPresentation } from './code/codeWorkbenchErrorModel';
import FileTreePanel from './code/FileTreePanel';
import { useCodeWorkingTreeSync } from './code/useCodeWorkingTreeSync';

const CODE_GRAPH_FILE_SCOPE_VIEW_ID = 'canvas-code-file-scope';

export default function CodeView({
  publishRouteBootstrap = true,
  routeBootstrapId = CANVAS_ROUTE_ID,
}: Readonly<{ publishRouteBootstrap?: boolean; routeBootstrapId?: string }> = {}) {
  const copy = resolveCodeViewCopy();
  const workspaceFileContentCommand = useWorkspaceFileContentCommandPort();
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const graphSnapshotQuery = useWorkspaceGraphForViewQuery(CODE_GRAPH_FILE_SCOPE_VIEW_ID);
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const workspaceFileTree = fileTreeQuery.data ?? [];
  const graphScopedWorkspaceFileTree = useMemo(
    () =>
      resolveGraphScopedCodeWorkspaceFileTree({
        entries: workspaceFileTree,
        graph: graphSnapshotQuery.data,
      }),
    [graphSnapshotQuery.data, workspaceFileTree]
  );
  const resolvedPath = useMemo(
    () =>
      hasCodeWorkspaceFilePath(graphScopedWorkspaceFileTree, selectedPath)
        ? selectedPath
        : resolveInitialCodeFilePath(graphScopedWorkspaceFileTree),
    [graphScopedWorkspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
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
  const workingTreeSync = useCodeWorkingTreeSync({
    file: fileContentQuery.data,
    commandPort: workspaceFileContentCommand,
  });
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
    conflict: {
      label: copy.workingTreeConflictLabel,
      message: copy.workingTreeConflictMessage,
    },
    failed: {
      label: copy.workingTreeFailedLabel,
      message: copy.workingTreeFailedMessage,
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
          fileTreeQuery.isPending || (fileTreeQuery.isSuccess && graphSnapshotQuery.isPending),
        fileTreeErrorMessage: fileTreeErrorPresentation?.message ?? null,
        hasWorkspaceFiles: hasCodeWorkspaceFiles(graphScopedWorkspaceFileTree),
        isLoadingFilePreview: resolvedPath !== undefined && fileContentQuery.isPending,
        filePreviewErrorMessage: filePreviewErrorPresentation?.message ?? null,
      },
      copy
    ),
    { enabled: publishRouteBootstrap }
  );

  if (fileTreeQuery.isPending || (fileTreeQuery.isSuccess && graphSnapshotQuery.isPending)) {
    return <CodeRouteLoadingStateView />;
  }

  if (fileTreeQuery.isError) {
    return <CodeRouteErrorStateView error={fileTreeErrorPresentation!} />;
  }

  if (!hasCodeWorkspaceFiles(graphScopedWorkspaceFileTree)) {
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
    <RouteWorkbenchFrame
      scroll={false}
      bodyClassName="flex min-h-0 flex-1"
      header={
        <div className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={copy.title}
            icon={<FileCode2 className="size-6 text-(--status-info)" />}
            subtitle={copy.subtitle}
          />
        </div>
      }
      slots={{
        leftPanel: (
          <FileTreePanel
            title={copy.explorerTitle}
            tree={graphScopedWorkspaceFileTree}
            selectedPath={resolvedPath}
            onSelect={(entry) => {
              if (entry.kind === 'file' && entry.path !== resolvedPath) {
                void workingTreeSync.flush().then((flushed) => {
                  if (flushed) {
                    setSelectedPath(entry.path);
                  }
                });
              }
            }}
          />
        ),
        rightPanel: (
          <CodeFileHistoryPanel
            copy={copy}
            selectedPath={resolvedPath}
            entries={fileHistoryQuery.data ?? []}
            isLoading={fileHistoryQuery.isPending}
            error={fileHistoryQuery.error instanceof Error ? fileHistoryQuery.error : null}
          />
        ),
        primarySurface: (
          <div className="min-w-0 flex h-full flex-1 flex-col">
            <CodeWorkingTreeStatus
              phase={workingTreeSync.phase}
              copy={workingTreeStatusCopy}
              onRetry={workingTreeSync.retry}
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
  );
}
